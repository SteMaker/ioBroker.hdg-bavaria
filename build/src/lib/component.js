"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_json_object_1 = require("ts-json-object");
const datapoint_1 = __importDefault(require("./datapoint"));
class Component extends ts_json_object_1.JSONObject {
    constructor(log_, json) {
        super(json);
        this.log = log_;
    }
}
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Component.prototype, "typeName", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Component.prototype, "supported", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Component.prototype, "channel", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Component.prototype, "name", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    ts_json_object_1.JSONObject.array(datapoint_1.default),
    __metadata("design:type", Array)
], Component.prototype, "states", void 0);
exports.default = Component;
//# sourceMappingURL=component.js.map