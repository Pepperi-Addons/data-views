import { UIControlData, PapiClient } from "@pepperi-addons/papi-sdk";
import { UIControlDataConverter } from '../converters/ui-control-data.converter'

export class UIControlService {

    constructor(private papiClient: PapiClient) {

    }

    find(where: string, include_deleted: boolean) {
        return this.papiClient.uiControls.iter({
            where: where,
            include_deleted: include_deleted,
            page_size: -1
        }).toArray().then(arr => arr.map(UIControlDataConverter.toUIControlData))
    }

    get(ids: number[]) {
        const where = ids.map(id => `InternalID = ${id}`).join(' OR ');
        return this.find(where, true);
    }

    async upsert(uiControl: UIControlData): Promise<UIControlData> {
        return this.papiClient.uiControls.upsert(UIControlDataConverter.toUIControl(uiControl))
            .then(UIControlDataConverter.toUIControlData);
    }
    
    async batch(uiControls: UIControlData[]) {
        return this.papiClient.uiControls.batch(uiControls.map(UIControlDataConverter.toUIControl));
    }

    allUIControlsIdentities(where: string = '') {
        return this.papiClient.uiControls.iter({
            where: where,
            fields: ['InternalID', 'Type', 'PermissionRoleID'],
            include_deleted: true,
            page_size: -1
        }).toArray() as Promise<{
            InternalID: number;
            Type: string;
            PermissionRoleID: number;
        }[]>
    }
}