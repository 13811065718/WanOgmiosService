const mongoose = require('mongoose'),
Schema = mongoose.Schema;

module.exports = {
    network: "mainnet",
    mongo_url: "mongodb://127.0.0.1:27017/wanOgmiosService_maestroMainnet",
    cardanoOgmiosVersion: "v6",
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
        "initialBlockNumber": 10575331,
        "initialBlockTime": "2024-07-15T08:40:00Z",
        "initialSlot": 129466532,
        "initialHash": "fde58fbdccb79e58255b20d2a015cacbe209e2eb43055de5032b3d8d9ad0563b"
    },
    ogmiosServerCfg:{
        host: "ogmios.wanchain.gomaestro-api.org",
        port: '',
        apiKey: "v0LXAjiRQAm3PNjlFSlqB8rfgUp7OExE"
    },
    nftTreasuryScCfg: "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd", 
    treasuryScCfg: "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd",
    checkTokenPolicyIdCfg: [
        "9432bc2dccab7a0b07881752e55e050991ccf31725794816ff6f7fec",
        "9270c8a0f52d7f503a865ab30bde7cf2847d3df79938e498a27536c0"
    ],
    nftCheckTokenPolicyIdCfg: [
        "6c7fcc7a8f6ba6a4655f133afd40c03517c94fee1c8f124021772b19",
        "e4d8eb6b46655cb39b3c467bfa9323ee0e9ee9e36b9a0ecdb6f13dc4"
    ],
    iWanConfig:  {
        "apiKey": "7190c9ade976841596c3451487fcdd53d81e9406c450653d8b9339831429ac01",  //
        "secretKey": "f18e93a91204adbcc021e06b4383d6c824d97fe7b289ebc941c056da931870b0", // 
        "option": {
          "url": "api.wanchain.org",
          "port": 8443,
          "flag": "ws",
          "version": "v3"
        },
        "dataValidLatestTs": 1800000,
        "iWanServiceID": 60150
    },
    securityConfirmEnable: true
}
