import { BackendService } from "./backend.service";
import { ObjectReference, UIControlData } from "@pepperi-addons/papi-sdk";
import { JSONFilter, concat, toApiQueryString } from "@pepperi-addons/pepperi-filters"
import { UIControlDataConverter } from '../converters/ui-control-data.converter'

export class UIControlService {

    constructor(private backendService: BackendService) {

    }

    find(where: string) {
        return this.backendService.uiControls(where).then(arr => arr.map(UIControlDataConverter.toUIControlData))
    }

    async get(internalID: number) {
        const arr = await this.backendService.uiControls(toApiQueryString(this.internalIDFilter(internalID)) || '');

        if (arr.length) {
            return UIControlDataConverter.toUIControlData(arr[0])
        }
        else {
            return undefined;
        }
    }

    async upsert(uiControl: UIControlData): Promise<UIControlData> {
        return this.backendService.upsertUiControl(UIControlDataConverter.toUIControl(uiControl)).then(UIControlDataConverter.toUIControlData);
    }

    internalIDFilter(internalID: number): JSONFilter {
        return {
            FieldType: 'Integer',
            ApiName: 'InternalID',
            Operation: 'IsEqual',
            Values: [ internalID.toString() ]
        }
    }
}