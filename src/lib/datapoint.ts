import {JSONObject} from 'ts-json-object'

export default class Datapoint extends JSONObject {
    @JSONObject.required
    id: string
    @JSONObject.required
    name: string
    @JSONObject.required
    iobType: string
    @JSONObject.required
    iobRole: string
    @JSONObject.required
    unit: string
    @JSONObject.required
    dataid: string
    @JSONObject.required
    hdgType: string

    value: string|number
}

export class State {
    dp: Datapoint
}
