import { PapiClient, Profile, PepperiObject, UIControl } from "@pepperi-addons/papi-sdk";

export class BackendService {
    
    constructor(private papiClient: PapiClient) {
        
    }

   async profiles() {
       return this.papiClient.profiles.find();
   }

    async pepperiObjects() {
        return this.papiClient.metaData.pepperiObjects.find();
    }

    async uiControls(where: string, includeDeleted: boolean = false) {
        return this.papiClient.uiControls.find({
            where: where,
            page_size: -1,
            include_deleted: includeDeleted
        });
    }

    async upsertUiControls(uiControls: UIControl[]) {
        return this.papiClient.uiControls.batchUpsert(uiControls);
    }
}