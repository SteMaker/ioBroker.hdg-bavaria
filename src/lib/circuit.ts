import Component from "./component";

export default class Circuit extends Component{
    constructor(log_: ioBroker.Logger, channel: string, instance: number, origJson?: any) {
        const json = JSON.parse(JSON.stringify(origJson))
        for(let i=0; i < json.states.length; i++) {
            const dataid = parseInt(json.states[i].dataid) + instance*100;
            json.states[i].dataid = dataid.toString();
        }
        json.channel = channel;
        super(log_, json);
    }
}
