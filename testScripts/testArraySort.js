
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const CoinSelection = require('./coinSelection');

class CompareTool {

    constructor(){
        this.coinSelectionInst = new CoinSelection();
        this.coinsPerUtxoWord = "8620";
        this.minFeeA = "44";
        this.minFeeB = "155381";
        this.coinSelectionInst.setProtocolParameters(this.coinsPerUtxoWord, this.minFeeA, this.minFeeB, '10000');

    }

    number2String(value) {

        if (typeof value === 'string') {
            return value;
        } else {
            return value.toString();
        }
    }

    compareUtxoAssetValue(assetUnit) {

        return function(utxoItemA, utxoItemB){

            if ((undefined === utxoItemA) || (undefined === utxoItemB)
                || (undefined === utxoItemA.txOut) || (undefined === utxoItemB.txOut)
                || (undefined === utxoItemA.txOut.value) || (undefined === utxoItemB.txOut.value)) {
                return undefined;
            }    
    
            let itemAssetValueA = CardanoWasm.BigNum.from_str("0");
            for (let v = 0; v < utxoItemA.txOut.value.length; v++) {
                let valueItem = utxoItemA.txOut.value[v];
                if (assetUnit === valueItem.unit) {
                    console.log("valueItem A: ", valueItem);
                    let tmpAmount = CardanoWasm.BigNum.from_str(valueItem.quantity.toString());
                    itemAssetValueA = itemAssetValueA.checked_add(tmpAmount);
                }
            }    
    
            let itemAssetValueB = CardanoWasm.BigNum.from_str("0");;
            for (let v = 0; v < utxoItemB.txOut.value.length; v++) {
                let valueItem = utxoItemB.txOut.value[v];
                if (assetUnit === valueItem.unit) {
                    console.log("valueItem B: ", valueItem);
                    let tmpAmount = CardanoWasm.BigNum.from_str(valueItem.quantity.toString());
                    itemAssetValueB = itemAssetValueB.checked_add(tmpAmount);
                }
            }
    
            if (itemAssetValueA > itemAssetValueB) {
                return 1;
            } else if (itemAssetValueA === itemAssetValueB) {
                return 0;
            } else {
                return -1;
            }
        }
    }

    sortUtxoByValue(formatUtxos){
        // let formatUtxos = this.formatUtxoData(utxos);
        // if(0 === formatUtxos.length){
        //     return formatUtxos;
        // }
        console.log("Utxos befor sorted: ", formatUtxos);

        let assetType = "0x973a5d0513309e32db4fd6ef3da953ffaa";

        formatUtxos.sort(this.compareUtxoAssetValue(assetType));
        console.log("\n\nSorted Utxos: ", formatUtxos);
    }
    
