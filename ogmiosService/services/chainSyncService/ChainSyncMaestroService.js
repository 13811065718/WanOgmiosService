const ChainSyncServiceInterface = require('../../interfaces/ChainSyncServiceInterface');
const ServiceFramework = require("../../framework/ServiceFramework");
const { sleep } = require("../utilService/commonUtils");
const BftBlockHandler = require("./BftBlockHandler");
const PraosBlockHandler = require("./PraosBlockHandler");
const TreasuryUtxoManager = require("./TreasuryUtxoManager");

const {
  createInteractionContext,
  createChainSynchronizationClient,
  isBlockEBB,
  isBlockBFT,
  isBlockPraos
} = require('@cardano-ogmios/client');

const mapDbNameInst = new Map();
const mapBlockHandler = new Map();
let bInitialSynced = true;

class ChainSyncMaestroService extends ChainSyncServiceInterface {
  constructor() {
    super();

    this.chainType = "ADA";
    this.mapUtxoManager = new Map();
    console.log("\n\n\n... instance ChainSyncMaestroService...");
  }

  async init() {
    // step 1: to get related service component
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageService = ServiceFramework.getService("StorageServiceInterface", "StorageService");
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.iWanService = ServiceFramework.getService("AgentServiceInterface","IWanService");

    this.iWanClientObj = this.iWanService.getIWanClientInstance();

    // step 2: to get related config parameters
    // step: 2-1: to get related db instance
    let blockInfoSchema = await this.configService.getGlobalConfig("blockInfoSchema");
    this.blockInfoDbInst = await this.storageService.initDB(blockInfoSchema);
    mapDbNameInst.set(blockInfoSchema.name, this.blockInfoDbInst);

    let syncedDataSchema = await this.configService.getGlobalConfig("chainSyncSchema");
    this.syncedDbInst = await this.storageService.initDB(syncedDataSchema);
    mapDbNameInst.set(syncedDataSchema.name, this.syncedDbInst);

    let txInfoSchema = await this.configService.getGlobalConfig("txInfoSchema");
    this.txInfoDbInst = await this.storageService.initDB(txInfoSchema);
    mapDbNameInst.set(txInfoSchema.name, this.txInfoDbInst);

    let mintInfoSchema = await this.configService.getGlobalConfig("mintInfoSchema");
    this.mintInfoDbInst = await this.storageService.initDB(mintInfoSchema);
    mapDbNameInst.set(mintInfoSchema.name, this.mintInfoDbInst);

    let treasuryUtxoInfoSchema = await this.configService.getGlobalConfig("treasuryUtxoInfoSchema");
    this.treasuryUtxoDbInst = await this.storageService.initDB(treasuryUtxoInfoSchema);
    mapDbNameInst.set(treasuryUtxoInfoSchema.name, this.treasuryUtxoDbInst);

    let balancedCfgInfoSchema = await this.configService.getGlobalConfig("balancedCfgInfoSchema");
    this.balancedCfgInfoDbInst = await this.storageService.initDB(balancedCfgInfoSchema);
    mapDbNameInst.set(balancedCfgInfoSchema.name, this.balancedCfgInfoDbInst);

    let policyIdSchema = await this.configService.getGlobalConfig("checkTokenPolicyIdSchema");
    this.policyIdConfigDbInst = await this.storageService.getDBIns(policyIdSchema.name);
    mapDbNameInst.set(policyIdSchema.name, this.policyIdConfigDbInst);

    this.securityConfirmEnable = await this.configService.getGlobalConfig("securityConfirmEnable");
    console.log("\n\n...ChainSyncMaestroService init...securityConfirmEnable : ", this.securityConfirmEnable);

    // to initial treasury utxo manager instance TreasuryCfg
    this.ogmiosServerConfig = await this.configService.getGlobalConfig("ogmiosServerCfg");
    let treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");
    let nftTreasuryScCfg = await this.configService.getGlobalConfig("nftTreasuryScCfg");
    let checkTokenPolicyIdCfg = await this.configService.getGlobalConfig("checkTokenPolicyIdCfg");
    console.log("\n\n...ChainSyncMaestroService init...step 2-1 : ");

    // to instance a utxo manager for treasury contract
    this.treasuryUtxoMgrObj = new TreasuryUtxoManager(treasuryScCfg, mapDbNameInst, this.ogmiosServerConfig, checkTokenPolicyIdCfg);
    let initRet = await this.treasuryUtxoMgrObj.init();
    if (!initRet) {
      throw "treasuryUtxoManager init failed!"
    }
    this.mapUtxoManager.set("NonNFT", this.nftTreasuryUtxoMgrObj);
    //  instance a utxo mananger for nftTreasury contract
    this.nftTreasuryUtxoMgrObj = new TreasuryUtxoManager(nftTreasuryScCfg, mapDbNameInst, this.ogmiosServerConfig);
    initRet = await this.nftTreasuryUtxoMgrObj.init();
    if (!initRet) {
      throw "nftTreasuryUtxoManager init failed!"
    }
    this.mapUtxoManager.set("NFT", this.nftTreasuryUtxoMgrObj);

    // register block hander
    this.bftBlockHandler = new BftBlockHandler(this.mapUtxoManager, this.securityConfirmEnable, this.iWanClientObj);
    mapBlockHandler.set("BftBlockType", this.bftBlockHandler);
    this.praosBlockHandler = new PraosBlockHandler(this.mapUtxoManager, this.securityConfirmEnable, this.iWanClientObj);
    mapBlockHandler.set("PraosBlockType", this.praosBlockHandler);

    // initial ogmios client
    await this.connectOgmiosNode();

    // step: 2-2: to get synced block number
    this.chainSyncServiceCfg = await this.configService.getGlobalConfig("chainSyncCfg");
    let syncedRecord = await this.syncedDbInst.findByOption({ "chainType": this.chainType }, {}, 0);

    if (0 == syncedRecord.length) {

      let initialBlockTs = new Date(this.chainSyncServiceCfg.initialBlockTime).getTime() / 1000;
      console.log("initialBlockTs: ", initialBlockTs, this.chainSyncServiceCfg.initialBlockTime);
      this.chainSyncedInfo = {
        "syncedBlockNumber": this.chainSyncServiceCfg.initialBlockNumber,
        "syncedBlockTime": initialBlockTs,
        "syncedSlot": this.chainSyncServiceCfg.initialSlot,
        "syncedHash": this.chainSyncServiceCfg.initialHash
      }
      // console.log("\n\n this.chainSyncedInfo: " + this.chainSyncedInfo);
      let syncedData = {
        "chainType": "ADA",
        "blockHeight": this.chainSyncedInfo.syncedBlockNumber,
        "time": this.chainSyncedInfo.syncedBlockTime,
        "slot": this.chainSyncedInfo.syncedSlot,
        "hash": this.chainSyncedInfo.syncedHash
      }
      console.log("syncedData: ", syncedData);
      try {
        await this.syncedDbInst.insert(syncedData);

      } catch (error) {
        console.log("\n\n insert syncedData failed: ", error);
        throw "insert syncedData failed!"
      }

      let initialSyncTip = {
        "slot": this.chainSyncedInfo.syncedSlot,
        "id": this.chainSyncedInfo.syncedHash
      }
      this.points = new Array();
      this.points.push(initialSyncTip);

      //// to insert initial balanced config
      this.balancedCfg = await this.configService.getGlobalConfig("balancedCfg");
      let balancedCfgData = {
        "chainType": "ADA",
        "utxoNumThresheld": this.balancedCfg.utxoNumThresheld,
        "assetAmountThresheld": this.balancedCfg.assetAmountThresheld
      }
      console.log("balancedCfgData: ", balancedCfgData);
      try {
        await this.balancedCfgInfoDbInst.insert(balancedCfgData);

      } catch (error) {
        console.log("\n\n insert initial balancedCfgData failed: ", error);
        throw "insert initial balancedCfgData failed!"
      }

    } else {
      this.chainSyncedInfo = {
        "syncedBlockNumber": syncedRecord[0].blockHeight,
        "syncedBlockTime": syncedRecord[0].time,
        "syncedSlot": syncedRecord[0].slot,
        "syncedHash": syncedRecord[0].hash
      }

      let initialSyncTip = {
        "slot": this.chainSyncedInfo.syncedSlot,
        "id": this.chainSyncedInfo.syncedHash
      }
      console.log("\n\n...ChainSyncMaestroService startUp: ", initialSyncTip);
      this.points = new Array();


      let filter = {
        "blockHeight": { '$gt': this.chainSyncedInfo.syncedBlockNumber - 30, "$lt": this.chainSyncedInfo.syncedBlockNumber }
      }
      console.log("\n\n...ChainSyncMaestroService startUp block filter: ", filter);
      let ret = await this.blockInfoDbInst.findAllByOption(filter);

      this.points.push(initialSyncTip);
      for (let i = ret.length - 1; i >= 0; i--) {
        let tmpSyncTip = {
          "slot": ret[i].slot,
          "id": ret[i].hash
        }
        this.points.push(tmpSyncTip);
      }
      console.log("\n\n...ChainSyncMaestroService startUp points: ", this.points);
    }

  }

