const ServiceFramework = require("../../framework/ServiceFramework");
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const BigNumber = require('bignumber.js');
const {
    createInteractionContext,
    createLedgerStateQueryClient,
    createTransactionSubmissionClient,
    TxSubmission
} = require('@cardano-ogmios/client');

const {
    convertMaestroUtxoAmount,
    convertMaestroProtocolParams,
    convertMaestroEraSummariesInfo,
    convertMaestroGenesisConfig,
    convertMaestroRedeemers,
    convertMaestroEvaluateRet,
    convertMaestroUtxoScriptInfo,
    convertMaestroEvaluateRet4PlutusSdk
} = require("../utilService/commonUtils");

const UtxoStatus_SecurityConfirmFailed = -2;
const UtxoStatus_Consumed = -1;
const UtxoStatus_PendingAvailable = 0;
const UtxoStatus_Available = 1;

class CardanoServiceMaestroHandler {

    constructor() {
        console.log("\n\n\n... instance CardanoServiceMaestroHandler...");

        this.ogmiosAccessStatic = {
            "totalNum": 0,
            "successNum": 0,
            "failedNum": 0,
            "curTs": Date.now()/1000
        };
    }

    async init() {
        console.log("\n\n\n... init CardanoServiceMaestroHandler...");
        // to scan rp db records and to get the timeout rp
        this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
        this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
        this.securityConfirmSrv = ServiceFramework.getService("AgentServiceInterface", "SecurityConfirmService");

        let blockInfoSchema = await this.configService.getGlobalConfig("blockInfoSchema");
        this.blockInfoDbInst = await this.storageSrvIns.getDBIns(blockInfoSchema.name);

        let syncedDataSchema = await this.configService.getGlobalConfig("chainSyncSchema");
        this.blockHeightDbInst = await this.storageSrvIns.getDBIns(syncedDataSchema.name);

        let txInfoSchema = await this.configService.getGlobalConfig("txInfoSchema");
        this.txInfoDbInst = await this.storageSrvIns.getDBIns(txInfoSchema.name);

        let mintInfoSchema = await this.configService.getGlobalConfig("mintInfoSchema");
        this.mintInfoDbInst = await this.storageSrvIns.getDBIns(mintInfoSchema.name);

        let balancedCfgInfoSchema = await this.configService.getGlobalConfig("balancedCfgInfoSchema");
        this.balancedCfgInfoDbInst = await this.storageSrvIns.getDBIns(balancedCfgInfoSchema.name);

        let mappingTokenPolicyIdSchema = await this.configService.getGlobalConfig("mappingTokenPolicyIdSchema");
        this.policyIdDbInst = await this.storageSrvIns.getDBIns(mappingTokenPolicyIdSchema.name);

        this.treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");

        this.ogmiosServerConfig = await this.configService.getGlobalConfig("ogmiosServerCfg");
        await this.connectOgmiosNode();

        this.extraDelayBlockNum = 30;
    }

    byteArray2Hexstring(byteArray) {
        return Array.from(byteArray, function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
    }

    async reconnectOgmiosNode() {
        setTimeout(async () => {
            try {
                await this.connectOgmiosNode();
            } catch (error) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...reconnectOgmiosNode...error...", error);
                this.reconnectOgmiosNode();
            }
        }, 10000);
    }

