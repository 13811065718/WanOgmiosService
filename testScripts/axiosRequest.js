const axios = require('axios');
const BigNumber = require('bignumber.js');
const minimist = require('minimist');

// cmd format: --net=mainnet --route=getLatestBlock
const commandArgs = process.argv.slice(2);
const cmdParams = minimist(commandArgs);
console.log("\n\n...cmdParams: ", cmdParams);
const netType = cmdParams['net'];
const cmdRoute = cmdParams['route'];
console.log("\n\n...cmdParams: ", netType, cmdRoute);

const mainnetUrl = "https://nodes.wandevs.org/cardano";
const testnetUrl = "https://nodes-testnet.wandevs.org/cardano";
const apiServer = ("mainnet" === netType) ? mainnetUrl : testnetUrl;
const reqUrl = `${apiServer}/${cmdRoute}`

// const cmdRoute = "getDelegationsAndRewardsByPlutusSdk"; //"evaluateTx"; //
// const apiServer = "http://127.0.0.1:4337"
// const reqUrl = `${apiServer}/${cmdRoute}`

if ("getLatestBlock" === cmdRoute) {
    const data = {
        name: 'John Doe',
        job: 'Content Writer'
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getChainTip" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getChainTip Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("queryEraSummaries" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('queryEraSummaries Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getCostModelParameters" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getCostModelParameters Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getEpochsParameters" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getEpochsParameters Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("queryGenesisConfig" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('queryGenesisConfig Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBalancedConfig" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("checkUtxoAvailable" === cmdRoute) {
    const data = {
        "txId": "0311f985f2c529461e546f960dc32806e4794270d04c4f0b7c795efdd3d9cd18",
        "index": 0
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBlock" === cmdRoute) {
    const data = {
        blockNo: 9089046
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getUTXOs" === cmdRoute) {
    let qryParamAry = new Array();

    // // case 1: the query param is an Array which the element is address
    // qryParamAry.push("addr_test1qrnd57644dctpmh5z49u9kxdsr6t2px0jg0es4gjpy7kvzk2decd8n4d28t9helaqh6eq8tqpqxjn5km60dxreegmzuq6xqngy");

    // case 2: the query param is an Array which the element is tx index object includes txId & index
    let txInItem = {
        "txId": "f377fef1a348168c859dcce101f730be452908bfcaf99aa2b8e9e9eee360e905",
        "index": 0
    };
    qryParamAry.push(txInItem);

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, qryParamAry)
        .then((res) => {
            let edTs = Date.now();
            console.log('Body: ', res.data);

            console.log("timestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAddressUTXOs" === cmdRoute) {
    const data = {
        address: 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'
    };

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            let edTs = Date.now();
            console.log('Body: ', res.data);

            console.log("timestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAddressUTXOsWithBlockHeight" === cmdRoute) {
    const data = {
        address: 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'
    };

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            let edTs = Date.now();
            console.log('Body: ', res.data);

            console.log("timestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBalanceByAddress" === cmdRoute) {
    const data = {
        address: 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'//'addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp'
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAddressTx" === cmdRoute) {
    const data = {
        fromBlock: 9072950,
        toBlock: 9072990,
        address: "addr1q8nd57644dctpmh5z49u9kxdsr6t2px0jg0es4gjpy7kvzk2decd8n4d28t9helaqh6eq8tqpqxjn5km60dxreegmzuqesanym"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTreasuryTx" === cmdRoute) {
    const data = {
        fromBlock: 9069720,
        toBlock: 9069730,
        address: "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getCostModelParameters" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getCostModelParameters Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        }); //getTxById
} else if ("getTxById" === cmdRoute) {
    const data = {
        txId: "99ce1fbbd5170d9837a83d2719319131983a70a1fda3aa36f701a79734391ce6"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTxUtxos" === cmdRoute) {
    const data = {
        txId: "99ce1fbbd5170d9837a83d2719319131983a70a1fda3aa36f701a79734391ce6"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTxsMetadata" === cmdRoute) {
    const data = {
        txId: "ebd24637d50a0bd35deb5517dfb62c744a22f9de4b3a1c70fba01c7cee047b42"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getMintInfoByPolicyId" === cmdRoute) {
    const data = {
        policyId: "25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935",
        beginBlockNo: 9075832,
        endBlockNo: 9075835
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAssetMintage" === cmdRoute) {
    const data = {
        tokenId: "d5d25ef96acacaf5690e5549139645484796be537c149f0b4d48cfbf.57414e"
    };


    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));

        }).catch((err) => {
            console.error(err);
        });
} else if ("getAssetMintInfo" === cmdRoute) {
    const data = {
        tokenId: "d5d25ef96acacaf5690e5549139645484796be537c149f0b4d48cfbf.57414e",
        beginBlockNo: 847685,
        endBlockNo: 848095
    };


    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));

        }).catch((err) => {
            console.error(err);
        });
} else if ("evaluateTx" === cmdRoute) {
    const data = {
        rawTx: "84ab008382582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820ae44d9011eb204eae2c310ffbbc01ff91173f069e56e9bd634d93326511e478c00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f201018182583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c741821a00fca773a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e1a3a699d00021a0004c371031a070413a6075820b421f6b15729c8e4d0040e338958dbc77460bdb1f47180d58a3cbd2c0682c14c09a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e3a0098967f0b5820c4ee621e8b6886e3231be51f1d61a7c221bc9e8d3ddd5712075d0aceacd548fc0d8282582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f2011082583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00e69468111a0009474a1281825820fffb1b66bd78837ea0136587c354ee6a0991b6d0a2954e48d46a476b3ce683df00a20081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b5840ef5cffb0a068ceaedd98583ac3ad4166921dd5272cd85164af6a5300353e0b11b4562d9d81ac00510635f9d66acfb4c102c7493d505ba50efd215add537c6e0c0581840100d87980821a00171fe01a198a993cf5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333969746f4163636f756e74549d54fb4a5e5467cf3dbc904bcabd5efc38b763446b746f6b656e50616972494419020a647479706508"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('evaluateTx Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("sendSignedTx" === cmdRoute) {
    const data = {
        rawTx: "84a500818258207de66a409f7041917aad0c75b0f354870fa310d09fd612f814cd789de2574cc4010182a3005839311cfb41dc0b8d13fe53600e17059dcbcda2d8647347ec25288b4f5234259b187aa287258c0b95e636a472391282dedb2eb17b8bf321bb14f1011a00200b20028201d81845d8799f01ff82583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00454796021a0002be85031a06dbbb890758209e1c0a4569599a4f2dba4c9c5b77d148a999515a37a4ec3a3882316dd89f7ee7a10081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b5840d1e42d3a5164a7c2d36df19ca0ac631c021313fd753e3477774aba46c3557a87d3cd706208d5df1f86aa4c4ac26d284e2e46bac09d30471002a75baba2337000f5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333869746f4163636f756e74549d54fb4a5e5467cf3dbc904bcabd5efc38b763446b746f6b656e50616972494419020c647479706501"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('sendSignedTx Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getEraSummariesByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getEraSummariesByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBlockHeightByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getBlockHeightByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getCurProtocolParametersByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getCurProtocolParametersByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getGenesisConfigByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('queryGenesisConfig Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getChainTipByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getChainTipByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getDelegationsAndRewardsByPlutusSdk" === cmdRoute) {
    let data = new Array();
    let scriptsHash = "stake1u8g4qwntmh7apqe3pyfju4shthay6ae7r2thvmswpktez5s2y49dh";
    data.push(scriptsHash);

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getDelegationsAndRewardsByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("evaluateTxByPlutusSdk" === cmdRoute) {
    const rawTx = "84ab008382582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820ae44d9011eb204eae2c310ffbbc01ff91173f069e56e9bd634d93326511e478c00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f201018182583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c741821a00fca773a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e1a3a699d00021a0004c371031a070413a6075820b421f6b15729c8e4d0040e338958dbc77460bdb1f47180d58a3cbd2c0682c14c09a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e3a0098967f0b5820c4ee621e8b6886e3231be51f1d61a7c221bc9e8d3ddd5712075d0aceacd548fc0d8282582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f2011082583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00e69468111a0009474a1281825820fffb1b66bd78837ea0136587c354ee6a0991b6d0a2954e48d46a476b3ce683df00a20081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b5840ef5cffb0a068ceaedd98583ac3ad4166921dd5272cd85164af6a5300353e0b11b4562d9d81ac00510635f9d66acfb4c102c7493d505ba50efd215add537c6e0c0581840100d87980821a00171fe01a198a993cf5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333969746f4163636f756e74549d54fb4a5e5467cf3dbc904bcabd5efc38b763446b746f6b656e50616972494419020a647479706508";

    axios.post(reqUrl, rawTx)
        .then((res) => {
            console.log('evaluateTx Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("submitTxByPlutusSdk" === cmdRoute) {
    const rawTx = "84ab008382582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820ae44d9011eb204eae2c310ffbbc01ff91173f069e56e9bd634d93326511e478c00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f201018182583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c741821a00fca773a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e1a3a699d00021a0004c371031a070413a6075820b421f6b15729c8e4d0040e338958dbc77460bdb1f47180d58a3cbd2c0682c14c09a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e3a0098967f0b5820c4ee621e8b6886e3231be51f1d61a7c221bc9e8d3ddd5712075d0aceacd548fc0d8282582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f2011082583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00e69468111a0009474a1281825820fffb1b66bd78837ea0136587c354ee6a0991b6d0a2954e48d46a476b3ce683df00a20081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b5840ef5cffb0a068ceaedd98583ac3ad4166921dd5272cd85164af6a5300353e0b11b4562d9d81ac00510635f9d66acfb4c102c7493d505ba50efd215add537c6e0c0581840100d87980821a00171fe01a198a993cf5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333969746f4163636f756e74549d54fb4a5e5467cf3dbc904bcabd5efc38b763446b746f6b656e50616972494419020a647479706508";

    axios.post(reqUrl, rawTx)
        .then((res) => {
            console.log('submitTxByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getUTXOsByPlutusSdk" === cmdRoute) {
    let data = new Array();
    let address = 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'
    data.push(address);

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            let edTs = Date.now();
            let retUtxos = res.data; 
            for(let i=0; i<retUtxos.length; i++){
                console.log('utxo: ', retUtxos[i]);

                let value = retUtxos[i][1].value;
                console.log("utxo value: ", value);
            }

            console.log("timestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
}

//

function main() {

}

