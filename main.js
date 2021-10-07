"use strict";

const utils = require("@iobroker/adapter-core");
const schedule = require("node-schedule");
const axios = require("axios");
const fs = require("fs");
var path = require("path");

const header = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
};
var root = path.dirname(require.main.filename);
var datapoints = JSON.parse(fs.readFileSync(root+"/lib/datapoints.json", "utf-8"));
var statsChannels = JSON.parse(fs.readFileSync(root+"/lib/stats_channels.json", "utf-8"));


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
        var that = this;
        if(this.validateIPaddress(this.config.ip) == false) {
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
        this.log.info("Kesseltyp: " + this.config.kesselTyp);
        this.log.info("Puffertyp: " + this.config.pufferTyp);
        this.log.info("Anzahl Puffer: " + this.config.anzahlPuffer);
        this.log.info("Anzahl Heizkreise: " + this.config.anzahlHeizkreise);
        this.log.info("Polling interval: " + this.config.pollIntervalMins.toString());

        this.axiosInstance = axios.create({
            baseURL: "http://"+this.config.ip,
            timeout: 5000
        });

        // Create device
        this.setObject(this.config.name, {
            type: "device",
            common: {
                name: this.config.name
            },
            native: {},
        });
        // Create channels
        this.states = [datapoints.kessel[0], datapoints.puffer[0], datapoints.zufuehrung[0], datapoints.heizkreis[0]];
        this.states.forEach(function(item, index, array) {
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
        var nodes = "";
        that.numDatapoints = 0;
        this.states.forEach(function(item, index, array) {
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
                nodes += "-" + dp.dataid + "T";
            }
        });

        that.createStats();

        // Fix nodes string and do a first query
        nodes = nodes.substring(1);
        nodes = "nodes="+nodes;
        this.poll(nodes);

        // Schedule regular polling
        var rule = new schedule.RecurrenceRule();
        // @TODO This not clean, e.g. when using 18 minutes -> 0:00, 0:18, 0:36, 0:54, (!) 0:00, 0:18
        // BUT!! We rely on stats that the timer will fire at minute zero of every hour (xx:00)
        rule.minute = new schedule.Range(0, 59, this.config.pollIntervalMins);
        this.job = schedule.scheduleJob(rule, () => {
            this.log.info("Query " + that.numDatapoints.toString() + " datapoints from " + this.config.ip);
            this.poll(nodes);
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

    createStats() {
        // Create statistics channel
        this.setObject(this.config.name + ".statistics", {
            type: "channel",
            common: {
                name: "statistics",
            },
            native: {},
        });

        let len = statsChannels.statsChannels.length;
        for (let i = 0; i < len; i++) {
            var statsChannel = statsChannels.statsChannels[i];
            this.setObject(this.config.name + ".statistics." + statsChannel.id, {
                type: "state",
                common: {
                    name: statsChannel.name,
                    type: "number",
                    role: "value",
                    unit: "s",
                    read: true,
                    write: false,
                },
                native: {},
            });
        }
    }

    poll(nodes) {
        var that = this;
        this.axiosInstance.post("/ApiManager.php?action=dataRefresh",
            nodes,
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
        let len = statsChannels.statsChannels.length;
        for (let i = 0; i < len; i++) {
            var statsChannel = statsChannels.statsChannels[i];
            if (statsChannel.channel == channel && statsChannel.stateId == stateId) {
                this.statsStateUpdate(statsChannel, value);
            }
        }
    }

    statsStateUpdate(channel, value) {
        if (channel.statsType == "binaryTimeAccumulateDay") {
            var date = new Date();
            if(date.getHours() == 0 && date.getMinutes() == 0) {
                this.log.info("Resetting stats for "+channel.name);
                channel.value = 0;
                this.setState(this.config.name + ".statistics." + channel.id, { val: channel.value, ack: true });
            }
            if (value != 0) {
                this.log.info("Increasing active time of "+channel.name);
                channel.value = channel.value + this.config.pollIntervalMins*60;
                this.setState(this.config.name + ".statistics." + channel.id, { val: channel.value, ack: true });
            } else {
                this.log.info("Not increasing active time of "+channel.name);
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
