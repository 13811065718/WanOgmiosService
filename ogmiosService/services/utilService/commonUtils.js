
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const BigNumber = require('bignumber.js');


function encodeUtxo(utxoObj) {
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
	let strUtxoId = CardanoWasm.TransactionUnspentOutput.new(txInput, txOutput).to_bytes().toString();

	return strUtxoId;
}

function convertMaestroEraSummariesInfo(maestroEraSummariesInfo) {

	let eraSummariesInfo = new Array();
	let preEraEndTime = undefined;

	for (let i = 0; i < maestroEraSummariesInfo.length; i++) {
		let maestroEraItem = maestroEraSummariesInfo[i];
		// console.log("\n\n...Era startTime: ", maestroEraItem.start.time);
		// console.log("...Era endTime: ", maestroEraItem.end.time);

		let eraSummariesItem = {};
		eraSummariesItem.start = {
			time: (undefined === preEraEndTime) ? maestroEraItem.start.time.seconds : preEraEndTime,
			slot: maestroEraItem.start.slot,
			epoch: maestroEraItem.start.epoch
		};

		let curEraSlotSecond = maestroEraItem.parameters.slotLength.milliseconds / 1000;
		let extraSlot = maestroEraItem.end.slot - maestroEraItem.start.slot;
		let extraTime = extraSlot * curEraSlotSecond;
		preEraEndTime = eraSummariesItem.start.time + extraTime;

		eraSummariesItem.end = {
			time: preEraEndTime,
			slot: maestroEraItem.end.slot,
			epoch: maestroEraItem.end.epoch
		};
		eraSummariesItem.parameters = {
			epochLength: maestroEraItem.parameters.epochLength,
			slotLength: curEraSlotSecond,
			safeZone: maestroEraItem.parameters.safeZone
		};

		eraSummariesInfo.push(eraSummariesItem);
	}

	return eraSummariesInfo;
}

