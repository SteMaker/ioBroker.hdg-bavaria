"use strict";

const utils = require("@iobroker/adapter-core");
const schedule = require("node-schedule");
const axios = require("axios");
const fs = require("fs");
var path = require("path");
const { DH_UNABLE_TO_CHECK_GENERATOR } = require("constants");

const header = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
};
var root = path.dirname(require.main.filename);
var datapoints = JSON.parse(fs.readFileSync(root+"/lib/datapoints.json", "utf-8"));
var statisticsStates = JSON.parse(fs.readFileSync(root+"/lib/statistics_states.json", "utf-8"));


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
        this.nodes = "";
        this.numDatapoints = 0;
    }

    async onReady() {
        var that = this;

        if(!that.sanityCheck())
            return;

        that.axiosInstance = axios.create({
            baseURL: "http://"+that.config.ip,
            timeout: 5000
        });

        // Create device
        that.setObject(that.config.name, {
            type: "device",
            common: {
                name: that.config.name
            },
            native: {},
        });

        that.createLogChannels();
        that.createStatisticsStates();

        // Fix nodes string and do a first query
        that.nodes = that.nodes.substring(1);
        that.nodes = "nodes="+that.nodes;
        that.poll();

        // Schedule regular polling
        var rule = new schedule.RecurrenceRule();
        // @TODO This not clean, e.g. when using 18 minutes -> 0:00, 0:18, 0:36, 0:54, (!) 0:00, 0:18
        // BUT!! We rely on stats that the timer will fire at minute zero of every hour (xx:00)
        rule.minute = new schedule.Range(0, 59, that.config.pollIntervalMins);
        that.job = schedule.scheduleJob(rule, () => {
            that.log.info("Query " + that.numDatapoints.toString() + " datapoints from " + that.config.ip);
            that.poll();
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.job.cancel();
            callback();
        } catch (e) {
            callback();
        }
    }

    sanityCheck() {
        if(this.validateIPaddress(this.config.ip) == false) {
            this.log.info("Illegal IP Address: "+this.config.ip);
            return false;
        }
        if(this.config.name == "") {
            this.log.info("Kein Name gesetzt");
            return false;
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
        this.log.info("Kesseltyp: " + this.config.kesselTyp);
        this.log.info("Puffertyp: " + this.config.pufferTyp);
        this.log.info("Anzahl Puffer: " + this.config.anzahlPuffer);
        this.log.info("Anzahl Heizkreise: " + this.config.anzahlHeizkreise);
        this.log.info("Polling interval: " + this.config.pollIntervalMins.toString());
        return true;
    }

    createLogChannels() {
        var that = this;
        // Create channels
        that.states = [datapoints.kessel[0], datapoints.puffer[0], datapoints.zufuehrung[0], datapoints.heizkreis[0]];
        that.states.forEach(function(item, index, array) {
            that.log.info("Create device " + that.config.name + "." + item.channel);
            that.setObject(that.config.name + "." + item.channel, {
                type: "channel",
                common: {
                    name: item.name,
                },
                native: {},
            });
        });
        // Create states and list of nodes
        that.states.forEach(function(item, index, array) {
            let len = item.states.length;
            that.numDatapoints += len;
            for (let i = 0; i < len; i++) {
                var dp = item.states[i];
                that.log.info("Create state " + that.config.name + "." + item.channel + "." + dp.id);
                that.setObject(that.config.name + "." + item.channel + "." + dp.id, {
                    type: "state",
                    common: {
                        name: dp.name,
                        type: dp.iobType,
                        role: dp.iobRole,
                        unit: dp.unit,
                        read: true,
                        write: true,
                    },
                    native: {},
                });
                that.nodes += "-" + dp.dataid + "T";
            }
        });
    }

    createStatisticsStates() {
        var that = this;
        // Create statistics channel
        that.setObject(that.config.name + ".statistics", {
            type: "channel",
            common: {
                name: "statistics",
            },
            native: {},
        });

        let len = statisticsStates.statisticsStates.length;
        for (let i = 0; i < len; i++) {
            var statsState = statisticsStates.statisticsStates[i];
            switch (statsState.statsType) {
            case "binaryTimeAccumulateDay":
                that.createBinaryTimeAccumulateDayState(statsState);
                break;
            case "delta7Days":
                that.createDelta7DaysState(statsState);
                break;
            }
        }
    }

    createBinaryTimeAccumulateDayState(statsState) {
        var that = this;
        that.createState(that.config.name, "statistics", statsState.id, {
            name: statsState.name,
            type: "number",
            role: "value",
            unit: "s",
            read: true,
            write: false,
        });
    }

    createDelta7DaysState(statsState) {
        var that = this;
        that.createState(that.config.name, "statistics", statsState.id+"PerDay", {
            name: statsState.name,
            type: "array",
            role: "list",
            read: true,
            write: true
        });
    }

    poll() {
        var that = this;
        that.axiosInstance.post("/ApiManager.php?action=dataRefresh",
            that.nodes,
            { headers: header }
        )
            .then(function (response) {
                that.log.info("Response from " + that.config.ip + " with " + response.data.length.toString() + " datapoints");
                if (response.data.length != that.numDatapoints) {
                    that.log.warn("Unexpected length of response from " + that.config.ip);
                    return;
                }

                let dpCnt = 0;
                that.states.forEach(function (item, index, array) {
                    let len = item.states.length;
                    for (let i = 0; i < len; i++) {
                        that.log.info("Updating channel " + item.name + " " + item.states[i].id);
                        var dp = item.states[i];
                        try {
                            var value = that.parseDatapoint(dp, response.data[dpCnt].text);
                            that.setState(that.config.name + "." + item.channel + "." + dp.id, { val: value, ack: true });
                            that.statsUpdate(item.channel, dp.id, value);
                        } catch (e) {
                            that.log.warn("Exception while reading response of element " + i.toString());
                            return;
                        }
                        dpCnt++;
                    }
                });
            })
            .catch(function (error) {
                that.log.info(error);
            });
    }

    validateIPaddress(ipaddress) {
        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
            return (true);
        }
        return (false);
    }

    parseDatapoint(cfg, text) {
        if (cfg.hdgType == "int") {
            return parseInt(text);
        } else if (cfg.hdgType == "float") {
            return parseFloat(text);
        } else if (cfg.hdgType == "string") {
            return text;
        }
    }

    statsUpdate(channel, stateId, value) {
        this.log.info("Searching for "+channel+", "+stateId);
        let len = statisticsStates.statisticsStates.length;
        for (let i = 0; i < len; i++) {
            var statsChannel = statisticsStates.statisticsStates[i];
            if (statsChannel.channel == channel && statsChannel.stateId == stateId) {
                this.statsStateUpdate(statsChannel, value);
            }
        }
    }

    statsStateUpdate(statsState, value) {
        var that = this;
        var date = new Date();
        if (statsState.statsType == "binaryTimeAccumulateDay") {
            if(date.getHours() == 0 && date.getMinutes() == 0) {
                that.log.info("Resetting stats for "+statsState.name);
                statsState.value = 0;
                that.setState(that.config.name + ".statistics." + statsState.id, { val: statsState.value, ack: true });
            }
            if (value != 0) {
                that.log.info("Increasing active time of "+statsState.name);
                statsState.value = statsState.value + that.config.pollIntervalMins*60;
                that.setState(that.config.name + ".statistics." + statsState.id, { val: statsState.value, ack: true });
            } else {
                that.log.info("Not increasing active time of "+statsState.name);
            }
        } else if (statsState.statsType == "delta7Days") {
            //if(date.getHours() == 0 && date.getMinutes() == 0) {
            if((date.getMinutes()%3) == 0) {
                that.getState(that.config.name + ".statistics." + statsState.id+"PerDay", function(err, oldValues) {
                    if(oldValues == null) {
                        // Initialize all 7 days with 0, might not be ideal :(
                        that.setState(that.config.name + ".statistics." + statsState.id+"PerDay", [0,0,0,0,0,0,0]);
                    } else if(oldValues.val != null && oldValues.val.length && oldValues.length != 7) {
                        // Initialize all 7 days with 0, might not be ideal :(
                        that.setState(that.config.name + ".statistics." + statsState.id+"PerDay", [0,0,0,0,0,0,0]);
                    }
                    that.getState(that.config.name + ".statistics." + statsState.id + "PerDay", function (err, oldValues) {
                        that.log.info("per day update of " + statsState.id + ", length = " + oldValues.length);
                    });
                });
                //that.setState(that.config.name + ".statistics." + statsState.id, { val: statsState.value, ack: true });
            }
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
