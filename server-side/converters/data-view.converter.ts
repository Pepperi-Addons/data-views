import { UIControlData, UIControlViewType, DataViewType, UIControlViewTypes, DataView, ObjectReference, DataViewContext, ResourcePrefix, DataViewScreenSize, ResoursePrefixes, UIControlField, GridDataViewField, DataViewFieldTypes, VerticalAlignments, HorizontalAlignments, BaseFormDataViewField, MenuDataViewField, ResourceType, DataViewField, GridDataView, DataViewRowModes, BaseFormDataView  } from "@pepperi-addons/papi-sdk";
import { UIControlConfigurationsService } from "../services/ui-control-configuration.service";

export class DataViewConverter {
    
    static toDataView(uiControlData: UIControlData): DataView {
        const dataView = DataViewConverter.createDataView(uiControlData);

        return dataView;
    }

    private static createDataView(uiControl: UIControlData): DataView {
        const configuration = UIControlConfigurationsService.configuration(uiControl);
        
        const dataView: DataView = {
            InternalID: uiControl.ObjectID,
            Type: configuration.Type,
            Title: uiControl.DisplayName,
            Hidden: uiControl.Hidden,
            CreationDate: uiControl.CreationDate,
            ModificationDate: uiControl.ModificationDate, 
            Context: DataViewConverter.toDataViewContext(uiControl.Type, uiControl.PermissionRoleID),
            ListData: undefined,
            Fields: []
        }

        if (configuration.ListData) {
            dataView.ListData = {
                Sort: uiControl.SortBy ? [ { FieldID: uiControl.SortBy, Ascending: uiControl.SortAsc } ] : undefined,
                Section: uiControl.GroupBy && uiControl.GroupBy !== '-1' ? { FieldID: uiControl.GroupBy, Ascending: true } : undefined
            }
        }

        switch(dataView.Type) {
            case "Grid": {
                DataViewConverter.populateGridDataView(dataView, uiControl);
                break;
            }

            case "Menu": {
                DataViewConverter.populateMenuDataView(dataView, uiControl);
                break;
            }

            case "Configuration": {
                DataViewConverter.populateConfigurationDataView(dataView, uiControl);
                break;
            }

            default: {
                DataViewConverter.populateBaseFormDataView(dataView, uiControl);
                break;
            }
        }

        return dataView;
    }

    private static populateGridDataView(dataView: DataView, uiControl: UIControlData) {
        dataView.Fields = uiControl.ControlFields.map(DataViewConverter.createGridDataViewField);
        (dataView as GridDataView).Columns = uiControl.ControlFields.map(field => { return { Width: field.ColumnWidth || 10 } });
        
        (dataView as GridDataView).FrozenColumnsCount = uiControl.Layout.frozenColumnsCount;
        (dataView as GridDataView).MinimumColumnWidth = uiControl.Layout.MinimumWidth;
    }

    private static createGridDataViewField(uiControlField: UIControlField): GridDataViewField {
        return {
            FieldID: uiControlField.ApiName,
            Type: DataViewConverter.convertFromEnum(DataViewFieldTypes, uiControlField.FieldType, 'None'),
            Title: uiControlField.Title,
            Mandatory: uiControlField.MandatoryField,
            ReadOnly: uiControlField.ReadOnlyField,
            Layout: {
                Origin:  {
                    X: uiControlField.Layout ? uiControlField.Layout.X : 0,
                    Y: uiControlField.Layout ? uiControlField.Layout.Y : 0,
                }
            },
            Style: {
                Alignment: {
                    Vertical: DataViewConverter.convertFromEnum(VerticalAlignments, uiControlField.Layout?.yAlignment || 0, 'Stretch'),
                    Horizontal: DataViewConverter.convertFromEnum(HorizontalAlignments, uiControlField.Layout?.xAlignment || 0, 'Stretch')
                }
            }
        }
    }

    private static populateBaseFormDataView(dataView: DataView, uiControl: UIControlData) {
        dataView.Fields = uiControl.ControlFields.map(DataViewConverter.createBaseFormDataViewField);
        (dataView as BaseFormDataView).Rows = uiControl.Layout?.rowDefinitions?.map(row => { 
            return { Mode: DataViewConverter.convertFromEnum(DataViewRowModes, row.mode, 'Fixed') } 
        }) || [];
        (dataView as BaseFormDataView).Columns = new Array(uiControl.Columns).fill({});
    }