function convertMaestroProtocolParams(maestroProtocolParams) {

	let protocolParameters = {};

	protocolParameters.minFeeCoefficient = maestroProtocolParams.minFeeCoefficient;
	let bnMinFeeConstant = new BigNumber(maestroProtocolParams.minFeeConstant.ada.lovelace);
	protocolParameters.minFeeConstant = bnMinFeeConstant.toNumber();
	protocolParameters.maxBlockBodySize = maestroProtocolParams.maxBlockBodySize.bytes;
	protocolParameters.maxBlockHeaderSize = maestroProtocolParams.maxBlockHeaderSize.bytes;
	protocolParameters.maxTxSize = maestroProtocolParams.maxTransactionSize.bytes;
	let bnStakeKeyDeposit = new BigNumber(maestroProtocolParams.stakeCredentialDeposit.ada.lovelace);
	protocolParameters.stakeKeyDeposit = bnStakeKeyDeposit.toNumber();
	let bnPoolDeposit = new BigNumber(maestroProtocolParams.stakePoolDeposit.ada.lovelace);
	protocolParameters.poolDeposit = bnPoolDeposit.toNumber();
	protocolParameters.poolRetirementEpochBound = maestroProtocolParams.stakePoolRetirementEpochBound;
	protocolParameters.desiredNumberOfPools = maestroProtocolParams.desiredNumberOfStakePools;
	protocolParameters.poolInfluence = maestroProtocolParams.stakePoolPledgeInfluence;
	protocolParameters.monetaryExpansion = maestroProtocolParams.monetaryExpansion;
	protocolParameters.treasuryExpansion = maestroProtocolParams.treasuryExpansion;
	protocolParameters.protocolVersion = maestroProtocolParams.version;
	let bnMinPoolCost = new BigNumber(maestroProtocolParams.minStakePoolCost.ada.lovelace);
	protocolParameters.minPoolCost = bnMinPoolCost.toNumber();
	protocolParameters.coinsPerUtxoByte = maestroProtocolParams.minUtxoDepositCoefficient;
	protocolParameters.prices = {
		memory: maestroProtocolParams.scriptExecutionPrices.memory,
		steps: maestroProtocolParams.scriptExecutionPrices.cpu
	},
		protocolParameters.maxExecutionUnitsPerTransaction = {
			memory: maestroProtocolParams.maxExecutionUnitsPerTransaction.memory,
			steps: maestroProtocolParams.maxExecutionUnitsPerTransaction.cpu
		},
		protocolParameters.maxExecutionUnitsPerBlock = {
			memory: maestroProtocolParams.maxExecutionUnitsPerBlock.memory,
			steps: maestroProtocolParams.maxExecutionUnitsPerBlock.cpu
		},
		protocolParameters.maxValueSize = maestroProtocolParams.maxValueSize.bytes;
	protocolParameters.collateralPercentage = maestroProtocolParams.collateralPercentage;
	protocolParameters.maxCollateralInputs = maestroProtocolParams.maxCollateralInputs;

	protocolParameters.costModels = {
		'plutus:v1': {
			'addInteger-cpu-arguments-intercept': 205665,
			'addInteger-cpu-arguments-slope': 812,
			'addInteger-memory-arguments-intercept': 1,
			'addInteger-memory-arguments-slope': 1,
			'appendByteString-cpu-arguments-intercept': 1000,
			'appendByteString-cpu-arguments-slope': 571,
			'appendByteString-memory-arguments-intercept': 0,
			'appendByteString-memory-arguments-slope': 1,
			'appendString-cpu-arguments-intercept': 1000,
			'appendString-cpu-arguments-slope': 24177,
			'appendString-memory-arguments-intercept': 4,
			'appendString-memory-arguments-slope': 1,
			'bData-cpu-arguments': 1000,
			'bData-memory-arguments': 32,
			'blake2b_256-cpu-arguments-intercept': 117366,
			'blake2b_256-cpu-arguments-slope': 10475,
			'blake2b_256-memory-arguments': 4,
			'cekApplyCost-exBudgetCPU': 23000,
			'cekApplyCost-exBudgetMemory': 100,
			'cekBuiltinCost-exBudgetCPU': 23000,
			'cekBuiltinCost-exBudgetMemory': 100,
			'cekConstCost-exBudgetCPU': 23000,
			'cekConstCost-exBudgetMemory': 100,
			'cekDelayCost-exBudgetCPU': 23000,
			'cekDelayCost-exBudgetMemory': 100,
			'cekForceCost-exBudgetCPU': 23000,
			'cekForceCost-exBudgetMemory': 100,
			'cekLamCost-exBudgetCPU': 23000,
			'cekLamCost-exBudgetMemory': 100,
			'cekStartupCost-exBudgetCPU': 100,
			'cekStartupCost-exBudgetMemory': 100,
			'cekVarCost-exBudgetCPU': 23000,
			'cekVarCost-exBudgetMemory': 100,
			'chooseData-cpu-arguments': 19537,
			'chooseData-memory-arguments': 32,
			'chooseList-cpu-arguments': 175354,
			'chooseList-memory-arguments': 32,
			'chooseUnit-cpu-arguments': 46417,
			'chooseUnit-memory-arguments': 4,
			'consByteString-cpu-arguments-intercept': 221973,
			'consByteString-cpu-arguments-slope': 511,
			'consByteString-memory-arguments-intercept': 0,
			'consByteString-memory-arguments-slope': 1,
			'constrData-cpu-arguments': 89141,
			'constrData-memory-arguments': 32,
			'decodeUtf8-cpu-arguments-intercept': 497525,
			'decodeUtf8-cpu-arguments-slope': 14068,
			'decodeUtf8-memory-arguments-intercept': 4,
			'decodeUtf8-memory-arguments-slope': 2,
			'divideInteger-cpu-arguments-constant': 196500,
			'divideInteger-cpu-arguments-model-arguments-intercept': 453240,
			'divideInteger-cpu-arguments-model-arguments-slope': 220,
			'divideInteger-memory-arguments-intercept': 0,
			'divideInteger-memory-arguments-minimum': 1,
			'divideInteger-memory-arguments-slope': 1,
			'encodeUtf8-cpu-arguments-intercept': 1000,
			'encodeUtf8-cpu-arguments-slope': 28662,
			'encodeUtf8-memory-arguments-intercept': 4,
			'encodeUtf8-memory-arguments-slope': 2,
			'equalsByteString-cpu-arguments-constant': 245000,
			'equalsByteString-cpu-arguments-intercept': 216773,
			'equalsByteString-cpu-arguments-slope': 62,
			'equalsByteString-memory-arguments': 1,
			'equalsData-cpu-arguments-intercept': 1060367,
			'equalsData-cpu-arguments-slope': 12586,
			'equalsData-memory-arguments': 1,
			'equalsInteger-cpu-arguments-intercept': 208512,
			'equalsInteger-cpu-arguments-slope': 421,
			'equalsInteger-memory-arguments': 1,
			'equalsString-cpu-arguments-constant': 187000,
			'equalsString-cpu-arguments-intercept': 1000,
			'equalsString-cpu-arguments-slope': 52998,
			'equalsString-memory-arguments': 1,
			'fstPair-cpu-arguments': 80436,
			'fstPair-memory-arguments': 32,
			'headList-cpu-arguments': 43249,
			'headList-memory-arguments': 32,
			'iData-cpu-arguments': 1000,
			'iData-memory-arguments': 32,
			'ifThenElse-cpu-arguments': 80556,
			'ifThenElse-memory-arguments': 1,
			'indexByteString-cpu-arguments': 57667,
			'indexByteString-memory-arguments': 4,
			'lengthOfByteString-cpu-arguments': 1000,
			'lengthOfByteString-memory-arguments': 10,
			'lessThanByteString-cpu-arguments-intercept': 197145,
			'lessThanByteString-cpu-arguments-slope': 156,
			'lessThanByteString-memory-arguments': 1,
			'lessThanEqualsByteString-cpu-arguments-intercept': 197145,
			'lessThanEqualsByteString-cpu-arguments-slope': 156,
			'lessThanEqualsByteString-memory-arguments': 1,
			'lessThanEqualsInteger-cpu-arguments-intercept': 204924,
			'lessThanEqualsInteger-cpu-arguments-slope': 473,
			'lessThanEqualsInteger-memory-arguments': 1,
			'lessThanInteger-cpu-arguments-intercept': 208896,
			'lessThanInteger-cpu-arguments-slope': 511,
			'lessThanInteger-memory-arguments': 1,
			'listData-cpu-arguments': 52467,
			'listData-memory-arguments': 32,
			'mapData-cpu-arguments': 64832,
			'mapData-memory-arguments': 32,
			'mkCons-cpu-arguments': 65493,
			'mkCons-memory-arguments': 32,
			'mkNilData-cpu-arguments': 22558,
			'mkNilData-memory-arguments': 32,
			'mkNilPairData-cpu-arguments': 16563,
			'mkNilPairData-memory-arguments': 32,
			'mkPairData-cpu-arguments': 76511,
			'mkPairData-memory-arguments': 32,
			'modInteger-cpu-arguments-constant': 196500,
			'modInteger-cpu-arguments-model-arguments-intercept': 453240,
			'modInteger-cpu-arguments-model-arguments-slope': 220,
			'modInteger-memory-arguments-intercept': 0,
			'modInteger-memory-arguments-minimum': 1,
			'modInteger-memory-arguments-slope': 1,
			'multiplyInteger-cpu-arguments-intercept': 69522,
			'multiplyInteger-cpu-arguments-slope': 11687,
			'multiplyInteger-memory-arguments-intercept': 0,
			'multiplyInteger-memory-arguments-slope': 1,
			'nullList-cpu-arguments': 60091,
			'nullList-memory-arguments': 32,
			'quotientInteger-cpu-arguments-constant': 196500,
			'quotientInteger-cpu-arguments-model-arguments-intercept': 453240,
			'quotientInteger-cpu-arguments-model-arguments-slope': 220,
			'quotientInteger-memory-arguments-intercept': 0,
			'quotientInteger-memory-arguments-minimum': 1,
			'quotientInteger-memory-arguments-slope': 1,
			'remainderInteger-cpu-arguments-constant': 196500,
			'remainderInteger-cpu-arguments-model-arguments-intercept': 453240,
			'remainderInteger-cpu-arguments-model-arguments-slope': 220,
			'remainderInteger-memory-arguments-intercept': 0,
			'remainderInteger-memory-arguments-minimum': 1,
			'remainderInteger-memory-arguments-slope': 1,
			'sha2_256-cpu-arguments-intercept': 806990,
			'sha2_256-cpu-arguments-slope': 30482,
			'sha2_256-memory-arguments': 4,
			'sha3_256-cpu-arguments-intercept': 1927926,
			'sha3_256-cpu-arguments-slope': 82523,
			'sha3_256-memory-arguments': 4,
			'sliceByteString-cpu-arguments-intercept': 265318,
			'sliceByteString-cpu-arguments-slope': 0,
			'sliceByteString-memory-arguments-intercept': 4,
			'sliceByteString-memory-arguments-slope': 0,
			'sndPair-cpu-arguments': 85931,
			'sndPair-memory-arguments': 32,
			'subtractInteger-cpu-arguments-intercept': 205665,
			'subtractInteger-cpu-arguments-slope': 812,
			'subtractInteger-memory-arguments-intercept': 1,
			'subtractInteger-memory-arguments-slope': 1,
			'tailList-cpu-arguments': 41182,
			'tailList-memory-arguments': 32,
			'trace-cpu-arguments': 212342,
			'trace-memory-arguments': 32,
			'unBData-cpu-arguments': 31220,
			'unBData-memory-arguments': 32,
			'unConstrData-cpu-arguments': 32696,
			'unConstrData-memory-arguments': 32,
			'unIData-cpu-arguments': 43357,
			'unIData-memory-arguments': 32,
			'unListData-cpu-arguments': 32247,
			'unListData-memory-arguments': 32,
			'unMapData-cpu-arguments': 38314,
			'unMapData-memory-arguments': 32,
			'verifyEd25519Signature-cpu-arguments-intercept': 57996947,
			'verifyEd25519Signature-cpu-arguments-slope': 18975,
			'verifyEd25519Signature-memory-arguments': 10
		},
		'plutus:v2': {
			'addInteger-cpu-arguments-intercept': 205665,
			'addInteger-cpu-arguments-slope': 812,
			'addInteger-memory-arguments-intercept': 1,
			'addInteger-memory-arguments-slope': 1,
			'appendByteString-cpu-arguments-intercept': 1000,
			'appendByteString-cpu-arguments-slope': 571,
			'appendByteString-memory-arguments-intercept': 0,
			'appendByteString-memory-arguments-slope': 1,
			'appendString-cpu-arguments-intercept': 1000,
			'appendString-cpu-arguments-slope': 24177,
			'appendString-memory-arguments-intercept': 4,
			'appendString-memory-arguments-slope': 1,
			'bData-cpu-arguments': 1000,
			'bData-memory-arguments': 32,
			'blake2b_256-cpu-arguments-intercept': 117366,
			'blake2b_256-cpu-arguments-slope': 10475,
			'blake2b_256-memory-arguments': 4,
			'cekApplyCost-exBudgetCPU': 23000,
			'cekApplyCost-exBudgetMemory': 100,
			'cekBuiltinCost-exBudgetCPU': 23000,
			'cekBuiltinCost-exBudgetMemory': 100,
			'cekConstCost-exBudgetCPU': 23000,
			'cekConstCost-exBudgetMemory': 100,
			'cekDelayCost-exBudgetCPU': 23000,
			'cekDelayCost-exBudgetMemory': 100,
			'cekForceCost-exBudgetCPU': 23000,
			'cekForceCost-exBudgetMemory': 100,
			'cekLamCost-exBudgetCPU': 23000,
			'cekLamCost-exBudgetMemory': 100,
			'cekStartupCost-exBudgetCPU': 100,
			'cekStartupCost-exBudgetMemory': 100,
			'cekVarCost-exBudgetCPU': 23000,
			'cekVarCost-exBudgetMemory': 100,
			'chooseData-cpu-arguments': 19537,
			'chooseData-memory-arguments': 32,
			'chooseList-cpu-arguments': 175354,
			'chooseList-memory-arguments': 32,
			'chooseUnit-cpu-arguments': 46417,
			'chooseUnit-memory-arguments': 4,
			'consByteString-cpu-arguments-intercept': 221973,
			'consByteString-cpu-arguments-slope': 511,
			'consByteString-memory-arguments-intercept': 0,
			'consByteString-memory-arguments-slope': 1,
			'constrData-cpu-arguments': 89141,
			'constrData-memory-arguments': 32,
			'decodeUtf8-cpu-arguments-intercept': 497525,
			'decodeUtf8-cpu-arguments-slope': 14068,
			'decodeUtf8-memory-arguments-intercept': 4,
			'decodeUtf8-memory-arguments-slope': 2,
			'divideInteger-cpu-arguments-constant': 196500,
			'divideInteger-cpu-arguments-model-arguments-intercept': 453240,
			'divideInteger-cpu-arguments-model-arguments-slope': 220,
			'divideInteger-memory-arguments-intercept': 0,
			'divideInteger-memory-arguments-minimum': 1,
			'divideInteger-memory-arguments-slope': 1,
			'encodeUtf8-cpu-arguments-intercept': 1000,
			'encodeUtf8-cpu-arguments-slope': 28662,
			'encodeUtf8-memory-arguments-intercept': 4,
			'encodeUtf8-memory-arguments-slope': 2,
			'equalsByteString-cpu-arguments-constant': 245000,
			'equalsByteString-cpu-arguments-intercept': 216773,
			'equalsByteString-cpu-arguments-slope': 62,
			'equalsByteString-memory-arguments': 1,
			'equalsData-cpu-arguments-intercept': 1060367,
			'equalsData-cpu-arguments-slope': 12586,
			'equalsData-memory-arguments': 1,
			'equalsInteger-cpu-arguments-intercept': 208512,
			'equalsInteger-cpu-arguments-slope': 421,
			'equalsInteger-memory-arguments': 1,
			'equalsString-cpu-arguments-constant': 187000,
			'equalsString-cpu-arguments-intercept': 1000,
			'equalsString-cpu-arguments-slope': 52998,
			'equalsString-memory-arguments': 1,
			'fstPair-cpu-arguments': 80436,
			'fstPair-memory-arguments': 32,
			'headList-cpu-arguments': 43249,
			'headList-memory-arguments': 32,
			'iData-cpu-arguments': 1000,
			'iData-memory-arguments': 32,
			'ifThenElse-cpu-arguments': 80556,
			'ifThenElse-memory-arguments': 1,
			'indexByteString-cpu-arguments': 57667,
			'indexByteString-memory-arguments': 4,
			'lengthOfByteString-cpu-arguments': 1000,
			'lengthOfByteString-memory-arguments': 10,
			'lessThanByteString-cpu-arguments-intercept': 197145,
			'lessThanByteString-cpu-arguments-slope': 156,
			'lessThanByteString-memory-arguments': 1,
			'lessThanEqualsByteString-cpu-arguments-intercept': 197145,
			'lessThanEqualsByteString-cpu-arguments-slope': 156,
			'lessThanEqualsByteString-memory-arguments': 1,
			'lessThanEqualsInteger-cpu-arguments-intercept': 204924,
			'lessThanEqualsInteger-cpu-arguments-slope': 473,
			'lessThanEqualsInteger-memory-arguments': 1,
			'lessThanInteger-cpu-arguments-intercept': 208896,
			'lessThanInteger-cpu-arguments-slope': 511,
			'lessThanInteger-memory-arguments': 1,
			'listData-cpu-arguments': 52467,
			'listData-memory-arguments': 32,
			'mapData-cpu-arguments': 64832,
			'mapData-memory-arguments': 32,
			'mkCons-cpu-arguments': 65493,
			'mkCons-memory-arguments': 32,
			'mkNilData-cpu-arguments': 22558,
			'mkNilData-memory-arguments': 32,
			'mkNilPairData-cpu-arguments': 16563,
			'mkNilPairData-memory-arguments': 32,
			'mkPairData-cpu-arguments': 76511,
			'mkPairData-memory-arguments': 32,
			'modInteger-cpu-arguments-constant': 196500,
			'modInteger-cpu-arguments-model-arguments-intercept': 453240,
			'modInteger-cpu-arguments-model-arguments-slope': 220,
			'modInteger-memory-arguments-intercept': 0,
			'modInteger-memory-arguments-minimum': 1,
			'modInteger-memory-arguments-slope': 1,
			'multiplyInteger-cpu-arguments-intercept': 69522,
			'multiplyInteger-cpu-arguments-slope': 11687,
			'multiplyInteger-memory-arguments-intercept': 0,
			'multiplyInteger-memory-arguments-slope': 1,
			'nullList-cpu-arguments': 60091,
			'nullList-memory-arguments': 32,
			'quotientInteger-cpu-arguments-constant': 196500,
			'quotientInteger-cpu-arguments-model-arguments-intercept': 453240,
			'quotientInteger-cpu-arguments-model-arguments-slope': 220,
			'quotientInteger-memory-arguments-intercept': 0,
			'quotientInteger-memory-arguments-minimum': 1,
			'quotientInteger-memory-arguments-slope': 1,
			'remainderInteger-cpu-arguments-constant': 196500,
			'remainderInteger-cpu-arguments-model-arguments-intercept': 453240,
			'remainderInteger-cpu-arguments-model-arguments-slope': 220,
			'remainderInteger-memory-arguments-intercept': 0,
			'remainderInteger-memory-arguments-minimum': 1,
			'remainderInteger-memory-arguments-slope': 1,
			'serialiseData-cpu-arguments-intercept': 1159724,
			'serialiseData-cpu-arguments-slope': 392670,
			'serialiseData-memory-arguments-intercept': 0,
			'serialiseData-memory-arguments-slope': 2,
			'sha2_256-cpu-arguments-intercept': 806990,
			'sha2_256-cpu-arguments-slope': 30482,
			'sha2_256-memory-arguments': 4,
			'sha3_256-cpu-arguments-intercept': 1927926,
			'sha3_256-cpu-arguments-slope': 82523,
			'sha3_256-memory-arguments': 4,
			'sliceByteString-cpu-arguments-intercept': 265318,
			'sliceByteString-cpu-arguments-slope': 0,
			'sliceByteString-memory-arguments-intercept': 4,
			'sliceByteString-memory-arguments-slope': 0,
			'sndPair-cpu-arguments': 85931,
			'sndPair-memory-arguments': 32,
			'subtractInteger-cpu-arguments-intercept': 205665,
			'subtractInteger-cpu-arguments-slope': 812,
			'subtractInteger-memory-arguments-intercept': 1,
			'subtractInteger-memory-arguments-slope': 1,
			'tailList-cpu-arguments': 41182,
			'tailList-memory-arguments': 32,
			'trace-cpu-arguments': 212342,
			'trace-memory-arguments': 32,
			'unBData-cpu-arguments': 31220,
			'unBData-memory-arguments': 32,
			'unConstrData-cpu-arguments': 32696,
			'unConstrData-memory-arguments': 32,
			'unIData-cpu-arguments': 43357,
			'unIData-memory-arguments': 32,
			'unListData-cpu-arguments': 32247,
			'unListData-memory-arguments': 32,
			'unMapData-cpu-arguments': 38314,
			'unMapData-memory-arguments': 32,
			'verifyEcdsaSecp256k1Signature-cpu-arguments': 35892428,
			'verifyEcdsaSecp256k1Signature-memory-arguments': 10,
			'verifyEd25519Signature-cpu-arguments-intercept': 57996947,
			'verifyEd25519Signature-cpu-arguments-slope': 18975,
			'verifyEd25519Signature-memory-arguments': 10,
			'verifySchnorrSecp256k1Signature-cpu-arguments-intercept': 38887044,
			'verifySchnorrSecp256k1Signature-cpu-arguments-slope': 32947,
			'verifySchnorrSecp256k1Signature-memory-arguments': 10
		}
	}

	return protocolParameters;
}