  fetchInitSyncedInfo() {

    return this.chainSyncedInfo;
  }


  async reconnectOgmiosNode() {
    setTimeout(async () => {
      try {
        this.logUtilSrv.logInfo("ChainSyncMaestroService", "...try to reconnectOgmiosNode...");
        await this.connectOgmiosNode();
        
        console.log("ChainSyncMaestroService...reconnectOgmiosNode...syncedPoints...", this.points);
        this.syncClient.resume(this.points, 1);

      } catch (error) {
        this.logUtilSrv.logInfo("ChainSyncMaestroService", "...reconnectOgmiosNode...error...", error);
        this.reconnectOgmiosNode();
      }
    }, 10000);
  }

  async connectOgmiosNode() {
    let connectionOption = (undefined === this.ogmiosServerConfig.apiKey) ? {
      host: this.ogmiosServerConfig.host,
      port: this.ogmiosServerConfig.port,
    } : {
      host: this.ogmiosServerConfig.host,
      port: this.ogmiosServerConfig.port,
      tls: true,
      apiKey: this.ogmiosServerConfig.apiKey
    }

    console.log("\n\n***chain Sync service create ws connection");
    this.context = await createInteractionContext(this.errorHandler.bind(this),
      this.closeHandler.bind(this),
      {
        "connection": connectionOption,
        "interactionType": 'LongRunning'
      });

    console.log("\n\n***chain Sync service create sync client");
    this.syncClient = await createChainSynchronizationClient(this.context,
      {
        rollForward: this.rollForward.bind(this),
        rollBackward: this.rollBackward.bind(this)
      });
  }

