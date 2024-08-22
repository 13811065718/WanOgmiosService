const mongoose = require('mongoose'),
Schema = mongoose.Schema;

module.exports = {
    network: "testnet",
    mongo_url: "mongodb://127.0.0.1:27017/wanOgmiosService_nft",
    cardanoOgmiosVersion: "v5",
    blockInfoSchema: {
        name: "blockInfo",
        schema: {
            blockHeight: { type: Number, index: true },
            blockHash:{type: String, index: true },
            slot: { type: Number, index: true },
            hash: { type: String },
            time: { type: Number },
            blockType: { type: String },
            blockEra: { type: String }, 
            blockTxs: { type: Array }
        }
    },
    chainSyncSchema: {
        name: "chainSyncInfo",
        schema: {
            chainType: { type: String, index: true },
            time: { type: Number },
            slot: { type: Number },
            hash: { type: String },
            blockHeight: { type: Number }
        }
    },
    txInfoSchema: {
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
            datums:  { type: Schema.Types.Mixed },
            fee: { type: String}, //tx redeemers
            inputSource: { type: String },
            // validityInterval: { type: Schema.Types.Mixed }
        }
    },
    mintInfoSchema: {
        name: "mintInfo",
        schema: {
            tokenId: { type: String, index: true },  //policy id of asset
            txId: { type: String, index: true },  //txId
            blockHeight: { type: Number, index: true } , // block height
            slot: { type: Number, index: true },
            mintValue: { type: Number },   // mint value
            security_Confirmed: { type: Boolean}
        }
    },
    treasuryUtxoInfoSchema: {
        name: "treasuryUtxoInfo",
        schema: {
            utxoId: { type: String, index: true },  // utxoId: txId.txIndex
            txId: { type: String, index: true },  // txId utxo belong to 
            txIndex: { type: Number, index: true },  // utxo index in tx outputs
            blockHeight: { type: Number, index: true } , // block height
            slot: { type: Number, index: true },
            owner: { type: String },  // utxo owner
            status: { type: Number }  // utxo status: available(1)/Consumed(0)
        }
    },
    balancedCfgInfoSchema: {
        name: "balancedCfgInfo",
        schema: {
            chainType: { type: String, index: true },
            utxoNumThresheld: { type: Schema.Types.Mixed },  // utxoId: txId.txIndex
            assetAmountThresheld: { type: Schema.Types.Mixed }
        }
    },
    securityConfirmedInfoSchema:{
        name: "securityConfirmedInfo",
        schema: {
            chainType: { type: String, index: true },
            confirmBlockBegin: { type: Number } , // block height
            syncedBlockNo: { type: Number } 
        }
    },
    mappingTokenPolicyIdSchema:{
        name: "mappingTokenPolicyIdConfig",
        schema: {
            checkTokenType: {type: Number, index: true}, // 1: non-NFT; 2: NFT
            policyIds: { type: Array },
        }
    },
    balancedCfg:{
        "utxoNumThresheld": {
            "maxUtxoListLen" : 30,
            "idealUtxoListLen" : 20,
            "minUtxoListLen" : 10
        },
        "assetAmountThresheld":{
            "lovelace" : "1000000000"
        }
    },
    chainSyncCfg:{
        "initialBlockNumber": 2607314,
        "initialBlockTime": "2024-08-20T07:29:00Z",
        "initialSlot": 68455756,
        "initialHash": "d1887a3afb3db647d794bea4a452aceee258ae02802635be38b4444c2e81d248"
    },
    ogmiosServerCfg:{
        host: "52.13.9.234", 
        port: 1337
    },
    nftTreasuryScCfg: "addr_test1qzjd7yhl8d8aezz0spg4zghgtn7rx7zun7fkekrtk2zvw9vsxg93khf9crelj4wp6kkmyvarlrdvtq49akzc8g58w9cqhx3qeu", 
    treasuryScCfg: "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp",
    checkTokenPolicyIdCfg: [
        "9432bc2dccab7a0b07881752e55e050991ccf31725794816ff6f7fec",
        "9270c8a0f52d7f503a865ab30bde7cf2847d3df79938e498a27536c0"
    ],
    nftCheckTokenPolicyIdCfg: [
        "6c7fcc7a8f6ba6a4655f133afd40c03517c94fee1c8f124021772b19",
        "e4d8eb6b46655cb39b3c467bfa9323ee0e9ee9e36b9a0ecdb6f13dc4"
    ],
    iWanConfig:  {
        "apiKey": "c8b4e563aa355356b7f80df02984da7b61d27d645668e843187d030183274381", // "7190c9ade976841596c3451487fcdd53d81e9406c450653d8b9339831429ac01",  //
        "secretKey": "fd8f9f1ab1c9e65b9d2aa6d6ac230cb47e2caf9174b6c7afecd015930d7d058c", //"f18e93a91204adbcc021e06b4383d6c824d97fe7b289ebc941c056da931870b0", // 
        "option": {
          "url": "apitest.wanchain.org", // "api.wanchain.org",
          "port": 8443,
          "flag": "ws",
          "version": "v3"
        },
        "dataValidLatestTs": 1800000,
        "iWanServiceID": 60150
    },
    securityConfirmEnable: false
}
