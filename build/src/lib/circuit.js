"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const component_1 = __importDefault(require("./component"));
class Circuit extends component_1.default {
    constructor(log_, channel, instance, origJson) {
        const json = JSON.parse(JSON.stringify(origJson));
        for (let i = 0; i < json.states.length; i++) {
            const dataid = parseInt(json.states[i].dataid) + instance * 100;
            json.states[i].dataid = dataid.toString();
        }
        json.channel = channel;
        super(log_, json);
    }
}
exports.default = Circuit;
//# sourceMappingURL=circuit.js.map