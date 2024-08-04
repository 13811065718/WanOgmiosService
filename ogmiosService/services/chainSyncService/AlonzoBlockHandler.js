const { decodeMetadata2Json } = require("../utilService/commonUtils");

class AlonzoBlockHandler {
  constructor() {
    this.chainType = "ADA";
    this.blockType = "alonzo";
  }

  //scan block backward nomally
  async processBlock(block, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    // console.log("\n......rollForward:");
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    let blockInfo = block.alonzo;
    let deltaTime = blockInfo.header.slot - latestBlockSlot;
    let curBlockTimeStamp = latestBlockTs + deltaTime;
    // console.log("curBlockTimeStamp:", curBlockTimeStamp);

    let blockTxs = await this.updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);

    await this.updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst);

    await this.updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);
  }

  async updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");

    let blockTxs = new Array();
    for (let index = 0; index < blockInfo.body.length; index++) {
      const tx = blockInfo.body[index];
      console.log('\n\n .........[tx]:  ', tx);
      let txSender = undefined;

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = tx.body.inputs;
      for (let j = 0; j < txInputs.length; j++) {
        let txHash = txInputs[j].txId;
        let txIndex = txInputs[j].index;

        let input = {
          "tx_hash": txHash,
          "tx_index": txIndex,
        }
        formatedInputs.push(input);
      }

      // to formate the output objects
      let formatedOutputs = new Array();
      const txOutputs = tx.body.outputs;
      for (let i = 0; i < txOutputs.length; i++) {
        let utxoValue = txOutputs[i].value;

        let amounts = new Array();
        let adaAmountObj = {
          "unit": "lovelace",
          "quantity": utxoValue.coins.toString()
        }
        amounts.push(adaAmountObj);

        if (utxoValue.assets) {
          for (let key in utxoValue.assets) {
            let value = utxoValue.assets[key];
            let assetAmountObj = {
              "unit": key,
              "quantity": value.toString()
            }
            // console.log("formate asset amount: ", assetAmountObj);
            amounts.push(assetAmountObj);
          }
        }

        let formatedOutput = {
          "address": txOutputs[i].address,
          "amount": amounts,
          "datum": txOutputs[i].datum
        }
        formatedOutputs.push(formatedOutput);
      }

      // record tx mint info
      let mintInfoAry = new Array();
      let txMint = tx.body.mint;
      if(undefined !== txMint){
        console.log("...test...tx  mintCoin: ", txMint.coins, txMint.assets);

        let mintCoin = txMint.coins;
        if(parseInt(mintCoin) > 0){
          let mintItem = {
            "unit": "lovelace",
            "amount": parseInt(mintCoin)
          }
          mintInfoAry.push(mintItem);
        }

        let assets = txMint.assets;
        for (let unit in assets) {
          //let policyId = unit.slice(0, 56);
          //let name = unit.slice(57);
          let amount = assets[unit];

          let mintItem = {
            "unit": unit,
            "amount": parseInt(amount)
          }
          mintInfoAry.push(mintItem);

	        // to record mint info in mintInfo db table	
          let mintInfo = {
            "tokenId":unit,
            "txId":tx.id,
            "mintValue": parseInt(amount),
            "blockHeight": blockInfo.header.blockHeight
          }
  
          let filter = {
            "tokenId":unit,
            "txId":tx.id,
          }
          let ret = await mintInfoDbObj.findByOption(filter);
          if (ret.length > 0) {
            await mintInfoDbObj.deleteByOption(filter);
          }
  
          await mintInfoDbObj.insert(mintInfo);
          console.log('insert mary tx min record:  ', mintInfo); 
        }

      }

      // to formate the tx meta data
      let formatedMetaData = undefined;
      if (tx.metadata) {
        let metaDataArray = new Array();

        let metaHash = tx.metadata.hash;
        let metaData = tx.metadata.body.blob;

        for (let key in metaData) {
          let jsonMetaData = decodeMetadata2Json(metaData[key]);
          let metaDataInfo = {
            "label": key,
            "json_metadata": jsonMetaData
          }
          metaDataArray.push(metaDataInfo);
        }

        formatedMetaData = {
          "hash": metaHash,
          "metaData": metaDataArray
        }
      }
      console.log('[txMetaData]: ', formatedMetaData);

      let txInfo = {
        "txId": tx.id,
        "blockHeight": blockInfo.header.blockHeight,
        "txIndex": index,
        "time": curBlockTimeStamp,
        "metaData": formatedMetaData,
        "inputs": formatedInputs,
        "outputs": formatedOutputs
      }
      await txInfoDbObj.insert(txInfo);
      console.log('insert alonzo tx:  ', txInfo);

      let txObj = {
        "tx_hash": tx.id,
        "tx_index": index  // index in the block
      }
      blockTxs.push(txObj);
    }

    return blockTxs;
  }

  async updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");

    let syncedBlockInfo = {
      "blockHeight": blockInfo.header.blockHeight,
      "blockHash": blockInfo.header.blockHash,
      "slot": blockInfo.header.slot,
      "hash": blockInfo.headerHash,
      "time": curBlockTimeStamp,
      "blockType": this.blockType,
      "blockTxs": blockTxs
    }

    let filter = {
      "blockHeight": blockInfo.header.blockHeight
    }
    let ret = await blockInfoDbObj.findByOption(filter);
    if (ret.length > 0) {
      await blockInfoDbObj.deleteByOption(filter);
    }
    // console.log('alonzo blockInfo:  ', syncedBlockInfo);
    await blockInfoDbObj.insert(syncedBlockInfo);

    console.log('[sync new alonzo block]', syncedBlockInfo);
  }

  async updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {

    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");

    let syncedData = {
      $set: {
        "blockHeight": blockInfo.header.blockHeight,
        "time": curBlockTimeStamp,
        "slot": blockInfo.header.slot,
        "hash": blockInfo.headerHash
      }
    }

    let filter = {
      "chainType": this.chainType
    }
    await syncedInfoDbObj.updateByOption(filter, syncedData);

    console.log('[sync new alonzo block]', syncedData);
  }
}

module.exports = AlonzoBlockHandler;
