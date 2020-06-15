import { BackendService } from "./backend.service";
import { Profile } from "@pepperi-addons/papi-sdk";

export class ProfilesService {

    private _profiles: Profile[] | undefined

    constructor(private backendService: BackendService) {

    }

    getByName(name: string) {
        return this.profiles().then(arr => arr.find(profile => profile.Name === name));
    }

    getByInternalID(id: number) {
        return this.profiles().then(arr => arr.find(profile => profile.InternalID === id));
    }

    private async profiles() {
        if (!this._profiles) {
            this._profiles = await this.backendService.profiles();
        }
        return this._profiles;
    }
}