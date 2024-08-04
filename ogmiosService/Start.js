const serviceFramework = require("./framework/ServiceFramework");
const ApiService = require("./services/apiService/ApiService");
const TaskService = require('./services/taskservice/TaskSchedule');
const StorageService = require("./services/storageservice/StorageService");
const StorageMongoDB = require("./services/storageservice/StorageMongoDB");
const ConfigServiceJson = require('./services/configservice/ConfigServiceJson');
const ChainSyncService = require('./services/chainSyncService/ChainSyncService');
const ChainSyncMaestroService = require('./services/chainSyncService/ChainSyncMaestroService');
const OgmiosRouterService = require('./services/endPointService/OgmiosRouterService');
const SecurityConfirmService = require('./services/securityConfirmService/SecurityConfirmService');
const Log4UtilService = require('./services/utilService/Log4UtilService');
const IWanService = require('./services/iWanService/IWanService');
const GlobalConstant = require("./services/globalConstantService/globalConstant");

const path = require('path');
const fs = require('fs');


class Start {
    constructor(options) {
    }

    async start() {
        try {
            console.log("Start.start()****************************")
            serviceFramework.registerService("GlobalConstantService", "GlobalConstant", GlobalConstant);

            // Config Service
            let cfgDir = path.join(__dirname, '../config');
            let configServiceJson = new ConfigServiceJson(cfgDir);
            await configServiceJson.init();
            serviceFramework.registerService("ConfigServiceInterface", "ConfigServiceJson", configServiceJson);
            console.log("Start.start()***************************1");

            // Log4UtilService Service
            let log4UtilService = new Log4UtilService();
            log4UtilService.init();
            serviceFramework.registerService("UtilServiceInterface", "Log4UtilService", log4UtilService);
            console.log("Start.start()****************************2");

            // Storage Service
            let mongoUrl = await configServiceJson.getGlobalConfig("mongo_url");
            let storageService = new StorageService(mongoUrl, StorageMongoDB);
            storageService.init();
            serviceFramework.registerService("StorageServiceInterface", "StorageService", storageService);
            console.log("Start.start()****************************3");

            // Task Service
            let taskService = new TaskService();
            serviceFramework.registerService("TaskServiceInterface","taskSchedule", taskService);

            // IWan Service
            let iWanService = new IWanService();
            await iWanService.init();
            iWanService.startUp();
            serviceFramework.registerService("AgentServiceInterface","IWanService", iWanService);

            // ChainSyncService
            let ogmiosVersion = await configServiceJson.getGlobalConfig("cardanoOgmiosVersion");
            // modify: chainSyncService need to surport a interface to intial synced blocknum
            let chainSyncService = ("v6" === ogmiosVersion) ? new ChainSyncMaestroService() : new ChainSyncService();
            await chainSyncService.init();
            await chainSyncService.startUp();
            serviceFramework.registerService("EndPointServiceInterface", "ChainSyncService", chainSyncService);
            console.log("Start.start()****************************4");

            // SecurityConfirmService
            let securityConfirmService = new SecurityConfirmService();
            await securityConfirmService.init();
            securityConfirmService.startUp();
            serviceFramework.registerService("AgentServiceInterface", "SecurityConfirmService", securityConfirmService);
            console.log("Start.start()****************************5");

            // OgmiosRouterService
            let ogmiosRouterService = new OgmiosRouterService();
            await ogmiosRouterService.init();
            serviceFramework.registerService("EndPointServiceInterface", "OgmiosRouterService", ogmiosRouterService);
            console.log("Start.start()****************************6");

            // ApiService Service
            let apiService = new ApiService();
            await apiService.init();
            await apiService.startUp();
            serviceFramework.registerService("APIServiceInterface", "WanOgmiosApiService", apiService);
            console.log("Start.start()****************************7");

        } catch (err) {
            console.log("err message:", err.message);
            console.log("err stack:", err.stack);
        }
    }
}

let start = new Start();
start.start();
console.log("running...");

module.exports = start;