function convertMaestroGenesisConfig(maestroGenesisConfig) {

	let genesisConfig = {};
	genesisConfig.systemStart = maestroGenesisConfig.startTime;//  '2017-09-23T21:44:51Z',
	genesisConfig.networkMagic = maestroGenesisConfig.networkMagic;// 764824073,
	genesisConfig.network = maestroGenesisConfig.network;//'mainnet',
	genesisConfig.activeSlotsCoefficient = maestroGenesisConfig.activeSlotsCoefficient;// '1/20',
	genesisConfig.securityParameter = maestroGenesisConfig.securityParameter;// 2160,
	genesisConfig.epochLength = maestroGenesisConfig.epochLength;// 432000,
	genesisConfig.slotsPerKesPeriod = maestroGenesisConfig.slotsPerKesPeriod;// 129600,
	genesisConfig.maxKesEvolutions = maestroGenesisConfig.maxKesEvolutions;// 62,
	genesisConfig.slotLength = maestroGenesisConfig.slotLength.milliseconds / 1000; //1,
	genesisConfig.updateQuorum = maestroGenesisConfig.updateQuorum;// 5,
	genesisConfig.maxLovelaceSupply = new BigNumber(maestroGenesisConfig.maxLovelaceSupply).toNumber;// 45000000000000000n,

	let initialParameters = maestroGenesisConfig.initialParameters;
	genesisConfig.protocolParameters = {
		minFeeCoefficient: initialParameters.minFeeCoefficient,//44,
		minFeeConstant: new BigNumber(initialParameters.minFeeConstant.ada.lovelace).toNumber(), //.155381,
		maxBlockBodySize: initialParameters.maxBlockBodySize.bytes,//65536,
		maxBlockHeaderSize: initialParameters.maxBlockHeaderSize.bytes, //1100,
		maxTxSize: initialParameters.maxTransactionSize.bytes,//16384,
		stakeKeyDeposit: new BigNumber(initialParameters.stakeCredentialDeposit.ada.lovelace).toNumber(), //2000000,
		poolDeposit: new BigNumber(initialParameters.stakePoolDeposit.ada.lovelace).toNumber(),//500000000,
		poolRetirementEpochBound: initialParameters.stakePoolRetirementEpochBound,//18,
		desiredNumberOfPools: initialParameters.desiredNumberOfStakePools,//150,
		poolInfluence: initialParameters.stakePoolPledgeInfluence,//'3/10',
		monetaryExpansion: initialParameters.monetaryExpansion, //'3/1000',
		treasuryExpansion: initialParameters.treasuryExpansion,//'1/5',
		decentralizationParameter: initialParameters.federatedBlockProductionRatio,//'1/1',
		extraEntropy: initialParameters.extraEntropy, //'neutral',
		protocolVersion: initialParameters.version,//{ major: 2, minor: 0 },
		minUtxoValue: new BigNumber(initialParameters.minUtxoDepositConstant.ada.lovelace).toNumber(),// 1000000,
		minPoolCost: new BigNumber(initialParameters.minStakePoolCost.ada.lovelace).toNumber(),//340000000
	}

	return genesisConfig;
}

