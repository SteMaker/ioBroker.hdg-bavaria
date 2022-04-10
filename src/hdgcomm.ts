import axios, {AxiosInstance} from "axios";

const header = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
};

export class HdgComm {
    private readonly axiosInstance: AxiosInstance;
    private dataQuery: string;

    public constructor(url: string, q: string) {
        if(url == "" || q == "") return;
        this.axiosInstance = axios.create({
            baseURL: "http://"+url,
            timeout: 15000
        });
        this.dataQuery = q;
    }

    public dataRefresh(cb: (result: any, error: string) => void): void {
        this.axiosInstance?.post("/ApiManager.php?action=dataRefresh",
            this.dataQuery,
            { headers: header }
        )
            .then(function (response) {
                if(response.data)
                    cb(response.data, "");
            })
            .catch(function (error) {
                cb("", error);
            });
    }
    // To set a value: ActionManager.php?action=set_value_changed&i=<x>&v=<y>
    // where x is the parameter without '-' and y is the value
    // The dataRefresh command also works with normal setting parameters
}
