
const CBOR = require('cbor')

let beginBlock = {
    // height: 1989630,
    // slot: 9826770,
    // date: "2020/11/01 01:59:46"
    height: 1989631,
    slot: 9826800,
    date: "2020/11/01 02:00:16"
}

let targetBlock = {
    // height: 1989631,
    // slot: 9826800,
    // date: "2020/11/01 02:00:16"
    height: 10527900,
    slot: 128496245,
    date: "2024/07/05 07:27:00"
}

let strTargetBlockTime = targetBlock.date;
let adaTargetBlockTimeStamp = new Date(strTargetBlockTime).getTime();
console.log("TargetBlockTimeStamp:", adaTargetBlockTimeStamp/1000);

// let GenesisBlockSlot = beginBlock.slot; 
// let strAdaGenesisBlockTime = beginBlock.date;
// let adaGenesisBlockTimeStamp = new Date(strAdaGenesisBlockTime).getTime()/1000;
// console.log("adaGenesisBlockTimeStamp:", adaGenesisBlockTimeStamp);


// let targetBlockSlot = targetBlock.slot; 
// let deltaTime = (targetBlockSlot - GenesisBlockSlot);
// console.log("deltaTime:", deltaTime);
// let targetBlockTimeStamp = adaGenesisBlockTimeStamp + deltaTime;
// console.log("targetBlockTimeStamp:", targetBlockTimeStamp);


// let strTargetBlockTime = targetBlock.date;
// let adaTargetBlockTimeStamp = new Date(strTargetBlockTime).getTime();
// console.log("TargetBlockTimeStamp:", adaTargetBlockTimeStamp/1000);


// let invalidString = "\u0000";
// console.log("\n\n\ninvalidString: ", invalidString);
// let strTarget = "\u0000\r�@CSWAP Allies";
// console.log("strTarget: ", strTarget);

// let indexErrStr = strTarget.indexOf(invalidString);
// let validBeginIndex = indexErrStr + invalidString.length;
// console.log("errString index: ", indexErrStr, invalidString.length);
// console.log("valid begin index", validBeginIndex);

// let validStringA = strTarget.slice(validBeginIndex);
// console.log("validString", validStringA);

// let validStringB = strTarget.replace(invalidString, ""); //.replace(" ", "_");
// console.log("validString", validStringB);



// let mapGeneral = new Map();

// let mapSubMemberA = new Map();
// mapSubMemberA.set(1, "12");
// mapSubMemberA.set(2, "123");
// mapGeneral.set("A", mapSubMemberA);

// let mapSubMemberB = new Map();
// mapSubMemberB.set(1, "ab");
// mapSubMemberB.set(2, "abc");
// mapGeneral.set("B", mapSubMemberB);

// for (let key of mapGeneral.keys()) {
//     console.log("\n\n...generalMap key...", key);
//     let mapSubMember = mapGeneral.get(key);
//     for (let subKey of mapSubMember.keys()) {
//         console.log("...memberMap subKey...", subKey, mapSubMember.get(subKey)); 
//     }
// }

// let memberMap = mapGeneral.get("B");
// memberMap.set(5, "abcdef");

// for (let key of mapGeneral.keys()) {
//     console.log("\n\n...generalMap key...", key);
//     let mapSubMember = mapGeneral.get(key);
//     for (let subKey of mapSubMember.keys()) {
//         console.log("...updated memberMap subKey...", subKey, mapSubMember.get(subKey)); 
//     }
// }




