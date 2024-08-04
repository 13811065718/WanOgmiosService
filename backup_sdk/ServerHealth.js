"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerHealth = void 0;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const getServerHealth = async (options) => {
    const reqInfo = `${options?.connection?.address.http}/health`;
    const reqInit = {
        headers: {
            "api-key": options.connection.apiKey
        }
    }
    const response = await (0, cross_fetch_1.default)(reqInfo, reqInit);
    const responseJson = await response.json();
    if (response.ok) {
        return responseJson;
    }
    else {
        throw new Error(response.statusText);
    }
};
exports.getServerHealth = getServerHealth;
//# sourceMappingURL=ServerHealth.js.map
