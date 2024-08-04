const { parseMetadata,convertMaestroUtxoAmount, convertMaestroRedeemers, decodeMetadata2Json } = require("../utilService/commonUtils");

class BftBlockHandler {
  constructor(mapUtxoManager, bSecurityConfirmEnable, iWanClientObj) {
    this.chainType = "ADA";
    this.blockType = "bft";

    this.treasuryUtxoMgr = mapUtxoManager.get("NonNFT");
    this.nftTreasuryUtxoMgr = mapUtxoManager.get("NFT");

    this.iWanClientInst = iWanClientObj;
    this.mapChainID2Info = new Map();
    this.cardanoChainId = undefined;

    this.bSecurityConfirmedByDefault = false;
    if (false === bSecurityConfirmEnable) {
      this.bSecurityConfirmedByDefault = true
    }
  }

  async getTokenPairInfoById(tokenPairId){
    let tokenPairInfo = undefined;
    try {
      tokenPairInfo = await this.iWanClientInst.getTokenPairInfo(tokenPairId);
      console.log("tokenPair Info: ", tokenPairInfo);

    } catch (err) {
      console.log("getTokenPairInfoById failed: ", err);
      return undefined;
    }
    return tokenPairInfo;
  }

	async getSupportedChainInfo(){	
		try {
		  let supportedChainInfoArys = await this.iWanClientInst.getSupportedChainInfo();
      if(undefined === supportedChainInfoArys){
        return undefined;
      }

		  // console.log("supported ChainI nfo: ", supportedChainInfoArys);
      for(let i=0; i<supportedChainInfoArys.length; i++){
        let tmpChainID = supportedChainInfoArys[i].chainID;
        let tmpChainSymbol = supportedChainInfoArys[i].chainSymbol;
        if('ADA' === tmpChainSymbol){
          this.cardanoChainId = tmpChainID;
        }

        let chainAddressPrex = "0x";
        let crossScAddr = supportedChainInfoArys[i].crossScAddr;
        let multicallAddr = supportedChainInfoArys[i].multicallAddr;
        if((undefined === multicallAddr) || (undefined === crossScAddr)){
          chainAddressPrex = "";

        }else{
          let prexIndex = multicallAddr.indexOf("0x");
          if(-1 === prexIndex){
            chainAddressPrex = "";
          }
        }

        let chainInfo = {
          "chainSymbol": tmpChainSymbol,
          "chainID": tmpChainID,
          "addressPrex": chainAddressPrex
        }
        this.mapChainID2Info.set(tmpChainID, chainInfo);

      }

		  return supportedChainInfoArys;
		  
		} catch (err) {
		  console.log(err);
      return undefined;
		}
	}

  async parseAddressPrefix(tokenPairId){
    let tokenPairInfo = await this.getTokenPairInfoById(tokenPairId);
    if(tokenPairInfo === ret){
      return undefined;
    }

    // let fromChainID = tokenPairInfo.fromChainID;
    let targetChainID = tokenPairInfo.toChainID;
    if(this.cardanoChainId === tokenPairInfo.toChainID){
      // if to chain is cardano, then to check from chainID
      targetChainID = tokenPairInfo.fromChainID;
    }

    let ret = await this.getSupportedChainInfo();
    if(undefined === ret){
      return undefined;
    }
    let chainInfo = await this.mapChainID2Info.get(targetChainID);
    let addressPrex = chainInfo.addressPrex;

    return addressPrex;
  }

  //scan block backward nomally
  async processBlock(blockInfo, mapDbNameInst) {

    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    console.log("\n......rollForward praos block:", blockInfo);
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    this.blockEra = blockInfo.era;
    let deltaTime = blockInfo.slot - latestBlockSlot;
    let curBlockTimeStamp = latestBlockTs + deltaTime;
    // console.log("curBlockTimeStamp:", curBlockTimeStamp);

    let blockTxs = await this.updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);

