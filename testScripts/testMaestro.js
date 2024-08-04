const axios = require("axios");

class MaestroSDK{

  constructor(){

    this.maestroConfig = {
      "ApiKey": "6wphWH2hxIBUoZkCs3pxRuhqPsdJriBX",
      "url": "https://preprod.gomaestro-api.org/v1"
    }
  }


  init() {

    this.url = this.maestroConfig.url;
    this.apiKey = this.maestroConfig.ApiKey;   
  }

  buildReqOption(request){
      let reqObject = request.object;
      let reqOption = request.option;
      let reqUrl = this.url + "/" + reqObject + "/" + reqOption;

      if(undefined !== request.optional){
        reqUrl = reqUrl + "/" + request.optional;
      }
      console.log("\n...buildReqOption...reqUrl: ", reqUrl);

      let requestConfig = {
          method: 'get',
          maxBodyLength: Infinity,
          url: reqUrl,
          headers: { 
            'Accept': 'application/json', 
            'api-key': this.apiKey
          }
      };

      return requestConfig;
  }

  async confirmTxSecurity(txHash, blockHash, blockHeight){
    if((undefined === txHash) 
        || (undefined === blockHash) 
        || (undefined === blockHeight)){
            
        console.log('MaestroChecker...confirmTxSecurity...invalid params');
        return false;
    }

    let txInfo = undefined;
    try {
        let curTsBeforeCheck = Date.now(); 
                               
        let reqestInfo  = {
            "object": "transactions",
            "option": txHash
        };
        let reqOption = this.buildReqOption(reqestInfo);  
        console.log("...reqOption: ", reqOption);

        let response = await axios.get(reqOption.url, reqOption);
        if(200 !== response.status){
          return false;
        } 

        txInfo = response.data.data;
        console.log('\n\nMaestroTxChecker...confirmTxSecurity...response: ', response);
        
        let curTsAfterCheck = Date.now();  
        console.log('...MaestroChecker', "confirmTxSecurity ...cost: ", curTsAfterCheck-curTsBeforeCheck); 

    }catch(e){       
        console.log('MaestroChecker...confirmTxSecurity...get tx error:', txHash);      
        console.log('MaestroChecker...confirmTxSecurity...get tx error:', e);
        return false;
    }

    if((blockHash === txInfo.block_hash) 
        && (blockHeight === txInfo.block_height)){       
        console.log('MaestroChecker...confirmTxSecurity...succeed: ', txHash);
        return true;
    }
   
    console.log('MaestroChecker...confirmTxSecurity...failed: ', txHash);
    return false;
  }


  async confirmBlockSecurity(blockHash, blockHeight){
    if ((undefined === blockHash) || (undefined === blockHeight)) {

        console.log('MaestroChecker...confirmBlockSecurity...invalid params');
        return false;
    }

    let blockInfo = undefined;
    try {
        let curTsBeforeCheck = Date.now();
        
        let reqestInfo  = {
            "object": "blocks",
            "option": blockHeight
        };
        let reqOption = this.buildReqOption(reqestInfo); 
        console.log("...reqOption: ", reqOption);
        let response = await axios.get(reqOption.url, reqOption);
        if(200 !== response.status){
          return false;
        } 

        blockInfo = response.data.data;
        console.log('\n\nMaestroTxChecker...confirmBlockSecurity...blockInfo: ', blockInfo);
        
        let curTsAfterCheck = Date.now();
        console.log('...MaestroChecker', "confirmBlockSecurity...cost: ", curTsAfterCheck - curTsBeforeCheck);

    } catch (e) {
        console.log('MaestroChecker...confirmBlockSecurity...get block error:', blockHeight);
        console.log('MaestroChecker...confirmBlockSecurity...get block error:', e);
        return false;
    }

    if (blockHash === blockInfo.hash) {
        console.log('MaestroChecker...confirmBlockSecurity...succeed: ', blockHeight);
        return true;
    }

    console.log('MaestroChecker...confirmBlockSecurity...failed: ', blockHeight);
    return false;
  }


