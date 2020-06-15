import { BackendService } from "./backend.service";
import { Profile } from "@pepperi-addons/papi-sdk";

export class ProfilesService {

    private _profiles: Profile[] | undefined

    constructor(private backendService: BackendService) {

    }

    get(name: string): Promise<Profile | undefined>;
    get(id: number): Promise<Profile | undefined>;
    
    get(by: string | number): Promise<Profile | undefined> {
        switch(typeof by) {
            case 'string':
                return this.profiles().then(arr => arr.find(profile => profile.Name === by));
            case 'number':
                return this.profiles().then(arr => arr.find(profile => profile.InternalID === by));
        }
    }
    
    async profiles() {
        if (!this._profiles) {
            this._profiles = await this.backendService.profiles();
        }
        return this._profiles;
    }
}