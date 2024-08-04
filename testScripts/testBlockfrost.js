

const fs = require('fs');
const cbor = require('cbor');
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;


class BlockFrostSDK{

  constructor(){

    // this.blockFrostApi =  new BlockFrostAPI({projectId:'preprod2CkSg6ILU3vxDMRn2EOO6hwXtUAOceDF'});

    let blockfrostOption = {
      projectId: 'mainnetwyQcQkHH6HTr7eylR6hWwA2Rt5R9AVEY',
      requestTimeout: 300000,
      retrySettings: {
          limit: 1000, // retry count
          methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'], // no retry on POST
          statusCodes: [408, 413, 429, 500, 502, 503, 504, 520, 521, 522, 524],
          errorCodes: [
              'ETIMEDOUT',
              'ECONNRESET',
              'EADDRINUSE',
              'ECONNREFUSED',
              'EPIPE',
              'ENOTFOUND',
              'ENETUNREACH',
              'EAI_AGAIN',
              'EPROTO',
          ],
          calculateDelay: (retryObject) => {
              return retryObject.computedValue !== 0 ? 1000 : 0;
          }
      }
    }
    this.blockFrostApi = new BlockFrostAPI(blockfrostOption);

    this.scanSteps = 10; // should record in config file
    this.retryTimeInterval = 60*1000;
  }

  async confirmTxSecurity(txHash, blockHash, blockHeight) {
    if ((undefined === txHash)
        || (undefined === blockHash)
        || (undefined === blockHeight)) {

        console.log('confirmTxSecurity...invalid params');
        return false;
    }

    let txInfo = undefined;
    try {
        let curTsBeforeCheck = Date.now();

        txInfo = await this.blockFrostApi.txs(txHash);
        console.log('confirmTxSecurity...txInfo: ', txInfo);

        let curTsAfterCheck = Date.now();
        console.log("confirmTxSecurity ...cost: ", curTsAfterCheck - curTsBeforeCheck);

    } catch (e) {
        console.log('confirmTxSecurity...get tx error:', txHash);
        console.log('confirmTxSecurity...get tx error:', e);
        return false;
    }

    if ((blockHash === txInfo.block)
        && (blockHeight === txInfo.block_height)) {
        console.log('confirmTxSecurity...succeed: ', txHash);
        return true;
    }

    console.log('confirmTxSecurity...failed: ', txHash);
    return false;
  }


  async confirmBlockSecurity(blockHash, blockHeight) {
      if ((undefined === blockHash) || (undefined === blockHeight)) {

          console.log('confirmBlockSecurity...invalid params');
          return false;
      }

      let blockInfo = undefined;
      try {
          let curTsBeforeCheck = Date.now();

          blockInfo = await this.blockFrostApi.blocks(blockHeight);
          console.log('confirmBlockSecurity...blockInfo: ', blockInfo);

          let curTsAfterCheck = Date.now();
          console.log("confirmBlockSecurity...cost: ", curTsAfterCheck - curTsBeforeCheck);

      } catch (e) {
          console.log('confirmBlockSecurity...get block error:', blockHeight);
          console.log('confirmBlockSecurity...get block error:', e);
          return false;
      }

      if (blockHash === blockInfo.hash) {
          console.log('confirmBlockSecurity...succeed: ', blockHeight);
          return true;
      }

      console.log('confirmBlockSecurity...failed: ', blockHeight);
      return false;
  }


  async confirmUtxoSecurity(address, txId, index) {
    if ((undefined === address)
        || (undefined === txId)
        || (undefined === index)) {

        console.log('confirmUtxoSecurity...invalid params');
        return false;
    }

    // let utxos = undefined;
    try {
      let pageIndex = 0;
      let itemCount = 100;

      do{
        let curTsBeforeCheck = Date.now();

        let paginationOptions = {
          count: itemCount,
          page: pageIndex,
          order: 'asc'
        }
        let utxos = await this.blockFrostApi.addressesUtxos(address, paginationOptions);
        console.log('\n...confirmUtxoSecurity...utxos: ', pageIndex, utxos.length);

        let curTsAfterCheck = Date.now();
        console.log("confirmUtxoSecurity ...cost: ", curTsAfterCheck - curTsBeforeCheck);

        for (let i = 0; i < utxos.length; i++) {
          let txHash = utxos[i].tx_hash;
          let outputIndex = utxos[i].output_index;
          if ((txHash === txId) && (outputIndex === index)) {
              console.log('confirmUtxoSecurity...succeed: ', address, txId, index);
              return true;
          }
        }

        if(utxos.length < itemCount){
          break;
        }else{
          pageIndex++;
        }
        
      }while(true);

    } catch (e) {
      console.log('confirmUtxoSecurity...get utxo refs failed:', address, txId, index);
      console.log('confirmUtxoSecurity...get utxo refs error:', e);
      return false;
    }

    console.log('confirmUtxoSecurity...failed: ', address, txId, index);
    return false;
  }

