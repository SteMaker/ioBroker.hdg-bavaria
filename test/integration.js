// adatper config code partly taken from fritzbox adapter
require('log-timestamp');
const path = require("path");
const ServerMock = require("mock-http-server");
const { tests, utils } = require("@iobroker/testing");
const { expect } = require('chai');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let valueInt = Math.floor(Math.random() * 100);
let value1String = valueInt.toString()
let value2String = (valueInt+1).toString()
const requestJson = JSON.stringify([{ "background": "", "text": "Standby", "hidden": true, "id": 22026 }, { "background": "", "text": "64 \u00b0C", "hidden": true, "id": 22003 }, { "background": "", "text": "60 \u00b0C", "hidden": true, "id": 22004 }, { "background": "", "text": "53 \u00b0C", "hidden": true, "id": 22001 }, { "background": "", "text": "Eingeschaltet", "hidden": true, "id": 22020 }, { "background": "", "text": "0 \u00b0C", "hidden": true, "id": 22021 }, { "background": "", "text": "0%", "hidden": true, "id": 22030 }, { "background": "", "text": "274.0 Std", "hidden": true, "id": 22011 }, { "background": "", "text": "0%", "hidden": true, "id": 22024 }, { "background": "", "text": "828.0 Std", "hidden": true, "id": 22025 }, { "background": "", "text": "61 \u00b0C", "hidden": true, "id": 24000 }, { "background": "", "text": "38 \u00b0C", "hidden": true, "id": 24001 }, { "background": "", "text": "34 \u00b0C", "hidden": true, "id": 24002 }, { "background": "", "text": "55 \u00b0C", "hidden": true, "id": 24004 }, { "background": "", "text": "40 \u00b0C", "hidden": true, "id": 24006 }, { "background": "", "text": "55 \u00b0C", "hidden": true, "id": 24098 }, { "background": "", "text": "0 \u00b0C", "hidden": true, "id": 24099 }, { "background": "", "text": "Freigabezeit", "hidden": true, "id": 1402 }, { "background": "", "text": "4330 kg", "hidden": true, "id": 21006 }, { "background": "", "text": "980 kg", "hidden": true, "id": 21007 }, { "background": "", "text": "24.06.21 5060kg", "hidden": true, "id": 21008 }, { "background": "", "text": "21 \u00b0C", "hidden": true, "id": 6022 }, { "background": "", "text": "16 \u00b0C", "hidden": true, "id": 6023 }, { "background": "", "text": "44 \u00b0C", "hidden": true, "id": 26099 }, { "background": "", "text": value1String + " \u00b0C", "hidden": true, "id": 26000 }, { "background": "", "text": "21 \u00b0C", "hidden": true, "id": 6022 }, { "background": "", "text": "16 \u00b0C", "hidden": true, "id": 6023 }, { "background": "", "text": "44 \u00b0C", "hidden": true, "id": 26099 }, { "background": "", "text": value2String + " \u00b0C", "hidden": true, "id": 26100 }]);

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
    //            ~~~~~~~~~~~~~~~~~~~~~~~~~
    // This should be the adapter's root directory

    // If the adapter may call process.exit during startup, define here which exit codes are allowed.
    // By default, termination during startup is not allowed.
    allowedExitCodes: [],

    // Define your own tests inside defineAdditionalTests
    // Since the tests are heavily instrumented, you need to create and use a so called "harness" to control the tests.
    defineAdditionalTests(getHarness) {
        describe("Check comm with HDG control mock, configured for 2 circuits", () => {
            // Run an HTTP server on localhost:9003
            var server = new ServerMock({ host: "127.0.0.1", port: 9003 });

            beforeEach(function (done) {
                console.log("mock server start");
                server.start(done);
            });

            afterEach(function (done) {
                console.log("mock server stop");
                server.stop(done);
            });

            it("Should work", () => {
                return new Promise(async (resolve) => {
                    // Create a fresh harness instance each test!
                    const harness = getHarness();
                    console.log("Simulating vorlauftemperatur at "+valueInt);
                    console.log(requestJson);
                    let cfg = {
                        native: {
                            "ip": "localhost:9003",
                            "name": "Test",
                            "heizkreise": ["heizkreis1", "heizkreis2"]
                        }
                    }
                    await harness.changeAdapterConfig("hdg-bavaria", cfg)
                    server.on({
                        method: "POST",
                        path: "*",
                        reply: {
                            status: 200,
                            headers: { "content-type": "application/json" },
                            body: function(req) {
                                expect(req).to.be.a("object");
                                expect(req).to.have.property("body")
                                expect(req.body).to.have.property("nodes")
                                console.log("nodes: "+req.body.nodes)
                                expect(req.body.nodes.search("26000T")).to.be.greaterThanOrEqual(0)
                                console.log("mock server reply POST to request "+JSON.stringify(req.body));
                                return requestJson
                            }
                        }
                    });
                    // Start the adapter and wait until it has started
                    console.log("Starting Adapter");
                    await harness.startAdapterAndWait();
                    console.log("Adapter started");
                    await sleep(5000);
                    console.log("Checking state ...");
                    let state1 = await harness.states.getState("hdg-bavaria.0.Test.heizkreis1.vorlauftemperatur")
                    expect(state1).to.exist;
                    expect(state1.val).to.exist
                    expect(state1.val).to.be.equal(valueInt);
                    let state2 = await harness.states.getState("hdg-bavaria.0.Test.heizkreis2.vorlauftemperatur")
                    expect(state2).to.exist;
                    expect(state2.val).to.exist
                    expect(state2.val).to.be.equal(valueInt+1);
                    console.log("All good :)")
                    resolve(0);
                    console.log("Resolved")
                });
            }).timeout(10000);
        });
    }
});