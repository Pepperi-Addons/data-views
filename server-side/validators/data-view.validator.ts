import { DataViewTypes, ResourceTypes, DataViewType, DataViewFieldTypes, VerticalAlignments, HorizontalAlignments, DataViewRowModes, DataViewScreenSizes, DataView, GridDataView } from '@pepperi-addons/papi-sdk'
import configurations from '../../shared/ui-control-configurations.json'

export function validateDataViewScheme(obj: any) {
    if (typeof obj !== 'object') {
        throw new Error(`Expected input to be of type 'object', instead get input of type '${typeof obj}'`);
    }
    if (Array.isArray(obj)) {
        throw new Error(`Expected input to be of type 'object', instead get input of type 'array'`);
    }

    validateProperty(obj, 'InternalID', 'number', 'InternalID', false);
    validateProperty(obj, 'Hidden', 'boolean', 'Hidden', false);
    validateProperty(obj, 'Title', 'string', 'Title', false);
    validateProperty(obj, 'Type', DataViewTypes, 'Type');
    validateProperty(obj, 'Context', 'object', 'Context', false);

    if (!('InternalID' in obj) && !('Context' in obj)) {
        throw new Error(`Expected either InternalID or Context`);
    }

    if ('Context' in obj) {
        // Context.Name
        validateProperty(obj.Context, 'Name', 'string', 'Context.Name');

        if (!/^[a-zA-Z0-9_]+$/.test(obj.Context.Name)) {
            if (/^\[(AG|AL)#(\d+)\](ActivityList|AccountList)$/.test(obj.Context.Name)) {
                throw new Error(`DataViews of type: ${obj.Context.Name} are obsolete and are not supported`);
            }
            else {
                throw new Error(`Context.Name must be non-empty and can only contain letters, numbers or an underscore`);
            }
        }

        const configuration = configurations[obj.Context.Name];

        if (configuration && configuration.Type !== obj.Type) {
            throw new Error(`Expected Type = '${configuration.Type}' for Context.Name = '${obj.Context.Name}'`);
        }

        if (obj.Type === 'Large') {
            const types = Object.entries(configurations)
                .filter(([_, value]) => value.Type === obj.Type)
                .map(([key, _]) => key);
            validateProperty(obj.Context, 'Name', types, 'Context.Name')
        }

        validateProperty(obj.Context, 'ScreenSize', DataViewScreenSizes, 'Context.ScreenSize');
        validateProperty(obj.Context, 'Profile', 'object', 'Context.Profile');

        if (!('InternalID' in obj.Context.Profile) && !('Name' in obj.Context.Profile)) {
            throw new Error(`Expected field: 'Context.Profile' to have either 'Name' or 'InternalID'`);
        }

        if ('InternalID' in obj.Context.Profile) {
            validateProperty(obj.Context.Profile, 'InternalID', 'number', 'Context.Profile.InternalID');
        }

        if ('Name' in obj.Context.Profile) {
            validateProperty(obj.Context.Profile, 'Name', 'string', 'Context.Profile.Name');
        }

        if (configuration && configuration.Object) {
            validateProperty(obj.Context, 'Object', 'object', 'Context.Object');
        }

        if (obj.Context.Object) {
            if (configuration && !configuration.Object) {
                throw new Error(`Unexpected field: 'Context.Object' for DataView of '${obj.Context.Name}'`)
            }

            validateProperty(obj.Context.Object, 'Resource', ResourceTypes, 'Context.Object.Resource');
            if (configuration && configuration.Object.Resource && obj.Context.Object.Resource !== configuration.Object.Resource) {
                throw new Error(`Expected field: 'Context.Object.Resource' for DataView of '${obj.Context.Name}' to be '${configuration.Object.Resource}'`)
            }

            if (obj.Context.Object.Resource === 'lists') {
                // Generic List
                validateProperty(obj.Context.Object, 'UUID', 'string', 'Context.Object.UUID');
            }
            else {
                // ATD
                if (!('InternalID' in obj.Context.Object) && !('Name' in obj.Context.Object)) {
                    throw new Error(`Expected field: 'Context.Object' to have either 'Name' or 'InternalID'`);
                }

                if ('InternalID' in obj.Context.Object) {
                    validateProperty(obj.Context.Object, 'InternalID', 'number', 'Context.Object.InternalID');
                }
                
                if ('Name' in obj.Context.Object) {
                    validateProperty(obj.Context.Object, 'Name', 'string', 'Context.Object.Name');
                }
            }
        }
    }
    
    validateProperty(obj, 'Fields', 'array', 'Fields', false);

    if ('ListData' in obj) {
        if (obj.Sort) {
            validateProperty(obj.ListData, 'Sort', 'array', 'ListData.Sort');

            obj.Sort.forEach((sort, i) => {
                validateProperty(sort, 'FieldID', 'string', `ListData.Sort[${i}].FieldID`);
                validateProperty(sort, 'Ascending', 'boolean', `ListData.Sort[${i}].Ascending`);
            });
        }

        if (obj.Section) {
            validateProperty(obj.Section, 'FieldID', 'string', `obj.Section.FieldID`);
            validateProperty(obj.Section, 'Ascending', 'boolean', `obj.Section.Ascending`);
        }
    }

    switch(obj.Type as DataViewType) {
        case 'Grid':
            validateGridDataViewScheme(obj);
            break;

        case 'Menu': 
            validateMenuDataViewScheme(obj);
            break;

        case 'Configuration':
            validateConfigurationDataViewScheme(obj);
            break;

        default:
            validateBaseFormDataViewScheme(obj);
            break;
    }
}

function validateGridDataViewScheme(obj: any) {
    obj.Fields?.forEach((field, i) => {
        validateProperty(field, 'FieldID', 'string', `Fields[${i}].FieldID`);
        validateProperty(field, 'Type', Object.keys(DataViewFieldTypes), `Fields[${i}].Type`);
        validateProperty(field, 'Title', 'string', `Fields[${i}].Title`);
        validateProperty(field, 'Mandatory', 'boolean', `Fields[${i}].Mandatory`);
        validateProperty(field, 'ReadOnly', 'boolean', `Fields[${i}].ReadOnly`);
        validateProperty(field, 'Layout', 'object', `Fields[${i}].Layout`);
        validateProperty(field.Layout, 'Origin', 'object', `Fields[${i}].Layout.Origin`);
        validateProperty(field.Layout.Origin, 'X', 'number', `Fields[${i}].Layout.Origin.X`);
        validateProperty(field.Layout.Origin, 'Y', 'number', `Fields[${i}].Layout.Origin.Y`);
        validateProperty(field, 'Style', 'object', `Fields[${i}].Style`);
        validateProperty(field.Style, 'Alignment', 'object', `Fields[${i}].Style.Alignment`);
        validateProperty(field.Style.Alignment, 'Vertical', Object.keys(VerticalAlignments), `Fields[${i}].Style.Alignment.Vertical`);
        validateProperty(field.Style.Alignment, 'Horizontal', Object.keys(HorizontalAlignments), `Fields[${i}].Style.Alignment.Horizontal`);
    })

    validateProperty(obj, 'Columns', 'array', 'Columns', false);
    obj.Columns?.forEach((column, i) => {
        validateProperty(column, 'Width', 'number', `Columns[${i}].Width`)
    })

    validateProperty(obj, 'FrozenColumnsCount', 'number', 'FrozenColumnsCount', false);
    validateProperty(obj, 'MinimumColumnWidth', 'number', 'MinimumColumnWidth', false);
}

function validateBaseFormDataViewScheme(obj: any) {
    obj.Fields?.forEach((field, i) => {
        validateProperty(field, 'FieldID', 'string', `Fields[${i}].FieldID`);
        validateProperty(field, 'Type', Object.keys(DataViewFieldTypes), `Fields[${i}].Type`);
        validateProperty(field, 'Title', 'string', `Fields[${i}].Title`);
        validateProperty(field, 'Mandatory', 'boolean', `Fields[${i}].Mandatory`);
        validateProperty(field, 'ReadOnly', 'boolean', `Fields[${i}].ReadOnly`);
        validateProperty(field, 'Layout', 'object', `Fields[${i}].Layout`);
        validateProperty(field.Layout, 'Origin', 'object', `Fields[${i}].Layout.Origin`);
        validateProperty(field.Layout.Origin, 'X', 'number', `Fields[${i}].Layout.Origin.X`);
        validateProperty(field.Layout.Origin, 'Y', 'number', `Fields[${i}].Layout.Origin.Y`);
        validateProperty(field.Layout, 'Size', 'object', `Fields[${i}].Layout.Size`);
        validateProperty(field.Layout.Size, 'Width', 'number', `Fields[${i}].Layout.Size.Width`);
        validateProperty(field.Layout.Size, 'Height', 'number', `Fields[${i}].Layout.Size.Height`);
        validateProperty(field, 'Style', 'object', `Fields[${i}].Style`);
        validateProperty(field.Style, 'Alignment', 'object', `Fields[${i}].Style.Alignment`);
        validateProperty(field.Style.Alignment, 'Vertical', Object.keys(VerticalAlignments), `Fields[${i}].Style.Alignment.Vertical`);
        validateProperty(field.Style.Alignment, 'Horizontal', Object.keys(HorizontalAlignments), `Fields[${i}].Style.Alignment.Horizontal`);
    })

    validateProperty(obj, 'Columns', 'array', 'Columns', false);
    obj.Columns?.forEach((column, i) => {
        if (typeof column !== 'object') {
            throw new Error(`Expected field: 'Columns[${i}]' to be of type: 'object'`)
        }
    })

    validateProperty(obj, 'Rows', 'array', 'Rows', false);
    obj.Rows?.forEach((row, i) => {
        if (typeof row !== 'object') {
            throw new Error(`Expected field: 'Rows[${i}]' to be of type: 'object'`)
        }

        validateProperty(row, 'Mode', Object.keys(DataViewRowModes), `Rows[${i}].Mode`);
    })
}

function validateMenuDataViewScheme(obj: any) {
    obj.Fields?.forEach((field, i) => {
        validateProperty(field, 'FieldID', 'string', `Fields[${i}].FieldID`);
        validateProperty(field, 'Title', 'string', `Fields[${i}].Title`);
    })
}

function validateConfigurationDataViewScheme(obj: any) {
    obj.Fields?.forEach((field, i) => {
        validateProperty(field, 'FieldID', 'string', `Fields[${i}].FieldID`);
        validateProperty(field, 'Type', Object.keys(DataViewFieldTypes), `Fields[${i}].Type`, false);
        validateProperty(field, 'Title', 'string', `Fields[${i}].Title`, false);
        validateProperty(field, 'Mandatory', 'boolean', `Fields[${i}].Mandatory`, false);
        validateProperty(field, 'ReadOnly', 'boolean', `Fields[${i}].ReadOnly`, false);
    })
}

function validateProperty(obj: any, key: string, type: 'number' | 'string' | 'boolean' | 'object' | 'array' | readonly string[], path: string = key, required: boolean = true) {
    const exists = (key in obj);
    if (!exists && required) {
        throw new Error(`Missing expected field: '${path}'`)
    }
    else if (exists) {
        if (type === 'array') {
            if (!Array.isArray(obj[key])) {
                throw new Error(`Expected field: '${path}' to be of type: 'array'`);
            }
        }
        else if (Array.isArray(type)) {
            // string enum
            if (!type.includes(obj[key])) {
                throw new Error(`Expected field: '${path}' to be of one of: ${type.join(', ')}`);
            }
        }
        else {
            if (typeof obj[key] !== type) {
                throw new Error(`Expected field: '${path}' to be of type: '${type}'`);
            }
        }
    }
}

export function validateDataView(dataView: DataView) {
    switch(dataView.Type!) {
        case 'Grid':
            {
                if ((dataView as GridDataView).Columns!.length !== dataView.Fields!.length) {
                    throw new Error('A Grid\'s number of columns must match it\'s number of fields');
                }
            }
            break;

        default:
            break;
    }
}