function convertMaestroRedeemers(redeemers) {
	if (undefined === redeemers) {
		return undefined;
	}

	let formatedRedeemers = {};
	for (let i = 0; i < redeemers.length; i++) {

		let validator = redeemers[i].validator;
		let redeemerKey = validator.purpose + ":" + validator.index;

		let redeemerObj = {
			"redeemer": redeemers[i].redeemer,
			"executionUnits": {
				"memory": redeemers[i].executionUnits.memory,
				"steps": redeemers[i].executionUnits.cpu
			}
		}

		formatedRedeemers[redeemerKey] = redeemerObj;
	}

	console.log("formated Redeemers Info: ", formatedRedeemers);
	return formatedRedeemers;
}

function convertMaestroEvaluateRet(evaluateRet) {
	if (undefined === evaluateRet) {
		return undefined;
	}

	let formatedRet = {};
	for (let i = 0; i < evaluateRet.length; i++) {
		// console.log("convertMaestroRedeemers: ",evaluateRet[i]);
		let validator = evaluateRet[i].validator;
		let redeemerKey = validator.purpose + ":" + validator.index;

		let redeemerObj = {
			"memory": evaluateRet[i].budget.memory,
			"steps": evaluateRet[i].budget.cpu
		}
		formatedRet[redeemerKey] = redeemerObj;
	}

	console.log("formated EvaluateRet Info: ", formatedRet);
	return formatedRet;
}

