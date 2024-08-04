const iWanClient = require('iwan-sdk');
const Mongoose = require('mongoose');
Schema = Mongoose.Schema;

const StorageService = require("../ogmiosService/services/storageservice/StorageService");
const StorageMongoDB = require("../ogmiosService/services/storageservice/StorageMongoDB");
const Log4UtilService = require('../ogmiosService/services/utilService/Log4UtilService');
const { sleep } = require('../ogmiosService/services/utilService/commonUtils');


const chainSyncSchema = {
	name: "chainSyncInfo",
	schema: {
		chainType: { type: String, index: true },
		time: { type: Number },
		slot: { type: Number },
		hash: { type: String },
		blockHeight: { type: Number }
	}
};

const txInfoSchema = {
	name: "txInfo",
	schema: {
		txId: { type: String, index: true },  //txId
		blockHeight: { type: Number, index: true } , // block height
		blockHash: { type: String } , // block hash
		slot: { type: Number, index: true },
		txIndex: { type: Number, index: true },  //tx index in block body
		time: { type: Number },  // block time stamp
		metaData: { type: Schema.Types.Mixed },  // tx meta data
		collaterals: { type: Array },  //tx collaterals input utxo
		inputs: { type: Array },  //tx input utxo
		outputs: { type: Array },  //tx output utxo
		mint: { type: Schema.Types.Mixed },
		redeemers: { type: Schema.Types.Mixed },  //tx redeemers
		fee: { type: String}, //tx redeemers
		inputSource: { type: String },
		// validityInterval: { type: Schema.Types.Mixed }
	}
};

let CardanoChainID = undefined;

class IWanInstance {

	constructor(apiKey, secretKey, bMainnet){
		//let apiClient = new iWanClient(YourApiKey, YourSecretKey);
		this.bMainnet = bMainnet;

		//Subject to https://iwan.wanchain.org
		let option = {
		    url: this.bMainnet? "api.wanchain.org" : "apitest.wanchain.org", // for mainnet use --> api.wanchain.org
		    port:8443,
		    flag:"ws",
		    version:"v3",
		    timeout:300000
		};
		this.apiClient = new iWanClient(apiKey, secretKey, option);	
	}
	
	async getTokenPairsInfo(){

		let options = this.bMainnet ? {tags: ["bridge", "bridgeBeta"]} : {isAllTokenPairs: true}
		console.log("options: ", options);
	
		try {
		//   let tokenPairIds = await this.apiClient.getTokenPairIDs();
		//   console.log("tokenPairs info: ", tokenPairIds.length);		  
		  let tokenPairs = await this.apiClient.getTokenPairs(options);
		  console.log("cardano related tokenPairs info: ", tokenPairs.length);

		  return tokenPairs;
		  
		} catch (err) {
		  console.log(err);
		}

		return undefined;
	}
	
	async getTokenPairInfoById(tokenPairId){
		let tokenPairInfo = undefined;
		try {
		  tokenPairInfo = await this.apiClient.getTokenPairInfo(tokenPairId);
		//   console.log("tokenPair Info: ", tokenPairInfo);
	
		} catch (err) {
		  console.log("getTokenPairInfoById failed: ", err);
		  return undefined;
		}
		return tokenPairInfo;
	}	
	
	async retrieveChainInfo(chainID){
		let reqOption = {
			"chainId": chainID
		}
	
		try {
		  let chainConstantInfo = await this.apiClient.getChainConstantInfo(reqOption);
		//   console.log("chain constant info: ", chainConstantInfo);

		  return chainConstantInfo;
		  
		} catch (err) {
		  console.log(err);
		}
	}

	async getSupportedChainInfo(){
		let mapChainID2Info = new Map();
	
		try {
			let supportedChainInfoArys = await this.apiClient.getSupportedChainInfo();
			// console.log("supported ChainI nfo: ", supportedChainInfoArys);

			for(let i=0; i<supportedChainInfoArys.length; i++){
				let tmpChainID = supportedChainInfoArys[i].chainID;
				let tmpChainSymbol = supportedChainInfoArys[i].chainSymbol;
				if('ADA' === tmpChainSymbol){
				  CardanoChainID = tmpChainID;
				}

				let chainAddressPrex = "0x";
				let crossScAddr = supportedChainInfoArys[i].crossScAddr;
				let multicallAddr = supportedChainInfoArys[i].multicallAddr;
				if((undefined === multicallAddr) || (undefined === crossScAddr)){
					chainAddressPrex = "";
					// console.log("chain ", tmpChainSymbol, "is not evm chain type, address is not takes 0x prefix");
				}

				let chainInfo = {
				  "chainSymbol": tmpChainSymbol,
				  "chainID": tmpChainID,
				  "addressPrex": chainAddressPrex
				}
				mapChainID2Info.set(tmpChainID, chainInfo);
			}
		  
		} catch (err) {
		  console.log(err);
		}

		return mapChainID2Info;
	}
	
}

