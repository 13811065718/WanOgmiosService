
const { sleep } = require("../ogmiosService/services/utilService/commonUtils");


const {
  createInteractionContext,
  createChainSynchronizationClient,
} = require('@cardano-ogmios/client');



class ChainSyncMaestroService  {
  constructor() {

    this.chainType = "ADA";
    console.log("\n\n\n... instance ChainSyncMaestroService...");
  }

  async init() {
    // step 1: to get related service component
    this.initialSyncTips = new Array();
    let aPoint = {
      "blockHeight": 10342530,
      "slot": 124707576,
      "id": "6efd56bff0fb3bcdb43232705e5ffe8723fc8a25d4f1d7712eebe7887a201610"
    }
    let bPoint = {
      "blockHeight": 10342531,
      "slot": 124707582,
      "id": "9d54aa54d3b016797cc144af4b6e611732ccd519ad03277dea812ff6f5cdb57a"
    }
    let cPoint = {
      "blockHeight": 10342532,
      "slot": 124707638,
      "id": "2ca3cc1a5e78ee6e579ce19141d367ea135503232fd1605677291d1f522fe2a1"
    }
    let dPoint = {
      "blockHeight": 10342533,
      "slot": 124707648,
      "id": "f220859c8fafbcaf682152fd6de915c2b718b5b39e018f322a315c1c7e7e3313"
    }
    let ePoint = {
      "blockHeight": 10342534,
      "slot": 124707659,
      "id": "315ecf9357bd7064302c4b77116560347967a3f15f5b375c45dca795a23c87ea"
    }

    this.initialSyncTips.push(aPoint);
    this.initialSyncTips.push(bPoint);
    this.initialSyncTips.push(cPoint);
    this.initialSyncTips.push(dPoint);
    this.initialSyncTips.push(ePoint);
    //this.initialSyncTips.push(fPoint);
    console.log("\n\n...initial tips: ", this.initialSyncTips);

    let fPoint = {
      "blockHeight": 10342535,
      "slot": 124707699,
      "id": "475ecf9357bd7064302c4b77116560347967a3f15f5b375c45dca795a23c87ea"
    }
    this.initialSyncTips = this.prependSyncedTips(this.initialSyncTips, fPoint);
    console.log("\n\n...updated tips: ", this.initialSyncTips);

    // initial ogmios client
    await this.connectOgmiosNode();

  }


  prependSyncedTips(aryTips, point){
    let m = aryTips.slice();
    console.log("\n\n...sliced tips: ", m);

    m.unshift(point);
    console.log("\n\n...unshifted tips: ", m);

    if(10 < m.length){
      m.pop();
    }

    return m;
  }

  async reconnectOgmiosNode() {
    setTimeout(async () => {
      try {
        console.log("ChainSyncMaestroService...try to reconnectOgmiosNode...");
        await this.connectOgmiosNode();

        console.log("ChainSyncMaestroService...reconnectOgmiosNode...prePoints...", prePoints);

        this.syncClient.resume(this.initialSyncTips, 1);

      } catch (error) {
        console.log("ChainSyncMaestroService...reconnectOgmiosNode...error...", error);
        this.reconnectOgmiosNode();
      }

    }, 10000);
  }

  async connectOgmiosNode() {

    console.log("\n\n***chain Sync service create ws connection");
    this.context = await createInteractionContext(this.errorHandler.bind(this),
      this.closeHandler.bind(this),
      {
        "connection": {
          host: "ogmios.wanchain.gomaestro-api.org",
          port: "",
          tls: true,
          apiKey: "v0LXAjiRQAm3PNjlFSlqB8rfgUp7OExE"
        },
        "interactionType": 'LongRunning'
      });

    console.log("\n\n***chain Sync service create sync client");
    this.syncClient = await createChainSynchronizationClient(this.context,
      {
        rollForward: this.rollForward.bind(this),
        rollBackward: this.rollBackward.bind(this)
      });
  }

  async errorHandler(error) {
    console.log("ChainSyncMaestroService...errorHandler...error...", error);
    // await client.shutdown();
  }

  async closeHandler(code, reason) {
    // console.log('WS close: code =', code, 'reason =', reason);
    console.log("ChainSyncMaestroService...closeHandler...code...", code);
    // await client.shutdown();
    await this.reconnectOgmiosNode();
    console.log("ChainSyncMaestroService...closeHandler...reconnectOgmiosNode done!");
  }

  //scan block backward nomally
  async rollForward({ block }, requestNext) {
    console.log("\n\n... rollForward blockInfo: ", block);
    if(undefined === block){
      await sleep(1000);
      requestNext();
    }

    let blockInfo = block;

    console.log("ChainSyncMaestroService...rollForward...preBlockHeight...", blockInfo.height);

    await sleep(30000);
    requestNext();
  }

  // handle chain rollback 
  async rollBackward({ point }, requestNext) {
    // console.log('\n....[ROLLBACK]', point);
    console.log("\n\n...ChainSyncMaestroService...rollBackward...point...", point);

    this.preSlot = point.slot;
    this.preHash = point.id;
    this.preBlockHeight = undefined;
    console.log("\n\n\n***ChainSyncMaestroService...rollBackward...prePoints...", this.preSlot, this.preHash);

    await sleep(1000);
    requestNext();
  }


  async startUp() {

    console.log("\n\n...ChainSyncMaestroService startUp! ");
    await this.syncClient.resume(this.initialSyncTips, 1);
  }

}

async function main(){

  let ogmiosClient = new ChainSyncMaestroService();

  await ogmiosClient.init();

  await ogmiosClient.startUp();

}

main();