function convertMaestroEvaluateRet4PlutusSdk(evaluateRet) {
	if (undefined === evaluateRet) {
		return undefined;
	}

	let formatedRet = {};
	for (let i = 0; i < evaluateRet.length; i++) {
		// console.log("convertMaestroRedeemers: ",evaluateRet[i]);
		let validator = evaluateRet[i].validator;
		let redeemerKey = validator.purpose + ":" + validator.index;

		let redeemerObj = {
			"memory": evaluateRet[i].budget.memory,
			"cpu": evaluateRet[i].budget.cpu
		}
		formatedRet[redeemerKey] = redeemerObj;
	}

	console.log("formated EvaluateRet Info: ", formatedRet);
	return formatedRet;
}

function convertMaestroUtxoScriptInfo(script) {
	if (undefined === script) {
		return undefined;
	}

	let formatedScript = {};
	if ("native" === script.language) {
		formatedScript[script.language] = script.json;

	} else {
		formatedScript[script.language] = script.cbor;
	}

	return formatedScript;
}

function convertMaestroUtxoAmount(utxoValueObj) {
	console.log("..convertMaestroUtxoAmount: ", utxoValueObj);
	if (undefined === utxoValueObj) {
		return undefined;
	}

	let assetsAmountArray = new Array();

	for (let key in utxoValueObj) {
		let policyTokens = utxoValueObj[key];
		console.log("..convertMaestroUtxoAmount: ", key, policyTokens);

		if ("ada" === key) {
			let adaAmountObj = {
				"unit": "lovelace",
				"quantity": policyTokens["lovelace"].toString()
			}
			assetsAmountArray.push(adaAmountObj);
			console.log("..add asset: ", adaAmountObj);

		} else {
			let policyId = key;

			for (let name in policyTokens) {
				let tokenName = policyId + "." + name;
				let tokenAmount = policyTokens[name];
				console.log("token unit: ", tokenName);
				console.log("token amunt: ", tokenAmount.toString());

				let tokenAmountObj = {
					"unit": tokenName,
					"quantity": tokenAmount.toString()
				}
				assetsAmountArray.push(tokenAmountObj);
				console.log("..add asset: ", tokenAmountObj);
			}
		}
	}
	console.log("\n\n .....assetsAmountArray: ", assetsAmountArray, assetsAmountArray.length);

	return assetsAmountArray;
}