    private static createBaseFormDataViewField(uiControlField: UIControlField): BaseFormDataViewField {
        return {
            FieldID: uiControlField.ApiName,
            Type: DataViewConverter.convertFromEnum(DataViewFieldTypes, uiControlField.FieldType, 'None'),
            Title: uiControlField.Title,
            Mandatory: uiControlField.MandatoryField,
            ReadOnly: uiControlField.ReadOnlyField,
            Layout: {
                Origin:  {
                    X: uiControlField.Layout?.X || 0,
                    Y: uiControlField.Layout?.Y || 0,
                },
                Size:  {
                    Width: uiControlField.Layout?.Width || 0,
                    Height: uiControlField.Layout?.Field_Height || 0,
                }
            },
            Style: {
                Alignment: {
                    Vertical: DataViewConverter.convertFromEnum(VerticalAlignments, uiControlField.Layout?.yAlignment || 0, 'Stretch'),
                    Horizontal: DataViewConverter.convertFromEnum(HorizontalAlignments, uiControlField.Layout?.xAlignment || 0, 'Stretch')
                }
            }
        }
    }


    private static populateMenuDataView(dataView: DataView, uiControl: UIControlData) {
        dataView.Fields = uiControl.ControlFields.map(DataViewConverter.createMenuDataViewField)
    }

    private static createMenuDataViewField(uiControlField: UIControlField): MenuDataViewField {
        return {
            FieldID: uiControlField.ApiName,
            Title: uiControlField.Title
        }
    }

    private static populateConfigurationDataView(dataView: DataView, uiControl: UIControlData) {
        dataView.Fields = uiControl.ControlFields.map(DataViewConverter.createConfigurationDataViewField)
    }

    private static createConfigurationDataViewField(uiControlField: UIControlField): DataViewField {
        return {
            FieldID: uiControlField.ApiName
        }
    }

    // static toUIControlData(dataView: DataView): UIControlData {

    // }

    static convertFromEnum<T>(e: { [key: string]: number }, num: number, defaultVal: T): T {
        return (Object.keys(e).find(key => e[key] == num) || defaultVal) as T;
    }


    static toDataViewType(num: number): DataViewType {
        const type: UIControlViewType = Object.keys(UIControlViewTypes).find(key => UIControlViewTypes[key] === num) as UIControlViewType;
        switch (type) {
            case 'None':
                return 'Form';
            
            case 'Grid':
            case 'Line':
            case 'CardsGrid':
            case 'Map': 
                return type;

            case 'Cards':
                return 'Card';

            case 'Detailed':
                return 'Details';
        }

    }

    static toResource(prefix: ResourcePrefix): ResourceType {
        switch (prefix) {
            case 'AT':
                return 'accounts';
            case 'GA':
                return 'activities'
            case 'CP': 
                return 'contacts';
            case 'OA':
                return 'transactions';
            case 'GL':
                return 'lists';
        }
    }

    static toResourcePrefix(resource: ResourceType): ResourcePrefix | undefined {
        switch (resource) {
            case 'accounts':
                return 'AT';
            case 'contacts':
                return 'CP';
            case 'activities':
                return 'GA';
            case 'transactions':
                return 'OA';
            case 'lists':
                return 'GL';
        }
    }

    static toDataViewContext(type: string, permissionRoleID: number): DataViewContext {
        let objectReference: ObjectReference | undefined = undefined;
        let name: string = type;
        
        // [GA#12345]ActivityForm
        let matches = type.match(/^\[(\w\w)#(\d+)\](\w+)$/);
        if (matches && matches.length == 4 && ResoursePrefixes.includes(matches[1] as ResourcePrefix)) {
            objectReference = {
                InternalID: parseInt(matches[2]),
                Resource: DataViewConverter.toResource(matches[1] as ResourcePrefix)
            }
            name = matches[3];
        }
        else {
            // [GL#7c867608-e25c-4be0-aa99-10db80e78b47]ListView
            matches = type.match(/^\[GL#((\w|-)+)\](\w+)$/);
            if (matches && matches.length == 4) {
                objectReference = {
                    InternalID: parseInt(matches[2]),
                    Resource: DataViewConverter.toResource(matches[1] as ResourcePrefix)
                }
                name = matches[3];
            }
        }

        // ScreenSize
        let screenSize: DataViewScreenSize = 'Tablet';
        matches = name.match(/^(\w+)(Landscape|Phablet)$/);
        if (matches && matches.length == 3) {
            screenSize = matches[0] as DataViewScreenSize;
            name = matches[1];
        }

        return {
            Object: objectReference,
            Name: name,
            ScreenSize: screenSize,
            Profile: {
                InternalID: permissionRoleID
            }
        }
    }
}