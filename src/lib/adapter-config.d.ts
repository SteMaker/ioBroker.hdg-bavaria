// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            ip: string;
            name: string;
            kesselTyp: string;
            pufferTyp: string;
            anzahlPuffer: number;
            heizkreise: string[];
            pollIntervalMins: number;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};