function decodeMaestroMetaData(metadata) {
	let typeMetaData = Object.getPrototypeOf(metadata);
	console.log("...decodeMaestroMetaData...: ", typeMetaData);

	if ("object" === typeof (metadata)) {

		if (metadata instanceof Array) {
			console.log("...decodeMaestroMetaData...case array: ", metadata);
			let retObject = [];
			for (let i = 0; i < metadata.length; i++) {
				const elem = decodeMaestroMetaData(metadata[i]);
				retObject.push(elem);
			}
			console.log("decodeMaestroMetaData array: ", retObject);
			return retObject;

		} else {
			console.log("...decodeMaestroMetaData...case object: ", metadata);
			let retObject = {};
			for (let key in metadata) {
				let objItem = metadata[key];
				console.log("...decodeMaestroMetaData...object item: ", key, objItem);

				const value = decodeMaestroMetaData(objItem);
				console.log("decodeMaestroMetaData object: ", key, value);
				retObject[key] = value;
			}
			return retObject;
		}

	} else if ("bigint" === typeof (metadata)) {
		console.log("...decodeMaestroMetaData...case bigint: ", metadata);
		let retObject = new BigNumber(metadata).toNumber();

		return retObject;

	} else if ("string" === typeof (metadata)) {
		console.log("...decodeMaestroMetaData...case string: ", metadata);
		console.log("\n string metadata: ", metadata);

		let invalidString = "\u0000";
		if (-1 !== metadata.indexOf(invalidString)) {
			let retObject = metadata.replace(invalidString, "");
			return retObject;
		}
		return metadata;

	} else if ("bytes" === typeof (metadata)) {
		console.log("...decodeMaestroMetaData...case bytes: ", metadata);
		let retObject = "0x" + metadata;
		return retObject;
	}

	return execption;
}