    async connectOgmiosNode() {

        // ogmiosServerCfg:{
        //     host: "ogmios.wanchain.gomaestro-api.org",
        //     port: '',
        //     apiKey: "v0LXAjiRQAm3PNjlFSlqB8rfgUp7OExE"
        // }
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
                connection: connectionOption,
                interactionType: 'LongRunning'
            });


        this.queryClient = await createLedgerStateQueryClient(this.context);
        (await this.queryClient.networkTip()).slot;

        this.addSuccessOgmiosAccess();

        // tx submit client
        this.txSubmitClient = await createTransactionSubmissionClient(this.context);

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

    addSuccessOgmiosAccess() {
        this.ogmiosAccessStatic.successNum++;
        this.ogmiosAccessStatic.totalNum++;
        let curTs = Date.now() / 1000;
        if ((curTs - this.ogmiosAccessStatic.curTs) >= 600) {
            this.ogmiosAccessStatic.curTs = curTs;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...ogmiosAccessStatic:", this.ogmiosAccessStatic);
        }
    }

    addFailedOgmiosAccess() {
        this.ogmiosAccessStatic.failedNum++;
        this.ogmiosAccessStatic.totalNum++;
        let curTs = Date.now() / 1000;
        if ((curTs - this.ogmiosAccessStatic.curTs) >= 600) {
            this.ogmiosAccessStatic.curTs = curTs;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...ogmiosAccessStatic:", this.ogmiosAccessStatic);
        }
    }

    async handleGetUTXOsByPlutusSdk(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUTXOsByPlutusSdk...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        if ((undefined === reqOptions) || (undefined === reqOptions[0])) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...reqOptions is invalid: ", reqOptions);
            return undefined;
        }

        try {
            let txInAry = new Array();
            let txInItem = {
                "transaction": {
                    "id": reqOptions[0].txId,
                },
                "index": reqOptions[0].index
            };
            txInAry.push(txInItem);
            let utxoFilter = {
                "outputReferences": txInAry
            }

            let utxoObjs = await this.queryClient.utxo(utxoFilter);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUTXOsByPlutusSdk...length:", utxoObjs.length);

            this.addSuccessOgmiosAccess();

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                if (undefined === utxoItem) {
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...utxo data error: ", utxoItem);
                    return undefined;
                }
                let amounts = convertMaestroUtxoAmount(utxoItem.value);

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": convertMaestroUtxoScriptInfo(utxoItem.script)
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUTXOsByPlutusSdk...error: ", e);
            
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async handleGetUtxos(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        if ((undefined === reqOptions) || (undefined === reqOptions[0])) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...reqOptions is invalid: ", reqOptions);
            return undefined;
        }

        try {
            let txInAry = new Array();
            let txInItem = {
                "transaction": {
                    "id": reqOptions[0].txId,
                },
                "index": reqOptions[0].index
            };
            txInAry.push(txInItem);
            let utxoFilter = {
                "outputReferences": txInAry
            }

            let utxoObjs = await this.queryClient.utxo(utxoFilter);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...length:", utxoObjs.length);
            this.addSuccessOgmiosAccess();

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                if (undefined === utxoItem) {
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...utxo data error: ", utxoItem);
                    return undefined;
                }
                let amounts = convertMaestroUtxoAmount(utxoItem.value);

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": convertMaestroUtxoScriptInfo(utxoItem.script)
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...error: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async handleGetBalancedConfig(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetBalancedConfig...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let balancedCfgInfo = await this.balancedCfgInfoDbInst.findByOption(filter);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetBalancedConfig...", balancedCfgInfo);

            if (balancedCfgInfo.length > 0) {
                return balancedCfgInfo[0];
            }
            return undefined;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetBalancedConfig error...", e);
            return undefined;
        }
    }

    async getMintInfoByPolicyId(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMintInfoByPolicyId...", reqOptions);
        let safeBlockNum = (undefined === reqOptions.safeBlockNum) ? this.extraDelayBlockNum : reqOptions.safeBlockNum;

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };

            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - safeBlockNum;
            if (latestSafeBlockNo < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestSafeBlockNo);
                return undefined;
            }

            filter = {
                "tokenId": {
                    "$regex": reqOptions.policyId
                },
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                }
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMintInfoByPolicyId...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMintInfoByPolicyId error...", e);
            return undefined;
        }

    }

    async getNftMintInfo(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNftMintInfo...", reqOptions);
        let safeBlockNum = (undefined === reqOptions.safeBlockNum) ? this.extraDelayBlockNum : reqOptions.safeBlockNum;

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };

            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - safeBlockNum;
            if (latestSafeBlockNo < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestSafeBlockNo);
                return undefined;
            }

            let policyIdFilter = {
                "checkTokenType": 2 // 1: Non-NFT; 2: NFT
            };
            let ret = await this.policyIdDbInst.findByOption(policyIdFilter);
            if (undefined === ret) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...nft policyId is failed to get...");
                return undefined;
            }

            if((undefined === ret[0]) || (0 === ret[0].policyIds.length)){
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...nft policyIds is empty...");
                return undefined;
            }

            let nftPolicyIds = ret[0].policyIds;

            let checkTokenRegexOption = new Array();
            for (let i = 0; i < nftPolicyIds.length; i++) {
                let tmpRegex = eval("/^" + nftPolicyIds[i] + './');
                let tokenRegexItem = {
                    "tokenId": { $regex: tmpRegex }
                }
                checkTokenRegexOption.push(tokenRegexItem);
            }

            filter = {
                $or: checkTokenRegexOption,
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                }
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNftMintInfo...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNftMintInfo error...", e);
            return undefined;
        }

    }

    async getAssetMintInfo(reqOptions) {

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintInfo...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, reqOptions.endBlockNo);
                return undefined;
            }

            filter = {
                "tokenId": reqOptions.tokenId,
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                }
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintInfo...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintInfo error...", e);
            return undefined;
        }
    }

    async getAssetMintage(reqOptions) {

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage...", reqOptions);

        const maxDelayBlockNum = 10;
        let subFilter = {
            "tokenId": reqOptions.tokenId
        };
        let latestBlockPoint = await this.blockHeightDbInst.findByOption(subFilter);
        let maxRecordBlockId = latestBlockPoint[0].blockHeight - maxDelayBlockNum;
        if (0 >= maxRecordBlockId) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage...the latest block is less than 10: ", latestBlockPoint[0].blockHeight);
            return "0";
        }

        // get latest block height 
        try {
            let totalMintage = new BigNumber(0);
            let filter = {
                "tokenId": reqOptions.tokenId
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            for (let i = 0; i < assetMintRecords.length; i++) {
                let tmpRecord = assetMintRecords[i];
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...get asset mint record...", tmpRecord);
                if (tmpRecord.blockHeight > maxRecordBlockId) {
                    break;
                }

                let mintValue = new BigNumber(tmpRecord.mintValue);
                totalMintage = totalMintage.plus(mintValue);
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage...", reqOptions.tokenId, totalMintage.toString());
            return totalMintage.toString();

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage error...", e);
            return undefined;
        }

    }

    async getLatestBlock(reqOptions) {
        console.log("\n\n .....getLatestBlock reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getLatestBlock...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);

            let blockFilter = {
                "blockHeight": latestBlockPoint[0].blockHeight
            };
            let blockInfo = await this.blockInfoDbInst.findByOption(blockFilter);

            let blockObj = {
                "height": blockInfo[0].blockHeight,
                "hash": blockInfo[0].hash,
                "slot": blockInfo[0].slot,
                "time": blockInfo[0].time,
                "blockTxs": blockInfo[0].blockTxs
            }
            console.log("\n\n .....getLatestBlock : ", blockObj);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryRslt...", blockObj);
            return blockObj;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getLatestBlock error...", e);
            return undefined;
        }
    }

    async getBlockByNo(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockByNo...", reqOptions);
        let blockNo = reqOptions.blockNo;

        try {
            // get block by height 
            let blockFilter = {
                "blockHeight": blockNo
            };
            let blockInfo = await this.blockInfoDbInst.findByOption(blockFilter);

            let blockObj = {
                "height": blockInfo[0].blockHeight,
                "hash": blockInfo[0].hash,
                "slot": blockInfo[0].slot,
                "time": blockInfo[0].time,
                "blockTxs": blockInfo[0].blockTxs
            }
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryRslt...", blockObj);
            return blockObj;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockByNo error...", e);
            return undefined;
        }
    }

    async checkUtxoAvailable(reqOptions) {
        console.log("\n\n .....checkUtxoAvailable: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...", reqOptions);
        const txId = reqOptions.txId;
        const txIndex = reqOptions.index;
        const validSlot = reqOptions.slot;

        try {
            // step 1: to check block if in safe scope
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - this.extraDelayBlockNum;

            let blockFilter = {
                "blockHeight": latestSafeBlockNo
            };
            let blockInfo = await this.blockInfoDbInst.findByOption(blockFilter);
            if (blockInfo[0].slot < validSlot) {
                return UtxoStatus_PendingAvailable;
            }

            // step 2: to check utxo if has been used
            let txInAry = new Array();
            let txInItem = {
                "transaction": {
                    "id": txId,
                },
                "index": txIndex
            };
            txInAry.push(txInItem);
            let utxoFilter = {
                "outputReferences": txInAry
            }
            console.log("\n\n .....queryClient utxoFilter: ", utxoFilter);
            // TODO: to check get utxo by txId 
            // to query utxo on-chain 
            let rets = await this.queryClient.utxo(utxoFilter);
            console.log("\n\n .....queryClient rets: ", rets);
            this.addSuccessOgmiosAccess();

            for (let ipId = 0; ipId < rets.length; i++) {
                let retUtxoObj = rets[ipId];

                let addressAry = new Array();
                addressAry.push(retUtxoObj.address);
                let filter = {
                    "addresses": addressAry
                }
                let utxoObjs = await this.queryClient.utxo(filter);
                this.addSuccessOgmiosAccess();
                
                for (let i = 0; i < utxoObjs.length; i++) {
                    let utxoItem = utxoObjs[i];

                    if ((txId === utxoItem.transaction.id) && (txIndex === utxoItem.index)) {
                        let secCheckRet = await this.securityConfirmSrv.confirmUtxoSecurity(utxoItem.address, txId, txIndex);
                        if (false === secCheckRet) {
                            return undefined;
                        }
                        return UtxoStatus_Available;
                    }
                }
            }

            // this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...", consumedTxs);
            return UtxoStatus_Consumed;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable error...", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getUtxoConsumedTx(reqOptions) {
        console.log("\n\n .....getUtxoConsumedTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoConsumedTx...", reqOptions);
        let txId = reqOptions.txId;
        let txIndex = reqOptions.index;
        // ({"inputs":{$in:[{"tx_hash" : "7357dfa9e9460afa3c3eefceb7e8a180debed771887132de8b2e553389cae100", "tx_index" : 1 }]}})

        try {
            let utxosAry = new Array();
            utxosAry.push({
                "tx_hash": txId,
                "tx_index": txIndex
            });
            let filter = {
                "inputs": { $in: utxosAry }
            }
            let consumedTxs = await this.txInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoConsumedTx...", consumedTxs);
            return consumedTxs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoConsumedTx error...", e);
            return undefined;
        }
    }

    async getNFTTreasuryTxsByBlockNo(reqOptions) {
        console.log("\n\n .....getNFTTreasuryTxsByBlockNo: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let maxPageTxNum = 100;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
                return undefined;
            }

            let txs = new Array();
            let bContinue = true;
            let loopBeginBlockNo = fromBlockNo;
            let loopEndBlockNo = fromBlockNo + maxPageTxNum;
            do {
                if (loopEndBlockNo >= toBlockNo) {
                    loopEndBlockNo = toBlockNo;
                }

                // get block by height 
                let bFilter = {
                    "blockHeight": {
                        "$gte": loopBeginBlockNo,
                        "$lte": loopEndBlockNo
                    }
                }
                let blockObjs = await this.blockInfoDbInst.findAllByOption(bFilter);
                console.log("\n\n .....getNFTTreasuryTxsByBlockNo blockObjs: ", blockObjs.length);

                for (let i = 0; i < blockObjs.length; i++) {

                    let subTxs = blockObjs[i].blockTxs;
                    for (let j = 0; j < subTxs.length; j++) {

                        let bNftTreasuryRelateTx = subTxs[j].nftTreasury_related;
                        let bSecurityConfirmed = subTxs[j].security_Confirmed;
                        console.log("\n\n .....getNFTTreasuryTxsByBlockNo tx: ", blockObjs[i].blockHeight, j, subTxs[j]);
                        if (bNftTreasuryRelateTx) {
                            if (!bSecurityConfirmed) {
                                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo with unconfirmed treasury tx: ", blockObjs[i].blockHeight);
                                return undefined;
                            }

                            let txObj = {
                                "tx_hash": subTxs[j].tx_hash,
                                "tx_index": subTxs[j].tx_index,
                                "block_height": blockObjs[i].blockHeight,
                                "block_time": blockObjs[i].time
                            }
                            txs.push(txObj);
                        }
                    }
                }

                loopBeginBlockNo = loopEndBlockNo + 1;
                if (loopBeginBlockNo > toBlockNo) {
                    bContinue = false;
                } else {
                    loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                }

            } while (bContinue);


            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo...", txs);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo error...", e);
            return undefined;
        }
    }

    async getTreasuryTxsByBlockNo(reqOptions) {
        console.log("\n\n .....getTreasuryTxsByBlockNo: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let maxPageTxNum = 100;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
                return undefined;
            }

            let txs = new Array();
            let bContinue = true;
            let loopBeginBlockNo = fromBlockNo;
            let loopEndBlockNo = fromBlockNo + maxPageTxNum;
            do {
                if (loopEndBlockNo >= toBlockNo) {
                    loopEndBlockNo = toBlockNo;
                }

                // get block by height 
                let bFilter = {
                    "blockHeight": {
                        "$gte": loopBeginBlockNo,
                        "$lte": loopEndBlockNo
                    }
                }
                let blockObjs = await this.blockInfoDbInst.findAllByOption(bFilter);
                console.log("\n\n .....getTreasuryTxsByBlockNo blockObjs: ", blockObjs.length);

                for (let i = 0; i < blockObjs.length; i++) {

                    let subTxs = blockObjs[i].blockTxs;
                    for (let j = 0; j < subTxs.length; j++) {

                        let bTreasuryRelateTx = subTxs[j].treasury_related;
                        let bSecurityConfirmed = subTxs[j].security_Confirmed;
                        console.log("\n\n .....getTreasuryTxsByBlockNo tx: ", blockObjs[i].blockHeight, j, subTxs[j]);
                        if (bTreasuryRelateTx) {
                            if (!bSecurityConfirmed) {
                                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo with unconfirmed treasury tx: ", blockObjs[i].blockHeight);
                                return undefined;
                            }

                            let txObj = {
                                "tx_hash": subTxs[j].tx_hash,
                                "tx_index": subTxs[j].tx_index,
                                "block_height": blockObjs[i].blockHeight,
                                "block_time": blockObjs[i].time
                            }
                            txs.push(txObj);
                        }
                    }
                }

                loopBeginBlockNo = loopEndBlockNo + 1;
                if (loopBeginBlockNo > toBlockNo) {
                    bContinue = false;
                } else {
                    loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                }

            } while (bContinue);


            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo...", txs);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo error...", e);
            return undefined;
        }
    }

    async getTxsByBlockHeight(reqOptions) {
        console.log("\n\n .....getTxsByBlockHeight: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByBlockHeight...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let targetAddress = reqOptions.address;
        let maxPageTxNum = 50;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
                return undefined;
            }

            let txs = new Array();
            let bContinue = true;
            let loopBeginBlockNo = fromBlockNo;
            let loopEndBlockNo = fromBlockNo + maxPageTxNum;

            do {
                if (loopEndBlockNo >= toBlockNo) {
                    loopEndBlockNo = toBlockNo;
                }
                console.log("\n\n from block: ", loopBeginBlockNo, "...to: ", loopEndBlockNo);

                // to get the tx of this block 
                let txFilter = {
                    "blockHeight": {
                        "$gte": loopBeginBlockNo,
                        "$lte": loopEndBlockNo
                    }
                }
                let txObjs = await this.txInfoDbInst.findAllByOption(txFilter);
                if (0 === txObjs.length) {
                    loopBeginBlockNo = loopEndBlockNo + 1;
                    if (loopBeginBlockNo > toBlockNo) {
                        bContinue = false;
                    } else {
                        loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                    }
                    continue;
                }
                console.log("txObjs: ", txObjs.length);

                for (let id = 0; id < txObjs.length; id++) {
                    console.log("\n txObjs: ", txObjs[id].txId, txObjs[id].blockHeight);
                    let bMatched = false;

                    // to check if filter by array attribution
                    for (let op = 0; op < txObjs[id].outputs.length; op++) {
                        let outputObj = txObjs[id].outputs[op];
                        console.log("targetAddress: ", targetAddress, "...outputObj.address:", outputObj.address);
                        if (outputObj.address === targetAddress) {

                            console.log("matched retlated tx: ", txObjs[id]);
                            let txObj = {
                                "tx_hash": txObjs[id].txId,
                                "tx_index": txObjs[id].txIndex,
                                "block_height": txObjs[id].blockHeight,
                                "block_time": txObjs[id].time
                            }
                            txs.push(txObj);
                            console.log("retlated tx: ", op, txs);

                            bMatched = true;
                            break;
                        }
                    }

                    if (!bMatched) {

                        let txInputs = ("inputs" === txObjs[id].inputSource ? txObjs[id].inputs : txObjs[id].collaterals);
                        for (let ip = 0; ip < txInputs.length; ip++) {
                            // to check the sender of this tx
                            let inputTxId = txInputs[ip].tx_hash;
                            let inputTxIndex = txInputs[ip].tx_index;
                            let inputTxFilter = {
                                "txId": inputTxId
                            }
                            let inputTxObjs = await this.txInfoDbInst.findByOption(inputTxFilter);
                            if (undefined === inputTxObjs[0]) {
                                continue;
                            }

                            // console.log("inputTxObjs: ", ip, inputTxId, inputTxIndex, inputTxObjs);
                            let utxoObj = inputTxObjs[0].outputs[inputTxIndex];
                            console.log("inputTxObjs utxoObj.address: ", utxoObj.address);
                            if (utxoObj.address === targetAddress) {
                                let txObj = {
                                    "tx_hash": txObjs[id].txId,
                                    "tx_index": txObjs[id].txIndex,
                                    "block_height": txObjs[id].blockHeight,
                                    "block_time": txObjs[id].time
                                }
                                txs.push(txObj);
                                console.log("retlated tx: ", ip, txs);
                                break;
                            }
                        }
                    }
                }

                loopBeginBlockNo = loopEndBlockNo + 1;
                if (loopBeginBlockNo > toBlockNo) {
                    bContinue = false;
                } else {
                    loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                }
                console.log("next phase: ", loopBeginBlockNo, txs.length);

            } while (bContinue);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByBlockHeight...", txs);
            console.log("\n\n total retlated tx: ", txs.length);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByBlockHeight error...", e);
            return undefined;
        }
    }

    async getAddressUtxosWithBlockHeight(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAddressUtxosWithBlockHeight...", reqOptions);
        let address = reqOptions.address;
        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {
            let addressAry = new Array();
            addressAry.push(address);
            let filter = {
                "addresses": addressAry
            }
            let utxoObjs = await this.queryClient.utxo(filter);
            this.addSuccessOgmiosAccess();
            // console.log("\n\n .....utxoObjs: ", utxoObjs);

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];

                if (bCheckDatum && (!utxoItem.datum)) {
                    continue;
                }

                let amounts = convertMaestroUtxoAmount(utxoItem.value);

                let txFilter = {
                    "txId": utxoItem.transaction.id
                }
                console.log("CardanoServiceMaestroHandler...getAddressUtxosWithBlockHeight...txFilter: ", txFilter);
                let txInfo = await this.txInfoDbInst.findByOption(txFilter);
                console.log("CardanoServiceMaestroHandler...getAddressUtxosWithBlockHeight...txInfo: ", txInfo);

                let blockHeight = (0 < txInfo.length) ? txInfo[0].blockHeight : undefined;

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": convertMaestroUtxoScriptInfo(utxoItem.script),
                    "blockHeight": blockHeight
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            return undefined;
        }

    }

    async getUtxosByAddress(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxosByAddress...", reqOptions);
        let address = reqOptions.address;

        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {
            let addressAry = new Array();
            addressAry.push(address);
            let filter = {
                "addresses": addressAry
            }
            let utxoObjs = await this.queryClient.utxo(filter);
            console.log("\n\n .....utxoObjs: ", utxoObjs);
            this.addSuccessOgmiosAccess();

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];

                if (bCheckDatum && (!utxoItem.datum)) {
                    continue;
                }

                let amounts = convertMaestroUtxoAmount(utxoItem.value);

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": convertMaestroUtxoScriptInfo(utxoItem.script)
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...query utxo error...", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async queryGenesisConfig(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryGenesisConfig...", reqOptions);

        // get genesis config 
        try {
            let maestroGenesisConfig = await this.queryClient.genesisConfiguration('shelley');
            let genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
            genesisConfig.maxLovelaceSupply = undefined;

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryGenesisConfig...", genesisConfig);
            this.addSuccessOgmiosAccess();
            return genesisConfig;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryGenesisConfig error...", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async queryEraSummaries(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryEraSummaries...", reqOptions);

        // get query eraSummaries 
        try {
            let maestroEraSummaries = await this.queryClient.eraSummaries();
            let eraSummaries = convertMaestroEraSummariesInfo(maestroEraSummaries);

            this.addSuccessOgmiosAccess();
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryEraSummaries...", eraSummaries);
            return eraSummaries;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryEraSummaries error...", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getBalanceByAddress(reqOptions) {
        console.log("\n\n .....getBalanceByAddress: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBalanceByAddress...", reqOptions);
        let address = reqOptions.address;

        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {
            let addressAry = new Array();
            addressAry.push(address);
            let filter = {
                "addresses": addressAry
            }
            console.log("\n\n .....getBalanceByAddress filter: ", filter);
            let utxoObjs = await this.queryClient.utxo(filter);
            console.log("\n\n .....utxoObjs: ", utxoObjs);
            this.addSuccessOgmiosAccess();

            let assetBalanceArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                console.log("\n\n .....utxo item: ", utxoItem);
                if (bCheckDatum && (!utxoItem.datum)) {
                    continue;
                }

                let assetsValue = utxoItem.value;
                for (let key in assetsValue) {
                    let policyTokens = assetsValue[key];
                    let adaAmountArray = new Array();
                    let bTokenAsset = false;

                    if ("ada" === key) {
                        let adaAmountObj = {
                            "unit": "lovelace",
                            "quantity": policyTokens["lovelace"].toString()
                        }
                        adaAmountArray.push(adaAmountObj);
                        console.log("..add asset: ", adaAmountObj);

                    } else {
                        bTokenAsset = true;
                        let policyId = key;

                        for (let name in policyTokens) {
                            let tokenName = policyId + "." + name;
                            let tokenAmount = policyTokens[name];
                            console.log("token unit: ", tokenName);
                            console.log("token amunt: ", tokenAmount.toString());

                            let matchedIndex = undefined;
                            for (let index = 0; index < assetBalanceArray.length; index++) {
                                let assetItem = assetBalanceArray[index];
                                if (tokenName === assetItem.unit) {
                                    matchedIndex = index;
                                    break;
                                }
                            }

                            if (undefined === matchedIndex) {
                                let tokenAmountObj = {
                                    "unit": tokenName,
                                    "quantity": tokenAmount.toString()
                                }
                                assetBalanceArray.push(tokenAmountObj);

                            } else {
                                let savedAssetAmount = assetBalanceArray[matchedIndex].quantity;
                                console.log("\n..savedAssetAmount: ", tokenName, savedAssetAmount);

                                let curAmount = new BigNumber(tokenAmount);
                                let preAmount = new BigNumber(savedAssetAmount);
                                let totalAmount = preAmount.plus(curAmount);
                                console.log("..updated AssetAmount: ", tokenName, totalAmount.toString());

                                assetBalanceArray[matchedIndex].quantity = totalAmount.toString();

                            }
                        }
                    }

                    if (!bTokenAsset) {

                        let curAmount = new BigNumber("0");
                        for (let i = 0; i < adaAmountArray.length; i++) {
                            let itemAmount = new BigNumber(adaAmountArray[i].quantity);
                            curAmount = curAmount.plus(itemAmount);
                        }

                        let matchedIndex = undefined;
                        for (let index = 0; index < assetBalanceArray.length; index++) {
                            let assetItem = assetBalanceArray[index];
                            if ("lovelace" === assetItem.unit) {
                                matchedIndex = index;
                                break;
                            }
                        }

                        if (undefined === matchedIndex) {
                            let adaAmountObj = {
                                "unit": "lovelace",
                                "quantity": curAmount.toString()
                            }
                            assetBalanceArray.push(adaAmountObj);

                        } else {
                            let preAmount = new BigNumber(assetBalanceArray[matchedIndex].quantity);
                            let totalAmount = preAmount.plus(curAmount);

                            assetBalanceArray[matchedIndex].quantity = totalAmount.toString();
                        }
                    }
                }
            }


            return assetBalanceArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getChainTip(reqOptions) {
        console.log("\n\n .....getChainTip reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTip...", reqOptions);

        // get latest block height 
        try {
            let chainTip = await this.queryClient.networkTip();
            chainTip.hash = chainTip.id;
            console.log("\n\n .....getChainTip chainTip: ", chainTip);

            this.addSuccessOgmiosAccess();
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTip...", chainTip);
            return chainTip;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTip error...", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getCostModelParameters(reqOptions) {
        console.log("\n\n .....:getCostModelParameters ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCostModelParameters...", reqOptions);

        // get latest block height 
        try {
            let maestroProtocolParams = await this.queryClient.protocolParameters();
            let curProtocalParams = convertMaestroProtocolParams(maestroProtocolParams);
            console.log("\n\ncurProtocalParams: ", curProtocalParams);

            this.addSuccessOgmiosAccess();
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCostModelParameters...", curProtocalParams);
            return curProtocalParams;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCostModelParameters error...", e);
            console.log("getCostModelParameters error: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getCurProtocolParameters(reqOptions) {
        // console.log("\n\n .....getCurProtocolParameters: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCurProtocolParameters...", reqOptions);

        try {
            let maestroProtocolParams = await this.queryClient.protocolParameters();
            let protocolParams = convertMaestroProtocolParams(maestroProtocolParams);
            console.log('protocolParams:', protocolParams);
            this.addSuccessOgmiosAccess();

            // this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...currentProtocolParameters...", protocolParams);
            let maestroGenesisConfig = await this.queryClient.genesisConfiguration('shelley');
            let genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
            console.log('genesisConfig:', genesisConfig.protocolParameters);
            console.log('protocolParams:', protocolParams);
            this.addSuccessOgmiosAccess();

            let epochsParams = {
                "min_fee_a": JSON.stringify(protocolParams.minFeeCoefficient),
                "min_fee_b": JSON.stringify(protocolParams.minFeeConstant),
                "min_utxo": JSON.stringify(genesisConfig.protocolParameters.minUtxoValue),//?? protocolParams.,
                "coins_per_utxo_word": JSON.stringify(protocolParams.coinsPerUtxoByte * 2),
                "coins_per_utxo_byte": JSON.stringify(protocolParams.coinsPerUtxoByte),
                "price_mem": JSON.stringify(protocolParams.prices.memory),
                "price_step": JSON.stringify(protocolParams.prices.steps),
                "collateral_percent": JSON.stringify(protocolParams.collateralPercentage),
                "max_collateral_inputs": JSON.stringify(protocolParams.maxCollateralInputs),
                "pool_deposit": JSON.stringify(protocolParams.poolDeposit),
                "key_deposit": JSON.stringify(protocolParams.stakeKeyDeposit),
                "max_tx_size": JSON.stringify(protocolParams.maxTxSize),
                "max_val_size": JSON.stringify(protocolParams.maxValueSize),
            }
            return epochsParams;

        } catch (e) {
            console.log("query getCurProtocolParameters exception: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async submitTx(reqOptions) {
        console.log("\n\n .....submitTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...", reqOptions.rawTx);

        try {

            let ret = await this.txSubmitClient.submitTransaction(reqOptions.rawTx);
            this.addSuccessOgmiosAccess();

            if(undefined !== ret.transaction){
                console.log("submitTx ret: ", ret);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...", ret);
                return ret.transaction.id;
            }

            console.log("submitTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...failed:", error);
            console.log("submitTx failed: ", error);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async evaluateTx(reqOptions) {
        console.log("\n\n .....evaluateTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...", reqOptions.rawTx);

        try {
            let maestroRet = await this.txSubmitClient.evaluateTransaction(reqOptions.rawTx);
            let ret = convertMaestroEvaluateRet(maestroRet);

            this.addSuccessOgmiosAccess();
            console.log("evaluateTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...failed:", error);
            console.log("evaluateTx failed: ", error);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    deriveAddress(reqOptions) {
        console.log("\n\n .....deriveAddress: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...deriveAddress...", reqOptions);

        let publicKey = reqOptions.publicKey;
        let addressIndex = reqOptions.addressIndex;
        let type = reqOptions.type;
        let isTestnet = reqOptions.isTestnet;

        const accountKey = CardanoWasm.Bip32PublicKey.from_bytes(Buffer.from(publicKey, 'hex'));
        const utxoPubKey = accountKey.derive(type).derive(addressIndex);
        const stakeKey = accountKey.derive(2).derive(0);

        const networkId = isTestnet
            ? CardanoWasm.NetworkInfo.testnet().network_id()
            : CardanoWasm.NetworkInfo.mainnet().network_id();

        const baseAddr = CardanoWasm.BaseAddress.new(networkId,
            CardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
            CardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()));

        let strPrefix = isTestnet ? "addr_test" : "addr";
        return {
            address: baseAddr.to_address().to_bech32(strPrefix),
            path: `m/1852'/1815'/0'/${type}/${addressIndex}`,
        };
    }

    async getTxRedeemers(reqOptions) {
        console.log("\n\n .....getTxRedeemers: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxRedeemers...", reqOptions);
        let txId = reqOptions.txId;
        let txRedeemers = undefined;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);

            for (let i = 0; i < txObjs.length; i++) {
                txRedeemers = txObjs[i].redeemers;
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxRedeemers...", txRedeemers);
            return txRedeemers;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxRedeemers error...", e);
            return undefined;
        }
    }

    async getTxsMetadata(reqOptions) {
        console.log("\n\n .....getTxsMetadata: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsMetadata...", reqOptions);
        let txId = reqOptions.txId;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            // console.log("\n\n .....getTxsMetadata txObjs: ", txObjs);

            let metaDataAry = new Array();
            for (let i = 0; i < txObjs.length; i++) {
                let txMetaDataObjs = txObjs[i].metaData.metaData;
                for (let j = 0; j < txMetaDataObjs.length; j++) {
                    metaDataAry.push(txMetaDataObjs[j]);
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsMetadata...", metaDataAry);
            return metaDataAry;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsMetadata error...", e);
            return undefined;
        }
    }

    async getTxUtxos(reqOptions) {
        console.log("\n\n .....getTxsUtxos: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsUtxos...", reqOptions);
        let txId = reqOptions.txId;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getTxsUtxos txObjs: ", txObjs.length);

            let txUtxoObject = undefined;
            for (let i = 0; i < txObjs.length; i++) {
                // to get input utxo
                let subInputsAry = new Array();
                let txInputs = ("inputs" === txObjs[i].inputSource) ? txObjs[i].inputs : txObjs[i].collaterals;
                console.log("\n\n .....getTxsUtxos: ", reqOptions);
                for (let inIndex = 0; inIndex < txInputs.length; inIndex++) {
                    let inputObj = txInputs[inIndex];
                    let txFilter = {
                        "txId": inputObj.tx_hash
                    }
                    let txObjs = await this.txInfoDbInst.findByOption(txFilter);

                    let utxo_address = undefined;
                    let utxo_amount = undefined;
                    if (undefined !== txObjs[0]) {
                        let utxoObj = txObjs[0].outputs[inputObj.tx_index];
                        utxo_address = utxoObj.address;
                        utxo_amount = utxoObj.amount;
                    }

                    let subInputObj = {
                        "address": utxo_address,
                        "amount": utxo_amount,
                        "tx_hash": inputObj.tx_hash,
                        "output_index": inputObj.tx_index,
                        "data_hash": ""
                    }
                    subInputsAry.push(subInputObj);
                }

                // to get output utxo
                let subOutputsAry = new Array();

                /*let outputs = new Array();
                let outputLen = txObjs[i].outputs.length;
                if("inputs" === txObjs[i].inputSource){
                    for (let index = 0; index < (outputLen-1); index++) {
                        let item = txObjs[i].outputs[index];
                        outputs.push(item);
                    }
                }else{
                    let collateralOutput = txObjs[i].outputs[outputLen-1];
                    outputs.push(collateralOutput);
                }*/

                let outputs = txObjs[i].outputs;
                for (let outIndex = 0; outIndex < outputs.length; outIndex++) {
                    let outputObj = outputs[outIndex];
                    let subOutObj = {
                        "address": outputObj.address,
                        "amount": outputObj.amount,
                        "output_index": outIndex,
                        "data_hash": outputObj.datum,
                        "datumHash": outputObj.datumHash,
                        "script": convertMaestroUtxoScriptInfo(outputObj.script)
                    }
                    subOutputsAry.push(subOutObj);
                }

                txUtxoObject = {
                    "hash": txId,
                    "inputs": subInputsAry,
                    "outputs": subOutputsAry
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsUtxos...", txUtxoObject);
            return txUtxoObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsUtxos error...", e);
            return undefined;
        }
    }

    async getTxInfoById(reqOptions) {
        console.log("\n\n .....getTxInfoById: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById...", reqOptions);
        let txId = reqOptions.txId;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getTxInfoById txObjs: ", txObjs.length);

            let txObject = undefined;
            for (let i = 0; i < txObjs.length; i++) {
                txObject = {
                    "hash": txId,
                    "block_height": txObjs[i].blockHeight,
                    "block": txObjs[i].blockHash,
                    "index": txObjs[i].txIndex,
                    "block_time": txObjs[i].time,
                    "mint": txObjs[i].mint,
                    "redeemers": txObjs[i].redeemers,
                    "inputSource": txObjs[i].inputSource,
                    "fee": txObjs[i].fee
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById...", txObject);
            return txObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById error...", e);
            return undefined;
        }
    }

    async getTxsByLabel(reqOptions) {
        console.log("\n\n .....getTxsByLabel: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByLabel...", reqOptions);
        let label = reqOptions.label;
        let from = reqOptions.from;
        let to = reqOptions.to;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < to) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, to);
                return undefined;
            }

            filter = {
                "metaData.metaData.label": label,
                "blockHeight": { "$gte": from, "$lte": to }
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getTxsByLabel txObjs: ", txObjs.length);

            let txObjectAry = new Array();
            for (let i = 0; i < txObjs.length; i++) {
                let txObj = txObjs[i];

                for (let j = 0; j < txObj.metaData.metaData.length; j++) {
                    let metaData = txObj.metaData.metaData[j];
                    if (label === metaData.label) {
                        let txObject = {
                            "tx_hash": txObj.txId,
                            "json_metadata": metaData.json_metadata
                        }

                        txObjectAry.push(txObject);
                    }
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById...", txObjectAry);
            return txObjectAry;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById error...", e);
            return undefined;
        }

    }

    async getUtxoByTxIndex(reqOptions) {
        console.log("\n\n .....getUtxoByTxIndex: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoByTxIndex...", reqOptions);
        let txId = reqOptions.txId;
        let index = reqOptions.index;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getUtxoByTxIndex txObjs: ", txObjs.length);

            let utxoObject = undefined;
            for (let i = 0; i < txObjs.length; i++) {

                // to get output utxo
                let outputs = txObjs[i].outputs;
                for (let outIndex = 0; outIndex < outputs.length; outIndex++) {

                    if (index === outIndex) {
                        let outputObj = outputs[outIndex];

                        utxoObject = {
                            "address": outputObj.address,
                            "amount": outputObj.amount,
                            "output_index": outIndex,
                            "data_hash": outputObj.datum,
                            "datumHash": outputObj.datumHash,
                            "script": convertMaestroUtxoScriptInfo(outputObj.script)
                        }

                        break;
                    }
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoByTxIndex...", utxoObject);
            return utxoObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoByTxIndex error...", e);
            return undefined;
        }
    }

    /////////////////////////////////////////
    //apis for plutus sdk
    /////////////////////////////////////////
    async getUTXOsByPlutusSdk(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUTXOsByPlutusSdk...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        if ((undefined === reqOptions) || (undefined === reqOptions[0])) {
            return undefined;
        }

        try {

            let filter = undefined;
            if (undefined === reqOptions[0].txId) {
                filter = {
                    "addresses": reqOptions
                }

            } else {
                let txInAry = new Array();
                for (let i = 0; i < reqOptions.length; i++) {
                    let txInItem = {
                        "transaction": {
                            "id": reqOptions[i].txId,
                        },
                        "index": reqOptions[i].index
                    };
                    txInAry.push(txInItem);
                }
                filter = {
                    "outputReferences": txInAry
                }
            }
            console.log("\n\n .....getBalanceByAddress filter: ", filter);

            let ret = await this.queryClient.utxo(filter);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUTXOsByPlutusSdk...length:", ret.length);
            this.addSuccessOgmiosAccess();

            let utxoObjs = new Array();
            for (let i = 0; i < ret.length; i++) {
                let utxoItem = ret[i];

                let script = convertMaestroUtxoScriptInfo(utxoItem.script);
                let formatedValueAry = convertMaestroUtxoAmount(utxoItem.value);

                let utxoValue = {
                    "coins": new BigNumber("0"),
                    "assets": {}
                };
                for (let j = 0; j < formatedValueAry.length; j++) {
                    let valueItem = formatedValueAry[j];
                    if ("lovelace" === valueItem.unit) {
                        let curAmount = new BigNumber(utxoValue.coins.toString());
                        let preAmount = new BigNumber(valueItem.quantity);
                        utxoValue.coins = preAmount.plus(curAmount);

                    } else {
                        let tokenAmount = utxoValue.assets[valueItem.unit];
                        if (undefined === tokenAmount) {
                            tokenAmount = new BigNumber("0");
                        }
                        let curAmount = new BigNumber(tokenAmount.toString());
                        let preAmount = new BigNumber(valueItem.quantity);
                        let updatedAmount = preAmount.plus(curAmount);

                        utxoValue.assets[valueItem.unit] = updatedAmount;
                    }
                }

                let utxoInput = {
                    "txId": utxoItem.transaction.id,
                    "index": utxoItem.index
                };

                let utxoOutput = {
                    "address": utxoItem.address,
                    "value": utxoValue,
                    "datumHash": utxoItem.datumHash,
                    "datum": utxoItem.datum,
                    "script": script
                };

                let utxoObj = new Array();
                utxoObj.push(utxoInput);
                utxoObj.push(utxoOutput);

                utxoObjs.push(utxoObj);
            }

            return utxoObjs;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUTXOsByPlutusSdk...error: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async submitTxByPlutusSdk(reqOptions) {
        console.log("\n\n .....submitTxByPlutusSdk: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTxByPlutusSdk...", reqOptions);

        try {

            let ret = await this.txSubmitClient.submitTransaction(reqOptions);
            this.addSuccessOgmiosAccess();

            if(undefined !== ret.transaction){
                console.log("submitTxByPlutusSdk ret: ", ret);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTxByPlutusSdk...", ret);
                return ret.transaction.id;
            } 

            console.log("submitTxByPlutusSdk ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTxByPlutusSdk...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTxByPlutusSdk...failed:", error);
            console.log("submitTxByPlutusSdk failed: ", error);
            this.addFailedOgmiosAccess();

            return error;
        }
    }

    async evaluateTxByPlutusSdk(reqOptions) {
        console.log("\n\n .....evaluateTxByPlutusSdk: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...", reqOptions.rawTx);

        try {
            let maestroRet = await this.txSubmitClient.evaluateTransaction(reqOptions);
            this.addSuccessOgmiosAccess();

            let ret = convertMaestroEvaluateRet4PlutusSdk(maestroRet);
            console.log("evaluateTxByPlutusSdk ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...failed:", error);
            console.log("evaluateTxByPlutusSdk failed: ", error);
            this.addFailedOgmiosAccess();

            return undefined;
        }
    }

    async getChainTipByPlutusSdk(reqOptions) {
        console.log("\n\n .....getChainTipByPlutusSdk reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTipByPlutusSdk...", reqOptions);

        // get latest block height 
        try {
            let chainTip = await this.queryClient.networkTip();
            chainTip.hash = chainTip.id;
            console.log("\n\n .....getChainTipByPlutusSdk chainTip: ", chainTip);
            this.addSuccessOgmiosAccess();

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTipByPlutusSdk...", chainTip);
            return chainTip;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTipByPlutusSdk error...", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

    async getCurProtocolParametersByPlutusSdk(reqOptions) {
        console.log("\n\n .....:getCurProtocolParametersByPlutusSdk ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCurProtocolParametersByPlutusSdk...", reqOptions);

        // get latest block height 
        try {
            let maestroProtocolParams = await this.queryClient.protocolParameters();
            let curProtocalParams = convertMaestroProtocolParams(maestroProtocolParams);
            console.log("\n\ncurProtocalParams: ", curProtocalParams);
            this.addSuccessOgmiosAccess();

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCurProtocolParametersByPlutusSdk...", curProtocalParams);
            return curProtocalParams;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCurProtocolParametersByPlutusSdk error...", e);
            console.log("getCurProtocolParametersByPlutusSdk error: ", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

    async getGenesisConfigByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getGenesisConfigByPlutusSdk: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getGenesisConfigByPlutusSdk...", reqOptions);

        try {
            let maestroGenesisConfig = await this.queryClient.genesisConfiguration('shelley');
            let genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
            this.addSuccessOgmiosAccess();
            return genesisConfig;

        } catch (e) {
            console.log("query getGenesisConfigByPlutusSdk exception: ", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

    async getEraSummariesByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getEraSummariesByPlutusSdk...", reqOptions);

        // get query eraSummaries 
        try {
            let maestroEraSummaries = await this.queryClient.eraSummaries();
            let eraSummaries = convertMaestroEraSummariesInfo(maestroEraSummaries);

            this.addSuccessOgmiosAccess();
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getEraSummariesByPlutusSdk...", eraSummaries);
            return eraSummaries;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getEraSummariesByPlutusSdk error...", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

    async getBlockHeightByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk...");

        // get query eraSummaries 
        try {
            let blockHeight = await this.queryClient.networkBlockHeight();
            this.addSuccessOgmiosAccess();

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk...", blockHeight);
            return blockHeight;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk error...", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

    //delegationsAndRewards: (stakeKeyHashes: DigestBlake2BCredential[])
    async getDelegationsAndRewardsByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewardsByPlutusSdk...");

        // get delegationsAndRewards 
        try {
            let params = {
                "scripts": reqOptions
                // "keys": reqOptions
            }
            console.log("\n\n .....rewardAccountSummaries...params: ", params);

            let retSummaries = await this.queryClient.rewardAccountSummaries(params);
            console.log("\n\n .....rewardAccountSummaries...ret: ", retSummaries);
            this.addSuccessOgmiosAccess();

            let ret = {};
            for(let key in retSummaries){
                let summObj = retSummaries[key];

                let poolId = summObj.delegate.id;

                let strRewards = summObj.rewards.ada.lovelace.toString();
                let intRewards = new BigNumber(strRewards).toNumber();

                ret[key] = {
                    "delegate": poolId,
                    "rewards": intRewards
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewardsByPlutusSdk...", ret);
            return ret;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewardsByPlutusSdk error...", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

}

module.exports = CardanoServiceMaestroHandler;


