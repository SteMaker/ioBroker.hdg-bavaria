"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdgComm = void 0;
const axios_1 = __importDefault(require("axios"));
const header = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
};
class HdgComm {
    constructor(url, q) {
        if (url == "" || q == "")
            return;
        this.axiosInstance = axios_1.default.create({
            baseURL: "http://" + url,
            timeout: 15000
        });
        this.dataQuery = q;
    }
    dataRefresh(cb) {
        var _a;
        (_a = this.axiosInstance) === null || _a === void 0 ? void 0 : _a.post("/ApiManager.php?action=dataRefresh", this.dataQuery, { headers: header }).then(function (response) {
            if (response.data)
                cb(response.data, "");
        }).catch(function (error) {
            cb("", error);
        });
    }
}
exports.HdgComm = HdgComm;
//# sourceMappingURL=hdgcomm.js.map