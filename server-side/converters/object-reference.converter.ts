import { PepperiObject, ObjectReference, ResourceType, ResourceTypes } from "@pepperi-addons/papi-sdk";

export class ObjectReferenceConverter {
    static toObjectReference(pepperiObject: PepperiObject): ObjectReference | undefined {
        const id = parseInt(pepperiObject.SubTypeID)
        if (id && ResourceTypes.includes(pepperiObject.Type as ResourceType)) {
            return {
                Resource: pepperiObject.Type as ResourceType,
                InternalID: id,
                Name: pepperiObject.SubTypeName
            }
        }
        return undefined
    }
}