class TxMetaDataRepairman {

	constructor(mongoUrl, iWanObj){
		
		this.dbUrl = mongoUrl;
		this.iWanInst = iWanObj;
	}

	async init(){
		this.storageService = new StorageService(this.dbUrl, StorageMongoDB);
		this.storageService.init();

		this.txInfoDbInst = await this.storageService.initDB(txInfoSchema);
		this.chainSyncDbInst = await this.storageService.initDB(chainSyncSchema);

		this.logUtilSrv= new Log4UtilService();
		this.logUtilSrv.init();
			
		this.mapChainID2Info = await this.iWanInst.getSupportedChainInfo();
		if(undefined === this.mapChainID2Info){
		  return false;
		}
		console.log("TxMetaDataRepairman...CardanoChainID: ", CardanoChainID);

		return true;
	}

	async filterTokenPairsRelatedWithCardano(){
		
		let validNftPolicyIds = new Array();
		let mapNftPolicyId = new Map();

		let tokenPairsInfo = await this.iWanInst.getTokenPairsInfo();
		console.log("filterTokenPairsRelatedWithCardano ret: ", tokenPairsInfo);	
		for(let i=0; i<tokenPairsInfo.length; i++){
			let tokenPair = tokenPairsInfo[i];
			if(CardanoChainID === tokenPair.fromChainID){

				if(tokenPair.fromAccountType === 'Erc20'){
					// cardanoRelatedTokenPairs.push(tokenPair);

					let s = tokenPair.fromAccount;
					if("0x0000000000000000000000000000000000000000" !== s){
						let strAssetUnit = Buffer.from(s.replace("0x",""),"hex").toString();
						console.log("cardano related TokenPair fromChain: ", i, tokenPair, strAssetUnit);
	
						let [strPolicyId, strName] = strAssetUnit.split(".");
						console.log("cardano policyId:  ", strPolicyId, strName);
						mapNftPolicyId.set(strPolicyId, true);
					}

				}


			}else if (CardanoChainID === tokenPair.toChainID) {
				if(tokenPair.toAccountType === 'Erc20'){
					// cardanoRelatedTokenPairs.push(tokenPair);

					let s = tokenPair.toAccount;
					if("0x0000000000000000000000000000000000000000" !== s){
						let strAssetUnit = Buffer.from(s.replace("0x",""),"hex").toString();
						console.log("cardano related TokenPair toChain: ", i, tokenPair, strAssetUnit);

						let [strPolicyId, strName] = strAssetUnit.split(".");
						console.log("cardano policyId:  ", strPolicyId, strName);
						mapNftPolicyId.set(strPolicyId, true);
					}
				}
			}
		}

		for(let policyId of mapNftPolicyId.keys()){
			validNftPolicyIds.push(policyId);
		}

		return validNftPolicyIds;
	}


	async parseAddressPrefix(tokenPairId){
		let tokenPairInfo = await this.iWanInst.getTokenPairInfoById(tokenPairId);
		console.log("parseAddressPrefix ret: ", tokenPairInfo);	
		if(undefined === tokenPairInfo){
		  return undefined;
		}
		
		let targetChainID = tokenPairInfo.toChainID;
		if(CardanoChainID === tokenPairInfo.toChainID){
		  // if to chain is cardano, then to check from chainID
		  targetChainID = tokenPairInfo.fromChainID;
		}
		console.log("parseAddressPrefix targetChainID: ", targetChainID);

		let chainInfo = await this.mapChainID2Info.get(targetChainID);
		console.log("parseAddressPrefix chainInfo: ", chainInfo);
		let addressPrex = chainInfo.addressPrex;

		console.log("parseAddressPrefix ret: ", addressPrex);	
		return addressPrex;
	}


