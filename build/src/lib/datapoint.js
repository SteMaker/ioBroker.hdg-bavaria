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
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = void 0;
const ts_json_object_1 = require("ts-json-object");
class Datapoint extends ts_json_object_1.JSONObject {
}
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "id", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "name", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "iobType", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "iobRole", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "unit", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "dataid", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", String)
], Datapoint.prototype, "hdgType", void 0);
exports.default = Datapoint;
class State {
}
exports.State = State;
//# sourceMappingURL=datapoint.js.map