  async errorHandler(error) {
    console.error(error);
    this.logUtilSrv.logInfo("ChainSyncMaestroService", "...errorHandler...error...", error);
    // await client.shutdown();
  }

  async closeHandler(code, reason) {
    // console.log('WS close: code =', code, 'reason =', reason);
    this.logUtilSrv.logInfo("ChainSyncMaestroService", "...closeHandler...code...", code);
    this.logUtilSrv.logInfo("ChainSyncMaestroService", "...closeHandler...reason...", reason);

    // await client.shutdown();
    await this.reconnectOgmiosNode();
    this.logUtilSrv.logInfo("ChainSyncMaestroService", "...closeHandler...", "reconnectOgmiosNode done!");
  }

  //scan block backward nomally
  async rollForward({ block }, requestNext) {
    console.log("\n\n... rollForward blockInfo: ", block);
    if(undefined === block){
      await sleep(1000);
      requestNext();
    }

    let blockInfo = block;

    if (bInitialSynced) {

      let blockFilter = {
        "blockHeight": { '$gte': blockInfo.height }
      }

      let blockInfoDbObj = mapDbNameInst.get("blockInfo");
      let ret = await blockInfoDbObj.findAllByOption(blockFilter);
      if (ret.length > 0) {
        console.log("bInitialSynced detect dropped blocks ret: ", blockFilter, ret.length);
        let txInfoDbObj = mapDbNameInst.get("txInfo");
        let mintInfoDbObj = mapDbNameInst.get("mintInfo");
        let treasuryInfoDbObj = mapDbNameInst.get("treasuryUtxoInfo");
        // TODO: handle chain rollback 
        let filter = {
          "slot": { "$gte": blockInfo.slot }
        }

        await blockInfoDbObj.deleteByOption(filter);
        await txInfoDbObj.deleteByOption(filter);
        await mintInfoDbObj.deleteByOption(filter);
        await treasuryInfoDbObj.deleteByOption(filter);

      } else {
        console.log("bInitialSynced detect no dropped blocks: ", blockFilter);
      }

      bInitialSynced = false;
    }

    if (isBlockBFT(blockInfo)) {
      let blockHandlerInst = mapBlockHandler.get("BftBlockType");
      await blockHandlerInst.processBlock(blockInfo, mapDbNameInst);

      let itemTip = {
        "slot": blockInfo.slot,
        "id": blockInfo.id
      }
      this.points = this.prependSyncedTips(this.points, itemTip);

    } else if (isBlockPraos(blockInfo)) {
      this.logUtilSrv.logInfo("ChainSyncMaestroService", "...rollForward...fetch babbage: ",
        blockInfo.height);

      let blockHandlerInst = mapBlockHandler.get("PraosBlockType");
      await blockHandlerInst.processBlock(blockInfo, mapDbNameInst);

      let itemTip = {
        "slot": blockInfo.slot,
        "id": blockInfo.id
      }
      this.points = this.prependSyncedTips(this.points, itemTip);

    }else {
      //await sleep(500);
      //requestNext();      
    } 

    await sleep(5000);
    requestNext();
  }

  // handle chain rollback 
  async rollBackward({ point }, requestNext) {
    // console.log('\n....[ROLLBACK]', point);
    this.logUtilSrv.logInfo("ChainSyncMaestroService", "...rollBackward...point...", point);
    console.log("ChainSyncMaestroService...rollBackward...point...", point);

    // let that = this;
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");
    let treasuryInfoDbObj = mapDbNameInst.get("treasuryUtxoInfo");
    // TODO: handle chain rollback 
    let filter = {
      "slot": { $gt: point.slot }
    }

    await blockInfoDbObj.deleteByOption(filter);
    await txInfoDbObj.deleteByOption(filter);
    await mintInfoDbObj.deleteByOption(filter);
    await treasuryInfoDbObj.deleteByOption(filter);

    let itemTip = {
      "slot": point.slot,
      "id": point.id
    }
    this.points = this.prependSyncedTips(this.points, itemTip);

    await sleep(1000);
    requestNext();
  }

  prependSyncedTips(aryTips, point){

    let m = aryTips.slice();
    console.log("\n\n...sliced tips: ", m);
    m.unshift(point);
    console.log("\n\n...unshifted tips: ", m);

    if(30 < m.length){
      m.pop();
    }
    return m;
  }

  async startUp() {

    console.log("\n\n...ChainSyncMaestroService startUp this.points: ", this.points);
    await this.syncClient.resume(this.points, 1);
  }

}

module.exports = ChainSyncMaestroService;
