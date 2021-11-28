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
const component_1 = __importDefault(require("./component"));
class Tank extends component_1.default {
    constructor(log_, json) {
        super(log_, json);
        this.energyDatapoints = [];
        // find the temperature sensor data points and fill energyDatapoints
        for (let i = 0; i < this.tempStates.length; i++) {
            for (let j = 0; j < this.states.length; j++) {
                if (this.tempStates[i] == this.states[j].id) {
                    this.energyDatapoints.push(this.states[j]);
                    break;
                }
            }
        }
    }
    calcEnergy() {
        let energy = 0;
        for (let i = 0; i < this.energyDatapoints.length; i++) {
            const kelvin = this.energyDatapoints[i].value + 273.15;
            energy += 1.167 * (this.size / this.energyDatapoints.length) * kelvin;
        }
        return Math.round(energy);
    }
}
__decorate([
    ts_json_object_1.JSONObject.required,
    __metadata("design:type", Number)
], Tank.prototype, "size", void 0);
__decorate([
    ts_json_object_1.JSONObject.required,
    ts_json_object_1.JSONObject.array(String),
    __metadata("design:type", Array)
], Tank.prototype, "tempStates", void 0);
exports.default = Tank;
//# sourceMappingURL=tank.js.map