    hexStr2Ascii(hexString) {
        let hex = hexString.toString();
        let str = '';
        for (let n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;
    }

    buildOutputValue(value, fee) {

        let outputValue = undefined;
        let adaAmount = undefined;
        let tokenObjAry = new Array();
        let assetPids = new Array();
        let assetNames = new Array();
        let numAssets = 0;
        let sumAssetNameLengths = 0;

        // to caculate the numAssets & numPids & sumAssetNameLengths
        for (let index = 0; index < value.length; index++) {
            let itemAmount = value[index];

            if ("lovelace" === itemAmount.unit) {
                adaAmount = itemAmount.amount;

            } else {
                tokenObjAry.push(itemAmount);

                let matchedIndex = assetPids.indexOf(itemAmount.unit);
                if (-1 === matchedIndex) {
                    assetPids.push(itemAmount.unit);
                }

                matchedIndex = assetNames.indexOf(itemAmount.name);
                if (-1 === matchedIndex) {
                    assetNames.push(itemAmount.name);

                    let asciiName = this.hexStr2Ascii(itemAmount.name);
                    sumAssetNameLengths += asciiName.length;
                }

                numAssets++;
            }
        }

        if (0 < numAssets) {
            // in case of token assets
            let multiAssetInfo = {
                "numAssets": numAssets,
                "numPids": assetPids.length,
                "sumAssetNameLengths": sumAssetNameLengths
            }
            console.log("\n\n...multiAssetInfo...: ", multiAssetInfo);

            let boundAdaAmount = adaAmount;
            if (undefined === boundAdaAmount) {
                boundAdaAmount = "100000"; //this.caculateMinAdaValue(multiAssetInfo, this.coinsPerUtxoWord); // 
            }
            console.log("\n\n...boundAdaAmount...: ", boundAdaAmount);

            outputValue = this.buildMultiAsset(tokenObjAry, boundAdaAmount); //"1444443"

        } else if (undefined !== adaAmount) {
            // in case of pure ada
            // to caculate the transfer value by sub agentFee based on amount
            let amount = CardanoWasm.BigNum.from_str(this.number2String(adaAmount));

            if (undefined !== fee) {
                let agentFee = CardanoWasm.BigNum.from_str(this.number2String(fee));
                let value = amount.checked_sub(agentFee);
                outputValue = CardanoWasm.Value.new(value);
            } else {
                outputValue = CardanoWasm.Value.new(amount);
            }

        } else {
            // in invalid condition
            return undefined;
        }

        return outputValue;
    }


    
    buildMultiAsset(tokenObjAry, boundAdaAmount) {

        let multiAssetObj = CardanoWasm.MultiAsset.new();
        for (let i = 0; i < tokenObjAry.length; i++) {
            let tokenObj = tokenObjAry[i];
            let tokenPolicyID = tokenObj.unit;
            let tokenName = tokenObj.name;
            let tokenAmount = tokenObj.amount;

            let tokenAsset = CardanoWasm.Assets.new();
            let assetName = CardanoWasm.AssetName.new(Buffer.from(tokenName, 'hex'));

            let tokenValue = CardanoWasm.BigNum.from_str(this.number2String(tokenAmount));
            tokenAsset.insert(assetName, tokenValue);

            let tokenSriptHash = CardanoWasm.ScriptHash.from_bytes(Buffer.from(tokenPolicyID, "hex"));
            multiAssetObj.insert(tokenSriptHash, tokenAsset);
        }

        let baseAdaValue = CardanoWasm.BigNum.from_str(this.number2String(boundAdaAmount));
        let multAssetValue = CardanoWasm.Value.new(baseAdaValue);
        multAssetValue.set_multiasset(multiAssetObj);

        return multAssetValue;
    }

    buildTokenAsset(tokenName, tokenAmount) {

        let assetName = CardanoWasm.AssetName.new(Buffer.from(tokenName, 'hex'));
        let tokenValue = CardanoWasm.BigNum.from_str(this.number2String(tokenAmount));

        let tokenAsset = CardanoWasm.Assets.new();
        tokenAsset.insert(assetName, tokenValue);

        return tokenAsset;
    }

    
    encodeUtxo(utxoObj) {
        let txInData = utxoObj.txIn;
        let txOutData = utxoObj.txOut;

        let transaction_id = CardanoWasm.TransactionHash.from_bytes(Buffer.from(txInData.txId, 'hex'));
        let txInput = CardanoWasm.TransactionInput.new(transaction_id, txInData.index);
        let address = CardanoWasm.Address.from_bech32(txOutData.address);

        let amount = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(this.number2String(txOutData.value[0].quantity)));
        if (1 < txOutData.value.length) {
            let multiAssetObj = CardanoWasm.MultiAsset.new();
            for (let i = 1; i < txOutData.value.length; i++) {

                let strScriptHash = txOutData.value[i].unit.slice(0, 56);
                let strName = txOutData.value[i].unit.slice(56);

                let tokenAsset = this.buildTokenAsset(strName, txOutData.value[i].quantity);
                let tokenSriptHash = CardanoWasm.ScriptHash.from_bytes(Buffer.from(strScriptHash, "hex"));
                multiAssetObj.insert(tokenSriptHash, tokenAsset);
            }
            amount.set_multiasset(multiAssetObj);
        }

        let txOutput = CardanoWasm.TransactionOutput.new(address, amount);
        let encodedUtxo = CardanoWasm.TransactionUnspentOutput.new(txInput, txOutput);

        return encodedUtxo;
    }

    
    byteArray2Hexstring(byteArray) {
        return Array.from(byteArray, function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
    }
    
    decodeUtxo(encodedUtxo) {
        let utxoInfoObj = {
            "txIn": undefined,
            "txOut": undefined
        };

        // Step 1: to restore the txIn data from encodedUtxo
        let txIn = encodedUtxo.input();
        let txInData = {
            "txId": this.byteArray2Hexstring(txIn.transaction_id().to_bytes()),
            "index": txIn.index()
        }
        utxoInfoObj.txIn = txInData;

        // Step 2: to restore the txOut data from encodedUtxo
        let txOut = encodedUtxo.output();
        let outValue = txOut.amount();

        // part 1: to parse ada asset
        let outAmountAry = new Array();
        let assetItem = {
            "unit": "lovelace",
            "quantity": outValue.coin().to_str()
        }
        outAmountAry.push(assetItem);

        // part 2: to parse multi asset in case
        if (undefined !== outValue.multiasset()) {

            let scriptHashs = outValue.multiasset().keys();
            for (let k = 0; k < scriptHashs.len(); k++) {
                let scriptHash = scriptHashs.get(k);
                let strPolicyId = this.byteArray2Hexstring(scriptHash.to_bytes());

                let assetInfo = outValue.multiasset().get(scriptHash);
                let assetNames = assetInfo.keys();
                for (let m = 0; m < assetNames.len(); m++) {
                    let assetName = assetNames.get(m);
                    let strName = this.byteArray2Hexstring(assetName.name());
                    let strUnit = strPolicyId + "." + strName;

                    let assetAmount = assetInfo.get(assetName);

                    let assetItem = {
                        "unit": strUnit,
                        "quantity": assetAmount.to_str()
                    }
                    outAmountAry.push(assetItem);
                }
            }
        }

        let txOutData = {
            "address": txOut.address().to_bech32(this.ADDR_PREFIX),
            "value": outAmountAry
        }
        utxoInfoObj.txOut = txOutData;
        console.log("...selected utxo: ", utxoInfoObj);

        return utxoInfoObj;
    }



    selectionUtxo(selectionParam_inputs, selectionParam_outputs){
        let selectedUtxos = new Array();
        let selectedRet = this.coinSelectionInst.randomImprove(selectionParam_inputs,
            selectionParam_outputs,
            1); // the 3rd param should be changed into 20+tokenAssets

        for (let i = 0; i < selectedRet.input.length; i++) {
            let utxo = selectedRet.input[i];
            let utxoInfoObj = this.decodeUtxo(utxo);

            selectedUtxos.push(utxoInfoObj);
        }

        return selectedUtxos;
    }




}

function main(){
    // let strAssetUnit = "0145d252838.093da23";
    // // strAssetUnit = strAssetUnit.split(".");
    // // console.log("\n\n strAssetUnit: ", strAssetUnit);


    // let [policyId, name] = strAssetUnit.split(".");
    // console.log("\n\n strAssetUnit: ", policyId, name);


    // let strAssetUnit2 = "0145d252838.093da23";
    // strAssetUnit2 = strAssetUnit2.replace(".", "");
    // console.log("\n\n strAssetUnit2: ", strAssetUnit2);

    // let redeemers = {
    //     "spend:0": "0x2135ddf",
    //     "spend:2": "0x1235ddf",
    //     "spend:3": "0x3335ddf"
    // }

    // let redeemerKey = "spend:"+ 2;
    // let redeemerValue = redeemers[redeemerKey];
    // console.log("\n\n redeemerValue:", redeemerKey, redeemerValue);


    // let mintValue = parseInt("100036");
    // let burnValue = parseInt("-10036");
    // if(0 > burnValue){
    //     burnValue = 0-burnValue;
    // }
    // console.log("burnValue: ", burnValue);

    // let mintage = CardanoWasm.BigNum.from_str("0");
    // mintage = mintage.checked_add(CardanoWasm.BigNum.from_str(mintValue.toString()));
    // mintage = mintage.checked_sub(CardanoWasm.BigNum.from_str(burnValue.toString()));

    // console.log("final mintage: ", mintage.to_str());
    




    let utxos = new Array();
    utxos.push({
        txIn: {
            "txId": "f17233a83384cd995b143551a436df6d2ac63042a011322a8d806332193b3b3d",
            "index": 1
        },
        txOut:{
            "address": "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd",
            "value":[{
                "unit": "lovelace",
                "quantity": "10000000"
            },{
                "unit": "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235484f534b59",
                "quantity": "1"
            }]
        }
    });

    {
    /*
    utxos.push({
        txIn: {
            "txId": "0x12325",
            "index": 1
        },
        txOut:{
            "address": "0x9e5feb6c01dcda01a800d53231a6f7973a5d0513309e32db4fd6ef3da953ffaa",
            "value":[{
                "unit": "lovelace",
                "quantity": 1000
            },{
                "unit": "0x973a5d0513309e32db4fd6ef3da953ffaa",
                "quantity": 2558
            }]
        }
    });
    utxos.push({
        txIn: {
            "txId": "0x12335",
            "index": 1
        },
        txOut:{
            "address": "0x9e5feb6c01dcda01a800d53231a6f7973a5d0513309e32db4fd6ef3da953ffaa",
            "value":[{
                "unit": "lovelace",
                "quantity": 25
            },{
                "unit": "0x973a5d0513309e32db4fd6ef3da953ffaa",
                "quantity": 558
            }]
        }
    });
    utxos.push({
        txIn: {
            "txId": "0x12345",
            "index": 1
        },
        txOut:{
            "address": "0x9e5feb6c01dcda01a800d53231a6f7973a5d0513309e32db4fd6ef3da953ffaa",
            "value":[{
                "unit": "lovelace",
                "quantity": 763
            },{
                "unit": "0x973a5d0513309e32db4fd6ef3da953ffaa",
                "quantity": 255
            }]
        }
    });
    utxos.push({
        txIn: {
            "txId": "0x12355",
            "index": 1
        },
        txOut:{
            "address": "0x9e5feb6c01dcda01a800d53231a6f7973a5d0513309e32db4fd6ef3da953ffaa",
            "value":[{
                "unit": "lovelace",
                "quantity": 39
            },{
                "unit": "0x973a5d0513309e32db4fd6ef3da953ffaa",
                "quantity": 58
            }]
        }
    });
    utxos.push({
        txIn: {
            "txId": "0x12365",
            "index": 1
        },
        txOut:{
            "address": "0x9e5feb6c01dcda01a800d53231a6f7973a5d0513309e32db4fd6ef3da953ffaa",
            "value":[{
                "unit": "lovelace",
                "quantity": 1890
            },{
                "unit": "0x973a5d0513309e32db4fd6ef3da953ffaa",
                "quantity": 1558
            }]
        }
    });
    */
    }

    let compareToolObj = new CompareTool();

    // compareToolObj.sortUtxoByValue(utxos);


    let value = new Array();
    let itemValue = {
        unit: "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235",
        name: "484f534b59",
        amount: "1"
    }
    value.push(itemValue);

    let toAddress = "addr1q8nd57644dctpmh5z49u9kxdsr6t2px0jg0es4gjpy7kvzk2decd8n4d28t9helaqh6eq8tqpqxjn5km60dxreegmzuqesanym";
    let outputAddress = CardanoWasm.Address.from_bech32(toAddress);
    // this.logger.debug("..PlutusTxBuilder......outputAddress: ", outputAddress);
    let outputValue = compareToolObj.buildOutputValue(value, undefined);
    // this.logger.debug("..PlutusTxBuilder......buildOutputValue ret: ", outputValue);
    let txOutput = CardanoWasm.TransactionOutput.new(outputAddress, outputValue);
    // this.logger.debug("..PlutusTxBuilder......TransactionOutput ret: ", txOutput);

    let selectionParam_outputs = CardanoWasm.TransactionOutputs.new();
    selectionParam_outputs.add(txOutput);


    let selectionParam_inputs = new Array();
    let utxoObject = {
        txIn: {
            "txId": "a8947e47855471099717bfe47f02910d6b906f06390b4ca01d929b0c4b56d3f2",
            "index": 1
        },
        txOut:{
            "address": "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd",
            "value":[{
                "unit": "lovelace",
                "quantity": 1000000
            },{
                "unit": "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235484f534b59",
                "quantity": 1
            }]
        }
    }
    let inputUtxoItem = compareToolObj.encodeUtxo(utxoObject);
    selectionParam_inputs.push(inputUtxoItem);

    compareToolObj.selectionUtxo(selectionParam_inputs, selectionParam_outputs);

    // compareToolObj.checkDivision(1, 6);


}


main();