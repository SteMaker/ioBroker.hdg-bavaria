import {JSONObject} from "ts-json-object"
import Component from "./component";
import Datapoint from "./datapoint";

export default class Tank extends Component{
    @JSONObject.required
        size: number

    @JSONObject.required
    @JSONObject.array(String)
        tempStates: Array<string>

    energyDatapoints: Datapoint[] = [];

    public constructor(log_: ioBroker.Logger, json?: any) {
        super(log_, json);
        // find the temperature sensor data points and fill energyDatapoints
        for(let i=0; i < this.tempStates.length;i++) {
            for (let j = 0; j < this.states.length; j++) {
                if(this.tempStates[i] == this.states[j].id) {
                    this.energyDatapoints.push(this.states[j]);
                    break;
                }
            }
        }
    }

    calcEnergy(): number {
        let energy = 0
        for(let i=0; i < this.energyDatapoints.length;i++) {
            const kelvin = this.energyDatapoints[i].value as number + 273.15
            energy += 1.167*(this.size/this.energyDatapoints.length)*kelvin
        }
        return Math.round(energy)
    }
}
