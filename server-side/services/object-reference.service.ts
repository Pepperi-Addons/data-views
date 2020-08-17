import { BackendService } from "./backend.service";
import { ObjectReference, ResourceType } from "@pepperi-addons/papi-sdk";
import { ObjectReferenceConverter } from "../converters/object-reference.converter";

export class ObjectReferenceService {

    private _objectReferences: ObjectReference[] | undefined

    constructor(private backendService: BackendService) {

    }

    async objectReferences()  {
        if (!this._objectReferences) {
            this._objectReferences = await this.backendService.pepperiObjects()
                .then(arr => arr.map(ObjectReferenceConverter.toObjectReference).filter(Boolean)) as ObjectReference[];
        }
        return this._objectReferences;
    }

    async get(reference: ObjectReference) {
        let res: ObjectReference | undefined;

        // there is no current way of retrieving Generic lists in the Backend
        if (reference.Resource == 'lists' && reference.UUID)
        {
            res = reference;
        }
        else if (reference.InternalID)
        {
            res = await this.getByInternalID(reference.Resource, reference.InternalID);

            if (!res) {
                // uncomment once DI-16801 is solved
                // throw new Error(`Object with InternalID = ${reference.InternalID} for Resource = '${reference.Resource}' not found`);
            }
        }
        else if (reference.Name)
        {
            res = await this.getByName(reference.Resource, reference.Name);

            if (!res) {
                // uncomment once DI-16801 is solved
                // throw new Error(`Object with Name = '${reference.Name}' for Resource = '${reference.Resource}' not found`);
            }
        }

        return res;
    }

    private async getByInternalID(type: ResourceType, internalID: number) {
        return this.objectReferences().then(arr => arr.find(obj => obj.Resource === type && obj.InternalID === internalID))
    }

    private async getByName(type: ResourceType, name: string) {
        return this.objectReferences().then(arr => arr.find(obj => obj.Resource === type && obj.Name === name))
    }
}