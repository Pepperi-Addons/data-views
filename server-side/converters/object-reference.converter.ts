import { ObjectReference, ResourceType, Type } from "@pepperi-addons/papi-sdk";

export class ObjectReferenceConverter {
    static toObjectReference(type: Type): ObjectReference {
        return {
            Resource: ObjectReferenceConverter.toResource(type.Type),
            InternalID: type.InternalID,
            Name: type.Name
        }
    }

    static toResource(type: number): ResourceType {
        let res: ResourceType = "None";

        switch(type) {
            case 2:
                res = 'transactions';
                break;
            case 99: 
                res = 'activities';
                break;
            case 35: 
                res = 'accounts';
                break;
            case 33: 
                res = 'contacts';
                break;
            default: 
                break;
        }

        return res;
    }
}