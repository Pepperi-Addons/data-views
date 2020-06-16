import { PapiClient, Profile, PepperiObject, UIControl } from "@pepperi-addons/papi-sdk";

export class BackendService {
    
    constructor(private papiClient: PapiClient) {
        
    }

   async profiles() {
       return this.papiClient.profiles.iter().toArray();
   }

    async pepperiObjects() {
        return this.papiClient.metaData.pepperiObjects.iter().toArray();
    }

    async uiControls(where: string, includeDeleted: boolean = false) {
        return this.papiClient.uiControls.iter({
            where: where,
            page_size: -1,
            include_deleted: includeDeleted
        }).toArray();
    }

    async upsertUiControl(uiControl: UIControl) {
        return this.papiClient.uiControls.upsert(uiControl);
    }
}