  async confirmUtxoSecurity(address){
    if (undefined === address) {

        console.log('MaestroChecker...confirmUtxoSecurity...invalid params');
        return false;
    }

    let utxoRefs = undefined;
    try {
        let curTsBeforeCheck = Date.now();
        
        let reqestInfo  = {
            "object": "addresses",
            "option": `${address}/utxo_refs`
        };
        let reqOption = this.buildReqOption(reqestInfo);
        console.log("...reqOption: ", reqOption);
        let response = await axios.get(reqOption.url, reqOption);
        if(200 !== response.status){
          return false;
        } 

        utxoRefs = response.data.data;
        console.log('\n\nMaestroTxChecker...confirmUtxoSecurity...utxoRefs: ', utxoRefs);
        
        let curTsAfterCheck = Date.now();
        console.log('MaestroChecker...confirmUtxoSecurity...cost: ', curTsAfterCheck - curTsBeforeCheck);

    } catch (e) {
        console.log('MaestroChecker...confirmUtxoSecurity...get block error:', e);
        return false;
    }

    return true;
}

  async getAssetUtxos(assetUnit, address){
    if ((undefined === assetUnit) || (undefined === address)) {

        console.log('MaestroChecker...getAssetUtxos...invalid params');
        return false;
    }

    let utxosInfo = undefined;
    try {
        let curTsBeforeCheck = Date.now();
        
        let reqestInfo  = {
            "object": "assets",
            "option": assetUnit,
            "optional": address
        };
        let reqOption = this.buildReqOption(reqestInfo); 
        console.log("...reqOption: ", reqOption);
        let response = await axios.get(reqOption.url, reqOption);
        if(200 !== response.status){
          return false;
        } 

        utxosInfo = response.data.data;
        console.log('\n\nMaestroTxChecker...getAssetUtxos...utxosInfo: ', utxosInfo);
        
        let curTsAfterCheck = Date.now();
        console.log('...MaestroChecker', "getAssetUtxos...cost: ", curTsAfterCheck - curTsBeforeCheck);

    } catch (e) {
        console.log('MaestroChecker...getAssetUtxos...get block error:', e);
        return false;
    }
    
    return true;
  }
}


async function testMaestroRapidly(){

  let maestroSDKObj = new MaestroSDK();
  maestroSDKObj.init();

  let totalTsCost = 0;
  let times = 1;

  let maxCost = 1000;
  let minCost = 1000;
  
  do{

    let curTsBeforeCheck = Date.now(); 

    let blockHash = "1e17862c0f3b5c002a4631c08b9f526da772fb240bcf6b3611aba8b28e1849d9";
    let blockHeight = 1148380;
    // let ret = await maestroSDKObj.confirmBlockSecurity(blockHash, blockHeight);
    
    let txHash = "45bcdf298d5c3788563e603929154857f59b301c92737e7dc17651e14d4178d3";
    let ret2 = await maestroSDKObj.confirmTxSecurity(txHash, blockHash, blockHeight); 

    let curTsAfterCheck = Date.now();     
    let curCostTs = curTsAfterCheck - curTsBeforeCheck;
    console.log("..confirmTxSecurity cost: ", times, curCostTs);

    totalTsCost = totalTsCost + curCostTs;
    times++;

    if(maxCost < curCostTs){
      maxCost = curCostTs;
    }

    if(minCost > curCostTs){
      minCost = curCostTs;
    }

    if(times > 1000){
      break;
    }

  }while(true);  

  console.log("\n\n..confirmTxSecurity average cost: ", totalTsCost, totalTsCost/times);
  console.log("..confirmTxSecurity max cost: ", maxCost);
  console.log("..confirmTxSecurity minCost cost: ", minCost);
}

async function testMaestro(){

  let maestroSDKObj = new MaestroSDK();
  maestroSDKObj.init();

  let assetUnit = "9772ff715b691c0444f333ba1db93b055c0864bec48fff92d1f2a7fe446a65645f746573744d6963726f555344";
  let strAddress = "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp"

  // let ret = await maestroSDKObj.getAssetUtxos(assetUnit, strAddress);


  let ret = await maestroSDKObj.confirmUtxoSecurity(strAddress);


}

testMaestro();


