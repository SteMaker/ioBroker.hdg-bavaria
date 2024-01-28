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
    constructor(url, q, ControlXL) {
        if (url == "" || q == "")
            return;
        this.axiosInstance = axios_1.default.create({
            baseURL: "http://" + url,
            timeout: 15000
        });

        if (ControlXL) {
            const l = q.length;
            let start, end =0;
            let key1,value1,key2,value2 ="";
            let nodes = [];
            let object ={};
            
            for (let i = 0; i <= l; i++) {
                if (q.charAt(i) ==="-"){
                    start = i+1;
                    i=i+3;       
                } else if (q.charAt(i) ==="T") {
                    end =i;
                    nodes.push(q.slice(start,end));
                    start=0;
                    end=0;
                }
            }; 
            for (let i2 =0; i2<= nodes.length-1; i2++){
                key1="nodes["+i2+"][id]";
                value1= nodes[i2];
                key2="nodes["+i2+"][type]";
                value2="text";
                object[key1] = value1;
                object[key2] = value2;
            };
            this.dataQuery = object; 
        } else {this.dataQuery=q;}
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
