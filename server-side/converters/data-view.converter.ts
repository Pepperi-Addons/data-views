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

    static toUIControlData(dataView: DataView): UIControlData {
        const res: UIControlData = {
            ObjectID: dataView.InternalID || 0,
            Hidden: dataView.Hidden || false,
            Type: DataViewConverter.toType(dataView.Context),
            CreationDate: dataView.CreationDate || '',
            ModificationDate: dataView.ModificationDate || '',
            ControlFields: (dataView.Fields as any[]).map((field, i) => {
                const res: UIControlField = {
                    ParentField: "", // overriden in Tree
                    Title: (field as any).Title || '', 
                    WrntyFieldName: (field as any).Title || '', // TODO: what is this
                    MandatoryField: (field as any).Mandatory || false,
                    ReadOnlyField: 'ReadOnly' in field ? field.ReadOnly : true,
                    FieldConditions: null, // not in use - hopefully
                    CustomField: false, // TODO: what does this mean?
                    ApiName: field.FieldID,
                    FieldType: 'Type' in field ? DataViewFieldTypes[field.Type] : DataViewFieldTypes.TextBox,
                    OptionalValues: undefined, // TODO: not in use anymore?
                    MinValue: -1000000000, // deprecated, should be on the config
                    MaxValue: 1000000000,
                    MaxCharacters: 0, // todo: in use?
                    MaxLines: 0, // todo: in use?
                    Layout: {
                        X: field.Layout?.Origin ? field.Layout.Origin.X : 0,
                        Y: field.Layout?.Origin ? field.Layout.Origin.Y : 0,
                        Width: field.Layout?.Size ? field.Layout.Size.Width : 1,
                        Field_Height: field.Layout?.Size ? field.Layout.Size.Height : 1,
                        Line_Number: i,
                        xAlignment: field.Style?.Alignment ? HorizontalAlignments[field.Style.Alignment.Horizontal] : HorizontalAlignments.Stretch,
                        yAlignment: field.Style?.Alignment ? VerticalAlignments[field.Style.Alignment.Vertical] : VerticalAlignments.Center
                    },
                    ColumnWidth: 10, // overriden in Grid
                    ObjectTypeReference: 0, // todo: what is this??
                    DefaultValue: '',
                    Hidden: false
                }
                return res;
            }),
            ControlConditions: [],
            Family: '', // not in use
            Name: '', // not in use
            DisplayName: dataView.Title || '',
            HighlightFirst: false, // TODO: where is this mapped to? 
            Columns: (dataView as any).Columns ? (dataView as any).Columns.length : 1,
            SortBy: dataView.ListData?.Sort && dataView.ListData.Sort.length ? dataView.ListData.Sort[0].FieldID : '',
            SortAsc: dataView.ListData?.Sort && dataView.ListData.Sort.length ? dataView.ListData.Sort[0].Ascending : false,
            DefaultView: '',
            GroupBy: dataView.ListData?.Section ? dataView.ListData.Section.FieldID : '',
            Flat: true, // TODO: where is this mapped to?
            ActivityTypesID: null, // TODO: where is this mapped to?
            Statuses: null, // TODO: where is this mapped to?
            ControlName: null, // TODO: what is this??
            ViewType: DataViewConverter.toUIControlType(dataView.Type),
            PermissionRoleID: dataView.Context.Profile.InternalID || 0,
            PermissionRoleName: dataView.Context.Profile.Name || '',
            Version: 1, // TODO: 
            Layout: {
                columnDefinitions: [], // not in use
                rowDefinitions: 'Rows' in dataView ? dataView.Rows.map(row => { return { mode: DataViewRowModes[row.Mode] as 0 | 1 }}) : [],
                frozenColumnsCount: 0, // override in Grid
                Width: 0, // TODO: what is this???
                MinimumWidth: 0, // override in Grid
                WidthType: 0 // not supported
            },
            RowsAs: null,
            ColumnsAs: null,
            ColumnsOrderBy: null, // not in use
            RowsOrderBy: null // not in use

        };

        if (dataView.Type === 'Grid') {
            const grid = dataView as GridDataView;
            res.Layout.MinimumWidth = grid.MinimumColumnWidth;
            res.Layout.frozenColumnsCount = grid.FrozenColumnsCount;

            (dataView as GridDataView).Fields.forEach((field, i) => {
                res.ControlFields[i].ColumnWidth = grid.Columns[i].Width;
                res.ControlFields[i].Layout.Width = 1;
                res.ControlFields[i].Layout.Field_Height = 1;
            });
        }

        return res;
    }

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

    static toUIControlType(type: DataViewType): number {
        const res: number = UIControlViewTypes.None;

        switch (type) {
            case 'Grid':
            case 'Line':
            case 'CardsGrid':
            case 'Map': 
                return UIControlViewTypes[type];

            case 'Card':
                return UIControlViewTypes.Cards;

            case 'Details':
                return UIControlViewTypes.Detailed;
        }

        return res;
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
                    UUID: matches[1],
                    Resource: DataViewConverter.toResource('GL')
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

    static toType(context: DataViewContext): string {
        let res = context.Name;

        // add screen size suffix
        if (context.ScreenSize !== 'Tablet') {
            res += context.ScreenSize;
        }

        if (context.Object) {

            // [GL#0b089829-4902-482a-98ce-2d396df48a1b]
            if (context.Object.Resource === 'lists') {
                res = `[GL#${context.Object.UUID}]${res}`;
            }
            else {
                res = `[${DataViewConverter.toResourcePrefix(context.Object.Resource)}#${context.Object.InternalID}]${res}`;
            }

        }

        return res;
    }
}