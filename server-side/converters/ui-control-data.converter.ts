import { UIControlData, UIControl, DataViewContext, ObjectReference, DataViewScreenSize, ResoursePrefixes, ResourcePrefix, ResourceType, DataViewType } from "@pepperi-addons/papi-sdk";

/**
 * Convert a UIControl to a UIControlData and vise versa
 */
export class UIControlDataConverter {

    static toUIControl(obj: UIControlData): UIControl {
        
        // Hidden, CreationDate, ModificationDate dont exist on UIControlData in WSIM
        // But I added them to UIControlData so that I don't have to shlep the wrapper object
        const { Hidden, CreationDate, ModificationDate, ...data } = obj;

        const res =  {
            InternalID: obj.ObjectID,
            UIControlData: JSON.stringify(data),
            Type: obj.Type,
            PermissionRoleID: obj.PermissionRoleID,
            Hidden: Hidden
        };
        
        return res;
    }

    static toUIControlData(obj: UIControl): UIControlData {
        const res = JSON.parse(obj.UIControlData) as UIControlData;
        
        // update fields that can be garbage when they arrive from the backend
        res.ObjectID = obj.InternalID
        res.Hidden = obj.Hidden
        res.PermissionRoleID = obj.PermissionRoleID;
        res.Hidden = obj.Hidden;
        res.Type = obj.Type;
        res.CreationDate = obj.CreationDate || '';
        res.ModificationDate = obj.ModificationDate || '';

        return res;
    }
}