    await this.updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst);

    await this.updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);
  }

  async updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");

    console.log("\n\n*****non-NFT treasuryScAddress: ", this.treasuryUtxoMgr.treasuryScAddress);
    console.log("\n\n*****NFT treasuryScAddress: ", this.nftTreasuryUtxoMgr.treasuryScAddress);

    let blockTxs = new Array();
    for (let index = 0; index < blockInfo.transactions.length; index++) {
      let bTreasuryRelateTx = false;
      let bNftTreasuryRelateTx = false;

      const tx = blockInfo.transactions[index];
      console.log('\n\n .........[tx]:  ', tx);
      const txRedeemers = convertMaestroRedeemers(tx.redeemers);
      console.log('\n\n .........tx redeemers:  ', txRedeemers);

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = tx.inputs;
      console.log('\n\n .........[txInputs]:  ', txInputs);
      for (let j = 0; j < txInputs.length; j++) {
        let txHash = txInputs[j].transaction.id;
        let txIndex = txInputs[j].index;
        let owner = this.treasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
        if("" === owner){
          owner = this.nftTreasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
        }

        let input = {
          "tx_hash": txHash,
          "tx_index": txIndex,
          "utxo_owner": owner
        }
        formatedInputs.push(input);

        if (("" !== owner) && ("inputs" === tx.spends)) {
          console.log('\n\n .........getUtxoOwner:  ', owner);
          if (this.treasuryUtxoMgr.treasuryScAddress === owner) {
            bTreasuryRelateTx = true;
            await this.treasuryUtxoMgr.consumeUtxo(txHash, txIndex);

          }else if (this.nftTreasuryUtxoMgr.treasuryScAddress === owner) {
            bNftTreasuryRelateTx = true;
            await this.nftTreasuryUtxoMgr.consumeUtxo(txHash, txIndex);
          }
        }
      }

      let collateralInputs = new Array();
      const collaterals = tx.collaterals;
      console.log('\n\n .........[collaterals]:  ', collaterals);
      if (collaterals) {
        for (let j = 0; j < collaterals.length; j++) {
          let txHash = collaterals[j].transaction.id;
          let txIndex = collaterals[j].index;
          let owner = this.treasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
          if("" === owner){
            owner = this.nftTreasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
          }

          let input = {
            "tx_hash": txHash,
            "tx_index": txIndex,
            "utxo_owner": owner
          }
          collateralInputs.push(input);

          if (("" !== owner) && ("collaterals" === tx.spends)) {
            console.log('\n\n .........getUtxoOwner:  ', owner);
            if (this.treasuryUtxoMgr.treasuryScAddress === owner) {
              bTreasuryRelateTx = true;
              console.log('\n\n .........collateral getUtxoOwner:  ', owner);
              await this.treasuryUtxoMgr.consumeUtxo(txHash, txIndex);

            }else if (this.nftTreasuryUtxoMgr.treasuryScAddress === owner) {
              bNftTreasuryRelateTx = true;
              console.log('\n\n .........collateral getUtxoOwner:  ', owner);
              await this.nftTreasuryUtxoMgr.consumeUtxo(txHash, txIndex);
            }
          }
        }
      }

      // to formate the output objects
      let formatedOutputs = new Array();
      const txOutputs = tx.outputs;
      console.log('\n\n .........[txOutputs]:  ', txOutputs);
      for (let i = 0; i < txOutputs.length; i++) {
        // step 1: to parse the value
        let utxoValue = txOutputs[i].value;

        if (this.treasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }
        if (this.nftTreasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }

        let amounts = convertMaestroUtxoAmount(utxoValue);
        for (let index=0; index<amounts.length; index++) {
          let key = amounts[index].unit;
          if("lovelace" === key){
            continue;
          }

          // TODO: to parse output utxo's value if related to check token policyId
          let policyId_name = key.split(".");
          // to check output is treasury related
          if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId_name[0])) {
            console.log('\n\n .........checkTokenPolicyIds includes:  ', policyId_name[0]);
            // bTreasuryRelateTx = true;
            await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
              blockInfo.height, blockInfo.slot);
          }else{
            let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
            if (nftCheckTokenPolicyIds.includes(policyId_name[0])) {
              console.log('\n\n .........nft checkTokenPolicyIds includes:  ', policyId_name[0]);
              // bTreasuryRelateTx = true;
              await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
                blockInfo.height, blockInfo.slot);
            }
          }
        }

        let formatedOutput = {
          "address": txOutputs[i].address,
          "amount": amounts,
          "datum": txOutputs[i].datum
        }
        formatedOutputs.push(formatedOutput);
      }

      if (tx.collateralReturn) {
        console.log('\n\n ...tx...collateral Return: ', tx.collateralReturn);
        let collateralValue = tx.collateralReturn.value;
        let collateralAmounts = convertMaestroUtxoAmount(collateralValue);

        if (this.treasuryUtxoMgr.treasuryScAddress === tx.collateralReturn.address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }else if (this.nftTreasuryUtxoMgr.treasuryScAddress === tx.collateralReturn.address) {
          bTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }
        
        for (let keyIndex=0; keyIndex<collateralAmounts.length; keyIndex++) {
          let key = collateralAmounts[keyIndex].unit;
          if("lovelace" === key){
            continue;
          }        

          // to check output token policyId is related to check token
          let policyId_name = key.split(".");
          if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId_name[0])) {
            console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId_name[0]);
            // bTreasuryRelateTx = true;
            await this.treasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
              blockInfo.height, blockInfo.slot);
              
          }else {
            let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
            if (nftCheckTokenPolicyIds.includes(policyId_name[0])) {
              console.log('\n\n .........nft collateral checkTokenPolicyIds includes:  ', policyId_name[0]);
              // bTreasuryRelateTx = true;
              await this.nftTreasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
                blockInfo.height, blockInfo.slot);
            }
          }
        }
        

        let collateralOutput = {
          "address": tx.collateralReturn.address,
          "amount": collateralAmounts,
          "datum": tx.collateralReturn.datum
        }
        formatedOutputs.push(collateralOutput);
      }

      // test 
      let txScriptHash = tx.scriptIntegrityHash;
      console.log("...test...txScriptHash: ", txScriptHash);

      let mintInfoAry = new Array();
      let txMint = tx.mint;
      if (undefined !== txMint) {
        
        let mintUtxosAry = convertMaestroUtxoAmount(txMint);        
        for (let index=0; index<mintUtxosAry.length; index++) {
          //let policyId = unit.slice(0, 56);
          //let name = unit.slice(57);
          let unit = mintUtxosAry[index].unit;
          let amount = mintUtxosAry[index].quantity;
          let mintItem = {
            "unit": unit,
            "amount": parseInt(amount)
          }
          mintInfoAry.push(mintItem);

          if("lovelace" === unit){
            continue;
          }
          
          // to record mint info in mintInfo db table	
          let mintInfo = {
            "tokenId": unit,
            "txId": tx.id,
            "mintValue": parseInt(amount),
            "blockHeight": blockInfo.height,
            "slot": blockInfo.slot,
            "security_Confirmed": this.bSecurityConfirmedByDefault // need to security check by external resource 
          }

          let filter = {
            "tokenId": unit,
            "txId": tx.id,
          }
          let ret = await mintInfoDbObj.findByOption(filter);
          if (ret.length > 0) {
            await mintInfoDbObj.deleteByOption(filter);
          }

          await mintInfoDbObj.insert(mintInfo);
          console.log('insert babbage tx min record:  ', mintInfo);
        }
      }

      console.log("\n...meta ...: ", tx.metadata);  
      // to formate the tx meta data
      let formatedMetaData = undefined;
      // if (bTreasuryRelateTx && tx.metadata) {
      if (tx.metadata) {
        let metaLabelArray = new Array();

        let metaHash = tx.metadata.hash;
        let metaLabels = tx.metadata.labels;
        for (let key in metaLabels) {
          console.log("\n...meta item...: ", key, metaLabels[key]);
          let jsonMetaData = undefined;
          let cborMetaData = undefined;

          let dataItem = metaLabels[key].json;
          if(undefined !== dataItem){
            jsonMetaData = parseMetadata(dataItem);//decodeMaestroMetaData(dataItem); //parseMetadata
          } 
          console.log("\n...parseMetadata...jsonMetaData: ", jsonMetaData);

          if(undefined !== metaLabels[key].cbor){
            let preString = "5839";
            if(-1 !== metaLabels[key].cbor.indexOf(preString)){
              cborMetaData = metaLabels[key].cbor.replace(preString, "0x");
            }else{
              cborMetaData = metaLabels[key].cbor;
            }
          }

          let prefix = "0x";
          if(undefined !== jsonMetaData.smgID){
            console.log("\n...parseMetadata...smgID: ", jsonMetaData.smgID);
            jsonMetaData.smgID = prefix + jsonMetaData.smgID;
          }
          if((undefined !== jsonMetaData.toAccount)
            && ("string" === typeof (jsonMetaData.toAccount))){
              let tokenPairId = jsonMetaData.tokenPairID;
              let addressPrex = this.parseAddressPrefix(tokenPairId);

              console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);              
              jsonMetaData.toAccount = addressPrex + jsonMetaData.toAccount;
          }
          // if((undefined !== jsonMetaData.fromAccount)
          //   && ("string" === typeof (jsonMetaData.fromAccount))){
          //     console.log("\n...parseMetadata...fromAccount: ", jsonMetaData.fromAccount);
          //     jsonMetaData.fromAccount = prefix + jsonMetaData.fromAccount;
          // }

          let metaDataInfo = {
            "label": key,
            "json_metadata": jsonMetaData,
            "cbor_metadata": cborMetaData
          }
          console.log('[txMetaData] add metaDataInfo: ', metaDataInfo);
          metaLabelArray.push(metaDataInfo);               
        }

        formatedMetaData = {
          "hash": metaHash,
          "metaData": metaLabelArray
        }
      }
      console.log('[txMetaData]: ', formatedMetaData);

      // to get the validityInterval of tx
      let valInteral = tx.validityInterval;
      console.log('[validityInterval]: ', valInteral);
      let txTtl = {
        "invalidBefore": (undefined === valInteral) ? null : valInteral.invalidBefore,
        "invalidHereafter": (undefined === valInteral) ? null : valInteral.invalidAfter,
      };

      let strFee = tx.fee.ada.lovelace.toString();
      let txInfo = {
        "txId": tx.id,
        "blockHeight": blockInfo.height,
        "blockHash": blockInfo.id,
        "slot": blockInfo.slot,
        "txIndex": index,
        "time": curBlockTimeStamp,
        "metaData": formatedMetaData,
        "collaterals": collateralInputs,
        "inputs": formatedInputs,
        "outputs": formatedOutputs,
        "validityInterval": txTtl,
        "mint": mintInfoAry,
        "redeemers": txRedeemers,
        "fee": strFee,
        "inputSource": tx.spends
      }
      // console.log('txInfo:  ', txInfo);

      let filter = {
        "txId": tx.id
      }
      let ret = await txInfoDbObj.findByOption(filter);
      if (ret.length > 0) {
        await txInfoDbObj.deleteByOption(filter);
      }

      // console.log('begin to insert babbage tx:  ', txInfo);
      await txInfoDbObj.insert(txInfo);
      console.log('insert babbage tx:  ', txInfo);

      let txObj = {
        "tx_hash": tx.id,
        "tx_index": index,  // index in the block
        "treasury_related": bTreasuryRelateTx,
        "nftTreasury_related": bNftTreasuryRelateTx,
        "security_Confirmed": this.bSecurityConfirmedByDefault // need to security check by external resource
      }
      blockTxs.push(txObj);
    }

    return blockTxs;
  }

  async updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");

    let syncedBlockInfo = {
      "blockHeight": blockInfo.height,
      "blockHash": blockInfo.id,
      "slot": blockInfo.slot,
      "hash": blockInfo.id,
      "time": curBlockTimeStamp,
      "blockType": this.blockType,
      "blockEra": this.blockEra,
      "blockTxs": blockTxs
    }

    let filter = {
      "blockHeight": blockInfo.height
    }
    let ret = await blockInfoDbObj.findByOption(filter);
    if (ret.length > 0) {
      await blockInfoDbObj.deleteByOption(filter);
    }
    // console.log('babbage blockInfo:  ', syncedBlockInfo);
    await blockInfoDbObj.insert(syncedBlockInfo);
    console.log('[sync new babbage block]', syncedBlockInfo);
  }

  async updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {

    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");

    let syncedData = {
      $set: {
        "blockHeight": blockInfo.height,
        "time": curBlockTimeStamp,
        "slot": blockInfo.slot,
        "hash": blockInfo.id
      }
    }

    let filter = {
      "chainType": this.chainType
    }
    await syncedInfoDbObj.updateByOption(filter, syncedData);

    console.log('[sync new babbage block]', syncedData);
  }
}

module.exports = BftBlockHandler;