	async adjustTxMetaData(targetBlockNo){

		let chainSyncedInfo = await this.chainSyncDbInst.findAllByOption({"chainType" : "ADA"});
		if(undefined === chainSyncedInfo){
			return false;
		}
		const latestBlockHeight = chainSyncedInfo[0].blockHeight;
		console.log("\n\n**********adjustTxMetaData: ", latestBlockHeight);

		do{
			if(latestBlockHeight < targetBlockNo){
				break;
			}

			let ret = await this.handleTxMetaDataRepairment(targetBlockNo);
			if(false === ret){
				this.logUtilSrv.logInfo("TxMetaDataRepairman", "...handleTxMetaDataRepairment..failed in block: ", targetBlockNo);
				break;
			}

			targetBlockNo++;

			sleep(200);

		}while(true);

		console.log("\n\n**********Tx MetaData Adjustment Work Has Been Done!");

	}

	async handleTxMetaDataRepairment(targetBlockNo){
		// this.logUtilSrv.logInfo("TxMetaDataRepairman", "...handleTxMetaDataRepairment..blockNo: ", targetBlockNo);
		console.log("...handleTxMetaDataRepairment..blockNo: ", targetBlockNo);

		let filterOption = {
			"blockHeight": targetBlockNo //10435163,
		}
		let txInfos = await this.txInfoDbInst.findAllByOption(filterOption);
		if (undefined === txInfos) {
			return false;
		}

		for (let i = 0; i < txInfos.length; i++) {
			let txMetaData = txInfos[i].metaData;
			let bChanged = false;

			if (undefined !== txMetaData) {

				let arysMetaData = txMetaData.metaData;
				for (let j = 0; j < arysMetaData.length; j++) {
					let jsonMetaData = arysMetaData[j].json_metadata;

					if (undefined !== jsonMetaData) {

						if ((undefined !== jsonMetaData.toAccount)
							&& ("string" === typeof (jsonMetaData.toAccount))) {
							console.log("filterCrossChainTx metaData: ", i, txInfos[i].txId);

							let tokenPairId = jsonMetaData.tokenPairID;
							let addressPrex = await this.parseAddressPrefix(tokenPairId);

							if ("" === addressPrex) {
								if (-1 !== jsonMetaData.toAccount.indexOf("0x")) {
									jsonMetaData.toAccount = jsonMetaData.toAccount.substring(2);

									bChanged = true;
									arysMetaData[j].json_metadata = jsonMetaData;
								}

							} else {
								if (-1 === jsonMetaData.toAccount.indexOf("0x")) {
									// console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);
									jsonMetaData.toAccount = addressPrex + jsonMetaData.toAccount;

									bChanged = true;
									arysMetaData[j].json_metadata = jsonMetaData;
								}
							}
						}

						if ((undefined !== jsonMetaData.uniqueId)
							&& ("string" === typeof (jsonMetaData.uniqueId))) {						
							console.log("filterCrossChainTx metaData: ", i, txInfos[i].txId);

							if (-1 === jsonMetaData.uniqueId.indexOf("0x")) {
								// console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);
								jsonMetaData.uniqueId = "0x" + jsonMetaData.uniqueId;

								bChanged = true;
								arysMetaData[j].json_metadata = jsonMetaData;
							}
						}
					}
				}
			}

			if(bChanged){
				let filter = {
					"txId": txInfos[i].txId
				}
				let setOption = {
					$set: {
						"metaData": txMetaData
					}
				}
				console.log("\n...parseMetadata...need to update tx MetaData: ", filter, setOption);

				await this.txInfoDbInst.updateByOption(filter, setOption);
				this.logUtilSrv.logInfo("TxMetaDataRepairman", "...metaData updated for txId: ", txInfos[i].txId);
			}
		}

	}

}


async function main(){
	let apiKey = "47f0102e75a41dccd836c849b0d16291e33522358ab8ba146cb17709161614b1";
	let secretKey = "b803eed271c927719a72e9e729bb016c8de2770896abbc84278549a2385c0572";	
	let iWanObj = new IWanInstance(apiKey, secretKey, true);


	let mongoUrl = "mongodb://127.0.0.1:27017/wanOgmiosService_maestroMainnet";
	let txRepairInst = new TxMetaDataRepairman(mongoUrl, iWanObj);
	let ret = await txRepairInst.init();
	if(false === ret){
		console.log("initial failed, try later again!!");
	}

	// let targetBlockNo = 10435163;
	// await txRepairInst.adjustTxMetaData(targetBlockNo);

	// let tokenPairID = 517; //505;
	// await txRepairInst.parseAddressPrefix(tokenPairID);

	let validNftPolicyIds = await txRepairInst.filterTokenPairsRelatedWithCardano();
	console.log("\n\n...get cardanoRelatedTokenPairs length: ", validNftPolicyIds);


}


main();
