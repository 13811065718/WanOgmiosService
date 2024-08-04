const APIServiceInterface = require('../../interfaces/APIServiceInterface');
const ServiceFramework = require("../../framework/ServiceFramework");

//导入http模块
var http = require('http');

class ApiService extends APIServiceInterface {

    /**
     *Creates an instance of BCConnectorIWan.
     * @param {*} option = {apiKey:'', secretKey:, urlOption:{}}
     * @memberof BCConnectorIWan
     */
    constructor() {
        super();

    }

    async init() {

        this.ogmiosRouterService = ServiceFramework.getService("EndPointServiceInterface", "OgmiosRouterService");
        this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
        this.webPort = await this.configService.getConfig("APIServiceInterface", "APIService", "webPort");

        console.log("webPort", this.webPort);
    }

    async startUp() {
        console.log('\n\n ......api service startUp......');

        let that = this;

        http.createServer(function (request, response) {
            request.setEncoding('utf-8');
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
            response.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS,PUT');
            response.setHeader('Content-Type', 'application/json;charset=utf-8');
            response.setTimeout(60000);
            // console.log('\n\n ......wan ogmios service beginning......');

            let postData = "";
            request.on("data", function (postDataChunk) {
                postData += postDataChunk;
            });

            request.on("end", async function () {
                let result = await that.ogmiosRouterService.handlerRequest(request.url, postData);
                if(undefined === result){
                    response.writeHead(503, { 'Content-Type': 'text/html;charset=utf-8' });//设置response编码为utf-8
                    response.end("WebSocket is closed");

                }else{
                    response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });//设置response编码为utf-8
                    response.end(JSON.stringify(result));
                }
            });

        }).listen(this.webPort);

    }


}

module.exports = ApiService;
