
const {
  createInteractionContext
} = require('@cardano-ogmios/client');

const UtxoStatus_Available = 1;
const UtxoStatus_Consumed = 0;


class TreasuryUtxoManager {

  constructor(treasuryAddress, mapDbNameInst, ogmiosServerConfig, checkTokenPolicyIdCfg = undefined) {

    this.treasuryScAddress = treasuryAddress;
    this.checkTokenPolicyIds = checkTokenPolicyIdCfg;
    this.ogmiosServerConfig = ogmiosServerConfig;
    this.treasuryUtxoDbInst = mapDbNameInst.get("treasuryUtxoInfo");
    this.policyIdConfigDbInst = mapDbNameInst.get("checkTokenPolicyIdConfig");
    this.mapAvailalbeUtxos = new Map();

    this.bNftEnable = false;
    if (undefined === this.checkTokenPolicyIds) {
      this.checkTokenPolicyIds = new Array();
      this.bNftEnable = true;
    }

  }

  //scan block backward nomally
  async init() {
    console.log("TreasuryUtxoManager.init()***this.ogmiosServerConfig: ", this.ogmiosServerConfig);
    await this.connectOgmiosNode();

    try {

      let filter = {
        "owner": this.treasuryScAddress,
        "status": UtxoStatus_Available
      }
      let utxoObjs = await this.treasuryUtxoDbInst.findAllByOption(filter);

      for (let i = 0; i < utxoObjs.length; i++) {
        let utxoItem = utxoObjs[i];
        this.mapAvailalbeUtxos.set(utxoItem.utxoId, utxoItem);
      }

      return true;

    } catch (e) {
      console.log("query utxo exception: ", e);
      return false;
    }

  }

  async reconnectOgmiosNode() {
    setTimeout(async () => {
      try {
        await this.connectOgmiosNode();

      } catch (error) {
        // this.logUtilSrv.logInfo("ChainSyncService", "...reconnectOgmiosNode...error...", error);
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

    this.context = await createInteractionContext(this.errorHandler.bind(this),
      this.closeHandler.bind(this),
      {
        "connection": connectionOption,
        "interactionType": 'LongRunning'
      });

    // this.queryClient = await createStateQueryClient(this.context);
  }


  async errorHandler(error) {
    console.error(error);
    // await client.shutdown();
  }

  async closeHandler(code, reason) {
    // console.log('WS close: code =', code, 'reason =', reason);
    // await client.shutdown();

    await this.reconnectOgmiosNode();
  }

  async addUtxo(scAddress, txId, txIndex, blockHeight, slot) {
    let utxoId = txId + "." + txIndex;//encodeUtxo(utxoObj);
    let utxoItem = {
      "utxoId": utxoId,
      "txId": txId,
      "txIndex": txIndex,
      "blockHeight": blockHeight,
      "slot": slot,
      "owner": scAddress,
      "status": UtxoStatus_Available
    }

    let filter = {
      "utxoId": utxoId
    }
    let ret = await this.treasuryUtxoDbInst.findByOption(filter);
    if (ret.length > 0) {
      await this.treasuryUtxoDbInst.deleteByOption(filter);
    }
    await this.treasuryUtxoDbInst.insert(utxoItem);

    this.mapAvailalbeUtxos.set(utxoId, utxoItem);
  }

  getUtxoOwner(txId, txIndex) {
    let utxoId = txId + "." + txIndex;
    let utxoItem = this.mapAvailalbeUtxos.get(utxoId);
    // if (undefined === utxoItem) {
    //   // let filter = {
    //   //   "utxoId": utxoId
    //   // };
    //   // let utxoObjs = await this.treasuryUtxoDbInst.findByOption(filter);
    //   // utxoItem = utxoObjs[0];
    // }
    let owner = (undefined === utxoItem) ? "" : utxoItem.owner;
    return owner;
  }

  async consumeUtxo(txId, txIndex) {
    let utxoId = txId + "." + txIndex;
    // update utxo status to comsumed
    let filter = {
      "utxoId": utxoId
    };
    let updatedData = {
      $set: {
        "status": UtxoStatus_Consumed
      }
    }
    await this.treasuryUtxoDbInst.updateByOption(filter, updatedData);

    let utxoItem = this.mapAvailalbeUtxos.get(utxoId);
    if (undefined !== utxoItem) {
      this.mapAvailalbeUtxos.delete(utxoId);
    }

  }

  async getCheckTokenPolicyIds() {

    console.log("getCheckTokenPolicyIds bNftEnable: ", this.bNftEnable);
    if (!this.bNftEnable) {
      return this.checkTokenPolicyIds;
    }

    try {
      let filter = {
        "checkTokenType": 2  // 1: non-NFT; 2: NFT
      };
      let ret = await this.policyIdConfigDbInst.findAllByOption(filter);
      if (undefined === ret) {
        return this.checkTokenPolicyIds;
      }

      if ((undefined !== ret[0]) && (ret[0].policyIds.length > 0)) {
        this.checkTokenPolicyIds = ret[0].policyIds;
      }
      console.log("getCheckTokenPolicyIds checkTokenPolicyIds: ", this.checkTokenPolicyIds);

    } catch (e) {
      console.log("update CheckTokenPolicyIds failed: ", e);
    }

    return this.checkTokenPolicyIds;

  }

}

module.exports = TreasuryUtxoManager;