  async evaluateTx(strRawdata){
    let evaluateTxRet = undefined;

    try{
      evaluateTxRet = await this.blockFrostApi.utilsTxsEvaluate(strRawdata);
      console.log("\n\n...evaluateTx: ", evaluateTxRet);

    }catch(e){
      console.log("\n\n...evaluateTx error: ", e);
    }

    console.log("\n\n...evaluateTx ret: ", evaluateTxRet);
    return evaluateTxRet;

  }

  async queryAgentUtxos(){
     
    // to query utxo of agent's account
    this.agentAddress = "addr_test1qq0rlnqmmmrl4wzy35nt0pzsuu88h78swk4wnjrpzy8yk62mqlt3z2733rdlarwrd0l9sgx5t99qgsejv52qrzwmm8hqfvmgam";
    let agentUtxos = await this.blockFrostApi.addressesUtxos(this.agentAddress);
    // this.chainTxHandler.syncUtxoRecord(agentUtxos);

    console.log("\n\n...queryAgentUtxos: ", agentUtxos);
    return;
  }

  async queryTx(){
    let txInfo = undefined;

    try{
      txInfo = await this.blockFrostApi.txs("4821e71fbb1dcedfc4cce6a3207dbc2c24c8f5d8291b8929a87ae61986d26c5a");
      console.log("\n\n...txInfo: ", txInfo);

    }catch(e){
      console.log("\n\n...get txInfo error: ", e);
    }

    console.log("\n\n...queryTx: ", txInfo);
    return txInfo;
  }

  async queryBlock(blockHeight){
    let blockInfo = undefined;

    try{
      blockInfo = await this.blockFrostApi.blocks(blockHeight);
      console.log("\n\n...blockInfo: ", blockInfo);

    }catch(e){
      console.log("\n\n...get blockInfo error: ", e);
    }

    return blockInfo;
  }
}

let checkTokenPolicyIdCfg =  [
  "4295914ef5ff86204642d3334ee444f9dafc694b4da246b39b68fbb0",
  "2707ef39e2521117d2d3851ef80ad17737eb8294a58397948aa28568"
];
let checkTokenRegexOption = new Array();
for (let i = 0; i < checkTokenPolicyIdCfg.length; i++) {
  let tmpRegex = eval("/^" + checkTokenPolicyIdCfg[i] + './');
  let tokenRegexItem = {
    "tokenId": { $regex: tmpRegex }
  }
  checkTokenRegexOption.push(tokenRegexItem);
}

let blocksOption = {
  "blockTxs.treasury_related": true,
  "blockHeight": {
    $gte: 10000,
    $lt: 10100
  }
};

console.log("\n\n...checkTokenRegexOption: ", checkTokenRegexOption, blocksOption);

let blockFrostObj = new BlockFrostSDK();

// let txInfo = blockFrostObj.queryTx();

// let blockHeight = 991079;
// let blockInfo = blockFrostObj.queryBlock(blockHeight);

let blockHash = '6004c6b2c632a26e5d7b86e5ee82d7cf99fe7cecf8b2a0091ab89243b0403ef8';
let blockHeight = 9872840;
// let checkRet = blockFrostObj.confirmBlockSecurity(blockHash, blockHeight);

let txHash = "343253bfc32353abca2fb33a3858a194ee5568b7ce390c5fdc9b508db51ec940";
// blockFrostObj.confirmTxSecurity(txHash, blockHash, blockHeight)


// let strAddress = "addr1qy00g88td4eq9snj5zr5lxhz0z5z6yrjq9cny5zesaguvh8gws2eg74k2zn2qyyk50y6ze75j4vjmu5k9dqagk0eg0wsk7nxax";
// let txId = "0028f39f1195822a0c768a0dacb71577c9f398124fc354258ab846084abf654e";
// let txIndex = 1;
// blockFrostObj.confirmUtxoSecurity(strAddress, txId, txIndex);


let strRawdata = "84a50081825820786ebd8549028440b7c94d89638671bac7866dfe97ad3246028bc52cfd1044e6010182a3005839311cfb41dc0b8d13fe53600e17059dcbcda2d8647347ec25288b4f5234259b187aa287258c0b95e636a472391282dedb2eb17b8bf321bb14f1011a00200b20028201d81845d8799f01ff82583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a004ac177021a0002be85031a0700841b075820ee0dcf424cf75ab1cfd2b3b08b28bf83d079f59dc9e168ed4dde08feb8080dd9a10081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b58400632ce02ecd8e913159103b74866d3395dfc01c9fa161446a5240e8129ee2843715fd8c044d6b167a3f921277eb40ea592e0d18a264b4ac7a6b31972a840550ff5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333969746f4163636f756e7454d290071e43abaa7b4de21db8d6a31c8b046f479a6b746f6b656e50616972494419020c647479706501";
blockFrostObj.evaluateTx(strRawdata);





