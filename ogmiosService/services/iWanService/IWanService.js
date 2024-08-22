const AgentServiceInterface = require("../../interfaces/AgentServiceInterface");
const ServiceFramework = require("../../framework/ServiceFramework");
const IWanTask = require("./IWanTask");
const IWanClient = require('iwan-sdk');


class IWanService extends AgentServiceInterface {

  /**
   *Creates an instance of IWanService.
   * @memberof IWanService
   */
  constructor() {
    super();

    this.chainID = "WAN";
    this.mapDbInstance = new Map();
    this.bInitialOk = false;
  }

  async init() {
    // to scan rp db records and to get the timeout rp
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");

    let policyIdSchema = await this.configService.getGlobalConfig("mappingTokenPolicyIdSchema");  
    this.policyIdDbInst = await this.storageSrvIns.initDB(policyIdSchema);
    this.mapDbInstance.set(policyIdSchema.name, this.policyIdDbInst);

    this.iWanConfig = await this.configService.getGlobalConfig("iWanConfig");
    this.iWanClientInst = new IWanClient(this.iWanConfig.apiKey,
      this.iWanConfig.secretKey,
      this.iWanConfig.option);
    
    this.bMainnet = ("api.wanchain.org" === this.iWanConfig.option.url) ? true : false;

    let policyIdRecord = await this.policyIdDbInst.findAllByOption();
    if (0 == policyIdRecord.length) {
      let ret = await this.configNftPolicyIds();
      if (false === ret) {
        console.log("\n\n insert initial nft policyIdInfo failed! ");
        throw "insert initial nft policyIdInfo failed!"
      }
    }

    this.bInitialOk = true;
    return true;
  }

  getIWanClientInstance() {
    return this.iWanClientInst;
  }

  async getSupportedChainInfo() {

    try {
      let supportedChainInfoArys = await this.iWanClientInst.getSupportedChainInfo();

      for (let i = 0; i < supportedChainInfoArys.length; i++) {
        let tmpChainID = supportedChainInfoArys[i].chainID;
        let tmpChainType = supportedChainInfoArys[i].chainType;

        if ('ADA' === tmpChainType) {
          this.cardanoChainID = tmpChainID;
          break;
        }
      }

    } catch (err) {
      console.log(err);
      throw ("getSupportedChainInfo exception: ", err);
    }

    return;
  }

  async getCardanoNftPolicyIdInfo() {

    let validNftPolicyIds = new Array();
    let mapNftPolicyId = new Map();

    let options = this.bMainnet ? { tags: ["bridge", "bridgeBeta"] } : { isAllTokenPairs: true }
    console.log("options: ", options);

    let tokenPairsInfo = await this.iWanClientInst.getTokenPairs(options); 
    // console.log("getCardanoNftPolicyIdInfo ret: ", tokenPairInfo);	
    for (let i = 0; i < tokenPairsInfo.length; i++) {
      let tokenPair = tokenPairsInfo[i];

      if (this.cardanoChainID === tokenPair.fromChainID) {
        // need to check the real account type in cardano nft tokenpairs
        if ((tokenPair.fromAccountType === 'Erc721')
          || (tokenPair.fromAccountType === 'Erc1155')) {
          // cardanoRelatedTokenPairs.push(tokenPair);

          let nftScAddress = tokenPair.fromAccount;
          let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
          console.log("cardano related TokenPair fromChain: ", i, tokenPair, strAssetUnit);

          let [strPolicyId, strName] = strAssetUnit.split(".");
          mapNftPolicyId.set(strPolicyId, true);
        }

      } else if (this.cardanoChainID === tokenPair.toChainID) {
        // need to check the real account type in cardano nft tokenpairs
        if ((tokenPair.toAccountType === 'Erc721')
          || (tokenPair.toAccountType === 'Erc1155')) {
          // cardanoRelatedTokenPairs.push(tokenPair);

          let nftScAddress = tokenPair.toAccount;
          let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
          console.log("cardano related TokenPair toChain: ", i, tokenPair, strAssetUnit);

          let [strPolicyId, strName] = strAssetUnit.split(".");
          mapNftPolicyId.set(strPolicyId, true);
        }
      }
    }

    for (let policyId of mapNftPolicyId.keys()) {
      validNftPolicyIds.push(policyId);
    }

    return validNftPolicyIds;
  }

  async getNftTreasuryPolicyIds() {
    try {
      await this.getSupportedChainInfo();

      let validNftPolicyIds = await this.getCardanoNftPolicyIdInfo();

      return validNftPolicyIds;

    } catch (err) {
      console.log(err);
      throw ("getNftTreasuryPolicyIds exception: ", err);
    }
  }

  async configNftPolicyIds() {
    console.log('\n\n IWanService.. retrieveValidNftPolicyIds begin:');
    // this.chainId2TypeInfo
    let nftPolicyIds = undefined;
    try {
      nftPolicyIds = await this.getNftTreasuryPolicyIds();
      console.log("IWanService....nftPolicyIds info: ", nftPolicyIds);

    } catch (err) {
      console.log(err);
      return false;
    }

    if (undefined === nftPolicyIds) {
      nftPolicyIds = new Array();
    }

    try {
      let nftPolicyIdsRecord = {
        "checkTokenType": 2,
        "policyIds": nftPolicyIds
      };
      await this.policyIdDbInst.insert(nftPolicyIdsRecord);

    } catch (e) {
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'insert nft policyIds failed...', e);
      return false;
    }

    return true;
  }

  startUp() {
    console.log("\n\n IWanService startUp: ");
    if (!this.bInitialOk) {
      return false;
    }

    this.iWanTask = new IWanTask(this.iWanConfig, this.iWanClientInst, this.mapDbInstance, this.cardanoChainID, this.bMainnet);
    this.iWanTask.startTask();
  }

}

module.exports = IWanService;