function decodeMetadata2Json(metadata) {

	console.log("...decodeMetadata2Json...: ", typeof (metadata));
	// we must check the type first to know how to handle it
	for (let key in metadata) {
		console.log("...decodeMetadata2Json...metadata: ", key, metadata[key]);

		if ("map" === key) {
			const mapRet = {};
			const mapData = metadata[key];
			for (let i = 0; i < mapData.length; i++) {
				let mapItem = mapData[i];
				const key = decodeMetadata2Json(mapItem["k"]);
				const value = decodeMetadata2Json(mapItem["v"]);
				console.log("decodeMetadata2Json map: ", key, value);
				mapRet[key] = value;
			}
			return mapRet;
		} else if ("list" === key) {
			let arrRet = [];
			const arr = metadata[key];
			for (var i = 0; i < arr.length; i++) {
				const elem = decodeMetadata2Json(arr[i]);
				arrRet.push(elem);
			}
			console.log("decodeMetadata2Json list: ", arrRet);
			return arrRet;
		} else if ("int" === key) {
			console.log("decodeMetadata2Json int: ", metadata[key]);


			let strValue = metadata[key];
			console.log("type : ", typeof strValue);
			// if (typeof strValue !== 'string') {
			// 	strValue = metadata[key].toString();
			// }
			// let bInt = CardanoWasm.BigNum.from_str(strValue);

			// let iValue = undefined;
			// if(0 > parseInt(metadata[key])){
			// 	iValue = CardanoWasm.Int.new_negative(bInt);
			// }else{
			// 	iValue = CardanoWasm.Int.new(bInt);
			// }

			// let item = CardanoWasm.TransactionMetadatum.new_int(iValue);
			// let decodedItem = CardanoWasm.decode_metadatum_to_json_str(item);
			// console.log("decoded int: ", decodedItem);
			return parseInt(metadata[key]);

		} else if ("bytes" === key) {
			console.log("decodeMetadata2Json bytes: ", metadata[key]);
			// let item = CardanoWasm.TransactionMetadatum.new_bytes(metadata[key]);
			// let decodedItem = CardanoWasm.decode_metadatum_to_json_str(item);
			// console.log("decoded bytes: ", decodedItem);
			return "0x" + metadata[key];
		} else if ("string" === key) {
			console.log("decodeMetadata2Json text: ", metadata[key]);

			let invalidString = "\u0000";
			if (-1 !== metadata[key].indexOf(invalidString)) {
				let subStr = metadata[key].replace(invalidString, "");
				console.log("decodeMetadata2Json replaced text: ", subStr);

				return subStr;
			}
			// let item = CardanoWasm.TransactionMetadatum.new_text(metadata[key]);
			// let decodedItem = CardanoWasm.decode_metadatum_to_json_str(item);
			// console.log("decoded text: ", decodedItem);
			return metadata[key];
			// }else if("json" === key){

			// 	let subMetadata = metadata[key];
			// 	let metaDataArray = new Array();
			// 	for (let key in subMetadata) {
			// 		console.log("...meta item...: ", key, subMetadata[key]);
			// 		let jsonMetaData = decodeMetadata2Json(subMetadata[key]); //parseMetadata
			// 		let metaDataInfo = {
			// 		  "label": key,
			// 		  "json_metadata": jsonMetaData
			// 		}
			// 		metaDataArray.push(metaDataInfo);
			// 	}
			// 	metadata[key] = metaDataArray;
			// 	return metadata[key]; // json
		} else {
			if ("tokenPairID" === key) {
				console.log("decodeMetadata2Json tokenPairID: ", metadata[key]);
				let bnTokenPairId = new BigNumber(metadata[key]);
				metadata.tokenPairID = bnTokenPairId.toNumber();
			} else if ("type" === key) {
				console.log("decodeMetadata2Json type: ", metadata[key]);
				let bnType = new BigNumber(metadata[key]);
				metadata.type = bnType.toNumber();
			}
		}

	}

	return metadata;
}

