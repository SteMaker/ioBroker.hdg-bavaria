"use strict";
/*
 * Created with @iobroker/create-adapter v2.0.1
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = __importStar(require("@iobroker/adapter-core"));
const schedule = __importStar(require("node-schedule"));
const hdgcomm_1 = require("./hdgcomm");
const datapoints_json_1 = __importDefault(require("../lib/datapoints.json"));
const boiler_1 = __importDefault(require("./lib/boiler"));
const tank_1 = __importDefault(require("./lib/tank"));
const supply_1 = __importDefault(require("./lib/supply"));
const circuit_1 = __importDefault(require("./lib/circuit"));
class HdgBavaria extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "hdg-bavaria",
        });
        this.numDatapoints = 0;
        this.nodes = "";
        this.hdgComm = null;
        this.job = null;
        this.boiler = null;
        this.tank = null;
        this.supply = null;
        this.circuit = [];
        this.on("ready", this.onReady.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        if (!this.sanityCheck()) {
            this.terminate("Aborting adapter");
        }
        if (!this.readConfiguration()) {
            this.terminate("Aborting adapter");
        }
        this.log.info("Creating device");
        // Create device
        this.setObject(this.config.name, {
            type: "device",
            common: {
                name: this.config.name
            },
            native: {},
        });
        this.nodes += await this.createLogStates();
        await this.createStatisticsStates();
        this.log.info("All states created! Using " + this.nodes + " to query HDG");
        // Fix nodes string and do a first query
        this.nodes = this.nodes.substring(1);
        this.nodes = "nodes=" + this.nodes;
        this.hdgComm = new hdgcomm_1.HdgComm(this.config.ip, this.nodes);
        this.poll();
        // Schedule regular polling
        this.job = schedule.scheduleJob("*/" + this.config.pollIntervalMins + " * * * *", () => {
            this.poll();
        });
        this.log.info("Adapter started");
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        var _a;
        try {
            (_a = this.job) === null || _a === void 0 ? void 0 : _a.cancel();
            callback();
        }
        catch (e) {
            callback();
        }
    }
    readConfiguration() {
        try {
            for (let i = 0; i < datapoints_json_1.default.kessel.length; i++) {
                if (datapoints_json_1.default.kessel[i].typeName == this.config.kesselTyp) {
                    this.boiler = new boiler_1.default(this.log, datapoints_json_1.default.kessel[i]);
                    break;
                }
            }
        }
        catch (e) {
            this.log.error("Kesselkonfiguration ungültig, konnte nicht eingelesen werden");
            this.log.error(e.message);
            return false;
        }
        if (this.boiler == null) {
            this.log.error("Kesseltyp wurde nicht gefunden");
            return false;
        }
        try {
            for (let i = 0; i < datapoints_json_1.default.puffer.length; i++) {
                if (datapoints_json_1.default.puffer[i].typeName == this.config.pufferTyp) {
                    this.tank = new tank_1.default(this.log, datapoints_json_1.default.puffer[i]);
                    break;
                }
            }
        }
        catch (e) {
            this.log.error("Pufferkonfiguration ungültig, konnte nicht eingelesen werden");
            this.log.error(e.message);
            return false;
        }
        if (this.tank == null) {
            this.log.error("Puffertype wurde nicht gefunden");
            return false;
        }
        try {
            for (let i = 0; i < datapoints_json_1.default.zufuehrung.length; i++) {
                if (datapoints_json_1.default.zufuehrung[i].typeName == "Standard") { // @TODO: Nothing else supported
                    this.supply = new supply_1.default(this.log, datapoints_json_1.default.zufuehrung[i]);
                    break;
                }
            }
        }
        catch (e) {
            this.log.error("Zuführungskonfiguration ungültig, konnte nicht eingelesen werden");
            this.log.error(e.message);
            return false;
        }
        if (this.supply == null) {
            this.log.error("Zuführungstyp wurde nicht gefunden");
            return false;
        }
        try {
            for (let i = 0; i < datapoints_json_1.default.heizkreis.length; i++) {
                if (datapoints_json_1.default.heizkreis[i].typeName == "Standard") { // @TODO: Nothing else supported
                    for (let instance = 0; instance < this.config.heizkreise.length; instance++) {
                        this.circuit.push(new circuit_1.default(this.log, this.config.heizkreise[instance], instance, datapoints_json_1.default.heizkreis[i]));
                    }
                    break;
                }
            }
        }
        catch (e) {
            this.log.error("Heizkreiskonfiguration ungültig, konnte nicht eingelesen werden");
            this.log.error(e.message);
            return false;
        }
        if (this.circuit == null) {
            this.log.error("Heizkreistyp wurde nicht gefunden");
            return false;
        }
        this.components = [this.boiler, this.tank, this.supply];
        for (let i = 0; i < this.circuit.length; i++)
            this.components.push(this.circuit[i]);
        return true;
    }
    sanityCheck() {
        this.log.info("sanity check");
        if (this.validateIPaddress(this.config.ip) == false) {
            this.log.error("Illegal IP Address: " + this.config.ip);
            return false;
        }
        if (this.config.name == "") {
            this.log.error("Kein Name gesetzt");
            return false;
        }
        if (this.config.pollIntervalMins < 1) {
            this.log.warn("Interval zu klein, setze auf 1 Minute");
            this.config.pollIntervalMins = 1;
        }
        else if (this.config.pollIntervalMins > 20) {
            this.log.warn("Interval zu groß, setze auf 20 Minuten");
            this.config.pollIntervalMins = 20;
        }
        this.log.info("IP address: " + this.config.ip);
        this.log.info("Name der Heizungsanlage: " + this.config.name);
        this.log.info("Kesseltyp: " + this.config.kesselTyp);
        this.log.info("Puffertyp: " + this.config.pufferTyp);
        this.log.info("Anzahl Puffer: " + this.config.anzahlPuffer);
        this.log.info("Heizkreise: " + this.config.heizkreise.toString());
        this.log.info("Polling interval: " + this.config.pollIntervalMins.toString());
        return true;
    }
    validateIPaddress(ipaddress) {
        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
            return (true);
        }
        else if (/^(localhost):([0-9]{1,5})$/.test(ipaddress)) {
            return (true);
        }
        return (false);
    }
    async createLogStates() {
        let nodes = "";
        for (let i = 0; i < this.components.length; i++) {
            const c = this.components[i];
            const channel = c.channel;
            this.log.info("Create channel " + this.config.name + "." + c.channel);
            await this.setObjectNotExistsAsync(this.config.name + "." + c.channel, {
                type: "channel",
                common: {
                    name: c.name,
                },
                native: {},
            });
            const len = c.states.length;
            this.numDatapoints += len;
            for (let j = 0; j < len; j++) {
                const state = c.states[j];
                this.log.info("Create state " + this.config.name + "." + channel + "." + state.id);
                const stateCommon = {
                    unit: state.unit,
                    name: state.name,
                    type: state.iobType,
                    role: state.iobRole,
                    read: true,
                    write: true,
                };
                await this.createStateAsync(this.config.name, c.channel, state.id, stateCommon);
                nodes += "-" + state.dataid + "T";
            }
        }
        console.log("createLogStates returning " + nodes);
        return nodes; //new Promise<string>(() => {console.log("resolving");resolve(nodes)});
    }
    async createStatisticsStates() {
        // Create statistics channel
        await this.setObjectNotExistsAsync(this.config.name + ".statistics", {
            type: "channel",
            common: {
                name: "statistics",
            },
            native: {},
        });
        await this.createStateAsync(this.config.name, "statistics", "ThermischeKapazitaet", {
            name: "Aktuelle thermische Kapazität des Puffers",
            type: "number",
            role: "level",
            unit: "Wh",
            read: true,
            write: false,
        });
        return;
    }
    poll() {
        var _a;
        this.log.info("Query " + this.numDatapoints.toString() + " datapoints from " + this.config.ip);
        (_a = this.hdgComm) === null || _a === void 0 ? void 0 : _a.dataRefresh((data, error) => {
            if (data.length != this.numDatapoints) {
                this.log.warn("Error when reading data: " + error);
                this.log.warn("Unexpected length " + data.length + " of response from " + this.config.ip);
                return;
            }
            let dpCnt = 0;
            for (let i = 0; i < this.components.length; i++) {
                for (let j = 0; j < this.components[i].states.length; j++) {
                    const c = this.components[i];
                    const state = this.components[i].states[j];
                    try {
                        const value = this.parseDatapoint(state, data[dpCnt].text);
                        if (value != undefined) {
                            this.setState(this.config.name + "." + c.channel + "." + state.id, { val: value, ack: true });
                            state.value = value;
                        }
                    }
                    catch (e) {
                        this.log.warn("Exception while reading response of element " + i.toString());
                        return;
                    }
                    dpCnt++;
                }
            }
            if (this.tank !== null) {
                this.log.debug("Updating tank energy");
                this.setState(this.config.name + ".statistics.ThermischeKapazitaet", { val: this.tank.calcEnergy(), ack: true });
            }
        });
    }
    parseDatapoint(state, text) {
        if (state.hdgType == "int") {
            return parseInt(text);
        }
        else if (state.hdgType == "float") {
            return parseFloat(text);
        }
        else if (state.hdgType == "string") {
            return text;
        }
        else {
            return "";
        }
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new HdgBavaria(options);
}
else {
    // otherwise start the instance directly
    (() => new HdgBavaria())();
}
//# sourceMappingURL=main.js.map