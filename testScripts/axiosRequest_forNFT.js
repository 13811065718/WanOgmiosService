const axios = require('axios');

let testPath = "getNFTTreasuryTx";
let apiServer = "http://52.13.9.234:6337";
let reqUrl = `${apiServer}/${testPath}`

if ("getBalanceByAddress" === testPath) {
    const data = {
        address: 'addr_test1wp4v5rfz32tzkdthxhn4zvy5m4qexa8ghxlasv606y400ucjsz3lc'
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAssetMintage" === testPath) {
    const data = {       
         tokenId: "0052bf6cd66b13b469813422373d8362918aef39a2607af9fa878719.57415350"
    };   

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));

        }).catch((err) => {
            console.error(err);
        });
} else if ("evaluateTx" === testPath) {
    const data = {
        rawTx: "84ab008382582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820ae44d9011eb204eae2c310ffbbc01ff91173f069e56e9bd634d93326511e478c00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f201018182583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c741821a00fca773a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e1a3a699d00021a0004c371031a070413a6075820b421f6b15729c8e4d0040e338958dbc77460bdb1f47180d58a3cbd2c0682c14c09a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e3a0098967f0b5820c4ee621e8b6886e3231be51f1d61a7c221bc9e8d3ddd5712075d0aceacd548fc0d8282582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f2011082583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00e69468111a0009474a1281825820fffb1b66bd78837ea0136587c354ee6a0991b6d0a2954e48d46a476b3ce683df00a20081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b5840ef5cffb0a068ceaedd98583ac3ad4166921dd5272cd85164af6a5300353e0b11b4562d9d81ac00510635f9d66acfb4c102c7493d505ba50efd215add537c6e0c0581840100d87980821a00171fe01a198a993cf5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333969746f4163636f756e74549d54fb4a5e5467cf3dbc904bcabd5efc38b763446b746f6b656e50616972494419020a647479706508"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('evaluateTx Body: ', res.data);
        }).catch((err) => {
            // console.error(err);
            console.log("\n\n..evaluateTx failed: ", err);
        });
} else if ("getEpochsParameters" === testPath) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getEpochsParameters Body: ', res.data);
        }).catch((err) => {
            // console.error(err);
            console.log("\n\n..getEpochsParameters failed: ", err);
        });
} else if ("getNFTTreasuryTx" === testPath) {
    const data = {
        "fromBlock": 2450800,
        "toBlock":  2451412
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getNFTTreasuryTx Body: ', res.data);
        }).catch((err) => {
            // console.error(err);
            console.log("\n\n..getNFTTreasuryTx failed: ", err);
        });
} else if ("getNftMintInfo" === testPath) {
    const data = {
        "beginBlockNo": 2450800,
        "endBlockNo": 2451412
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getNFTTreasuryTx Body: ', res.data);
        }).catch((err) => {
            // console.error(err);
            console.log("\n\n..getNFTTreasuryTx failed: ", err);
        });
}   
