import {JSONObject} from "ts-json-object"
import Datapoint from "./datapoint";

export default class Component extends JSONObject{
    @JSONObject.required
        typeName: string
    @JSONObject.required
        supported: string
    @JSONObject.required
        channel: string
    @JSONObject.required
        name: string
    @JSONObject.required
    @JSONObject.array(Datapoint)
        states: Array<Datapoint>

    log: ioBroker.Logger

    public constructor(log_: ioBroker.Logger, json?: any) {
        super(json);
        this.log = log_
    }
}