function parseMetadata(metadata) {
	// CardanoWasm.TransactionMetadatum
	// we must check the type first to know how to handle it
	for (let key in metadata) {

		if ("map" === key) {
			const mapRet = {};
			const mapData = metadata[key];
			for (let i = 0; i < mapData.length; i++) {
				let mapItem = mapData[i];
				const key = parseMetadata(mapItem["k"]);
				const value = parseMetadata(mapItem["v"]);
				console.log("parseMetadata map: ", key, value); 
				mapRet[key] = value;
			}
			return mapRet;
		} else if ("list" === key) {
			let arrRet = [];
			const arr = metadata[key];
			for (var i = 0; i < arr.length; i++) {
				const elem = parseMetadata(arr[i]);
				arrRet.push(elem);
			}
			console.log("parseMetadata list: ", arrRet); 
			return arrRet;
		} else if ("int" === key) {
			let strValue = metadata[key];
			if (0 > parseInt(metadata[key])) {
				if (typeof strValue !== 'String') {
					strValue = metadata[key].toString();
				}
				return strValue;
			}

			if (typeof strValue !== 'String') {
				strValue = metadata[key].toString();
			}
			let bigValue = CardanoWasm.BigNum.from_str(strValue);
			console.log("parseMetadata int: ", bigValue.to_str()); 
			return bigValue.to_str();

		} else if ("bytes" === key) {
			return metadata[key];
		} else if ("string" === key) {

			let invalidString = "\u0000";
			if (-1 !== metadata[key].indexOf(invalidString)) {
				let subStr = metadata[key].replace(invalidString, "");
				console.log("decodeMetadata2Json replaced text: ", subStr);

				return subStr;
			}
			console.log("parseMetadata text: ",metadata[key]); 
			return metadata[key];
		}

	}

}

function sleep(time) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve();
		}, time);
	})
}

exports.sleep = sleep;

exports.parseMetadata = parseMetadata;

exports.decodeMetadata2Json = decodeMetadata2Json;

exports.encodeUtxo = encodeUtxo;

exports.decodeMaestroMetaData = decodeMaestroMetaData;

exports.convertMaestroUtxoAmount = convertMaestroUtxoAmount;

exports.convertMaestroRedeemers = convertMaestroRedeemers;
// module.exports = UtilTools;
exports.convertMaestroProtocolParams = convertMaestroProtocolParams;

exports.convertMaestroEraSummariesInfo = convertMaestroEraSummariesInfo;

exports.convertMaestroGenesisConfig = convertMaestroGenesisConfig;

exports.convertMaestroEvaluateRet = convertMaestroEvaluateRet;

exports.convertMaestroUtxoScriptInfo = convertMaestroUtxoScriptInfo;

exports.convertMaestroEvaluateRet4PlutusSdk = convertMaestroEvaluateRet4PlutusSdk;

