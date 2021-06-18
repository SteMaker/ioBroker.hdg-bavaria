"use strict";

const utils = require("@iobroker/adapter-core");
const schedule = require("node-schedule");
const axios = require('axios');
const fs = require('fs')
var path = require('path');

const header = {
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
}
var root = path.dirname(require.main.filename);
var datapoints = JSON.parse(fs.readFileSync(root+'/lib/datapoints.json', 'utf-8'))

function validateIPaddress(ipaddress) {  
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
      return (true)  
    }  
    return (false)  
}
class HdgBavaria extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "hdg-bavaria",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    async onReady() {
        if(validateIPaddress(this.config.ip) == false) {
            this.log.info("Illegal IP Address: "+this.config.ip);
            return;
        }
        if(this.config.name == "") {
            this.log.info("Kein Name gesetzt");
            return;
        }
        if(this.config.pollIntervalMins < 1) {
            this.log.warn("Interval zu klein, setze auf 1 Minute");
            this.config.pollIntervalMins = 1;
        } else if(this.config.pollIntervalMins > 20) {
            this.log.warn("Interval zu groß, setze auf 20 Minuten");
            this.config.pollIntervalMins = 20;
        }
        this.log.info("IP address: " + this.config.ip);
        this.log.info("Name der Heizungsanlage: " + this.config.name);
        this.log.info("Boiler type: " + this.config.boilerType);
        this.log.info("Tank type: " + this.config.tankType);
        this.log.info("Num tanks: " + this.config.numTanks);
        this.log.info("Num heat circuits: " + this.config.numHeatCircuits);
        this.log.info("Polling interval: " + this.config.pollIntervalMins.toString());

        this.axiosInstance = axios.create({
            baseURL: "http://"+this.config.ip,
            timeout: 5000
        });

        this.setObject(this.config.name, {
            type: "device",
            common: {
                name: this.config.name
            },
            native: {},
        });
        this.setObject(this.config.name+".boiler", {
            type: "channel",
            common: {
                name: "Heizkessel",
            },
            native: {},
        });
        this.setObject(this.config.name+".tank", {
            type: "channel",
            common: {
                name: "Puffer",
            },
            native: {},
        });

        for (var i = 0; i < datapoints.boiler[0].datapoints.length; i++) {
            var dp = datapoints.boiler[0].datapoints[i];
            this.setObject(this.config.name+".boiler."+dp.id, {
                type: "state",
                common: {
                    name: dp.name,
                    type: dp.type,
                    role: dp.role,
                    unit: dp.unit,
                    read: true,
                    write: true,
                },
                native: {},
            });
        }
        for (var i = 0; i < datapoints.tank[0].datapoints.length; i++) {
            var dp = datapoints.tank[0].datapoints[i];
            this.setObject(this.config.name+".tank."+dp.id, {
                type: "state",
                common: {
                    name: dp.name,
                    type: dp.type,
                    role: dp.role,
                    unit: dp.unit,
                    read: true,
                    write: true,
                },
                native: {},
            });
        }

        var rule = new schedule.RecurrenceRule();
        // @TODO This not clean, e.g. when using 18 minutes -> 0, 18, 36, 54
        rule.minute = new schedule.Range(0, 59, this.config.pollIntervalMins);
        let that = this;
        var nodes = ""
        for(var i = 0; i < datapoints.boiler[0].datapoints.length; i++) {
            nodes += "-" + datapoints.boiler[0].datapoints[i].dataid + "T"
        }
        for(var j = 0; j < datapoints.tank[0].datapoints.length; j++) {
            nodes += "-" + datapoints.tank[0].datapoints[j].dataid + "T"
        }
        let numDatapoints = datapoints.boiler[0].datapoints.length + datapoints.tank[0].datapoints.length;
        nodes = nodes.substring(1)
        nodes = "nodes="+nodes
        this.job = schedule.scheduleJob(rule, () => {
            this.log.info("Query " + numDatapoints.toString() + " datapoints from " + this.config.ip)
            this.axiosInstance.post('/ApiManager.php?action=dataRefresh',
                nodes,
                { headers: header }
            )
                .then(function (response) {
                    that.log.info("Response from " + that.config.ip + " with " + response.data.length.toString() + " datapoints")
                    if(response.data.length != datapoints.boiler[0].datapoints.length+datapoints.tank[0].datapoints.length) {
                        that.log.warn("Unexpected length of response from "+that.config.ip);
                        return;
                    }
                    // @TODO Länge checken, exceptions fangen, neben number andere typen unterstützen
                    for (var i = 0; i < datapoints.boiler[0].datapoints.length; i++) {
                        try {
                        var value = parseInt(response.data[i].text);
                        that.setState(that.config.name+ ".boiler."+datapoints.boiler[0].datapoints[i].id, { val: value, ack: true });
                        } catch(e) {
                            that.log.warn("Exception while reading response");
                            return
                        }
                    }
                    for (var j = 0; j < datapoints.tank[0].datapoints.length; j++) {
                        try {
                        var value = parseInt(response.data[i+j].text)
                        that.setState(that.config.name + ".tank."+datapoints.tank[0].datapoints[j].id, { val: value, ack: true });
                        } catch(e) {
                            that.log.warn("Exception while reading response");
                            return
                        }
                    }
                })
                .catch(function (error) {
                    that.log.info(error);
                });
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.job.cancel()
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new HdgBavaria(options);
} else {
    // otherwise start the instance directly
    new HdgBavaria();
}
