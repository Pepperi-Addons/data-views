import configurations from '../ui-control-configurations.json'
import { UIControlData, DataViewType, UIControlViewTypes } from '@pepperi-addons/papi-sdk';
import { UIControlDataConverter } from '../converters/ui-control-data.converter';
import { DataViewConverter } from '../converters/data-view.converter';

export interface UIControlConfiguration {
    Type: DataViewType,
    ListData?: boolean
}

export class UIControlConfigurationsService {

    static configuration(uiControl: UIControlData): UIControlConfiguration {
        
        // get the data view context name
        const key = DataViewConverter.toDataViewContext(uiControl.Type, 0).Name;
        const configuration = configurations[key]
        if (configuration) {
            return configuration;
        }
        else {
            return {
                Type: DataViewConverter.toDataViewType(uiControl.ViewType)
            }
        }
    }
}