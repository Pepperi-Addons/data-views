import { UIControlService } from "./ui-control.service";
import { ProfilesService } from "./profiles.service";
import { ObjectReferenceService } from "./object-reference.service";
import { DataViewConverter } from "../../shared/data-view.converter";
import { DataView, ResourceType, DataViewContext, GridDataView, BaseFormDataView, BatchApiResponse, UIControlData } from '@pepperi-addons/papi-sdk'
import { parse, transform, JSONBaseFilter, toApiQueryString, filter, FieldType } from "@pepperi-addons/pepperi-filters";
import { NodeTransformer } from "@pepperi-addons/pepperi-filters/build/json-filter-transformer";
import { validateDataView, validateDataViewScheme } from "../validators/data-view.validator";

export class DataViewService {

    constructor(
        private uiControlService: UIControlService, 
        private profilesService: ProfilesService,
        private objectReferencesService: ObjectReferenceService
        ) {

    }

    async find(where: string = '', include_deleted: boolean) {
        // parse the where into a JSONFilter
        const jsonFilter = parse(where, DataViewService.whereFields);

        // Convert the where clause to a where that can be sent to the UIControl endpoint
        const uiControlWhere = toApiQueryString(transform(jsonFilter, await this.fieldTransformations()));
        console.log('DataView where:', where, ', UIControl where:', uiControlWhere);

        // get the UIControls
        const uiControls = await this.uiControlService.find(uiControlWhere || '', include_deleted);
        
        // convert the UIControls to DataViews
        let res = uiControls.map(DataViewConverter.toDataView);

        // Update the context fields that don't exist on the UIControl
        for (let dataView of res) {
            await this.updateContext(dataView);
        }

        // now lets filter them again
        // for filters that aren't supported
        res = filter(res, jsonFilter);

        console.log('Returning', res.length, 'DataViews of', uiControls.length, 'UIControls');
        
        return res;
    }

    async upsert(dataView: DataView) {

        // validate fields
        validateDataViewScheme(dataView);

        // update non-existing fields
        await this.updateContext(dataView);
        
        // this might be updating an existing dataView or creating a new one
        let existing: DataView | undefined = undefined;
        
        // if InternalID was specified always look for the dataView with that UIControl
        if (dataView.InternalID) {
            const l = await this.uiControlService.find(`InternalID = ${dataView.InternalID}`, true);
            
            if (l.length === 0) {
                throw new Error(`DataView with InternalID = ${dataView.InternalID} does not exist`)
            }

            existing = DataViewConverter.toDataView(l[0]);
        }
        else {
            // See if there is a dataview with this context already
            const l = await this.uiControlService.find(
                `Type = '${DataViewConverter.toType(dataView.Context!)}' AND PermissionRoleID = ${dataView.Context!.Profile.InternalID}`, 
                true
            );
            if (l.length > 1) {
                throw new Error(`There should only be one data view for context: ${JSON.stringify(dataView.Context)}`);
            }
            else if (l.length == 1) {
                existing = DataViewConverter.toDataView(l[0]);
                await this.updateContext(existing);
            } 
        }

        console.log(existing ? `Updating data-view with InternalID = ${existing.InternalID}` : `Creating a new data-view`);

        // fill in missing fields & validate matching
        this.mergeDataViews(dataView, existing);

        // after merging we check the validity of the data-view as a whole
        validateDataView(dataView);

        // upsert
        const res = await this.uiControlService.upsert(DataViewConverter.toUIControlData(dataView)).then(DataViewConverter.toDataView);
        
        // update fields that don't exist on the UIControl  
        await this.updateContext(res);

        return res;
    }

    async bulkUpsert(dataViews: DataView[]): Promise<BatchApiResponse[]> {
        const uiControlIdentities = await this.uiControlService.allUIControlsIdentities();
        let inserts: DataView[] = []
        let updates: DataView[] = []

        for (const dataView of dataViews) {
            
            // throws scheme errors (missing / invalid fields)
            validateDataViewScheme(dataView);
            
            // update missing fields in context (Profile.InternalID, Context.Object.InternalID)
            await this.updateContext(dataView);

            if (dataView.InternalID) {
                const existing = uiControlIdentities.find(item => item.InternalID === dataView.InternalID);
                if (!existing) {
                    throw new Error(`DataView with InternalID = ${dataView.InternalID} does not exist`);
                }

                updates.push(dataView);
            }
            else {
                const existing = uiControlIdentities.find(item => this.compare(dataView.Context!, item))
                if (existing) {
                    dataView.InternalID = existing.InternalID;
                    updates.push(dataView);
                }
                else {
                    inserts.push(dataView);
                }
            }
        }

        // get fields not sent for existing data-views
        if (updates.length) {
            const l = await this.uiControlService.get(updates.map(item => item.InternalID || 0))
                .then(arr => arr.map(DataViewConverter.toDataView));

            if (l.length != updates.length) {
                // should not happen
                throw new Error(`Error retrieving existing data-views to update`)
            }

            for (const existing of l) {
                const dataView = updates.find(dataView => dataView.InternalID === existing.InternalID)!;
                this.mergeDataViews(dataView, existing);
            }
        }

        // fill missing fields with defaults
        for (const dataView of inserts) {
            this.mergeDataViews(dataView, undefined);
        }

        // after merging we check the validity of the data-view as a whole
        for (const dataView of dataViews) {
            validateDataView(dataView);
        }

        // upsert
        const responses = await this.uiControlService.batch(dataViews.map(DataViewConverter.toUIControlData));

        // change URL from UIControl to data-views
        for (const response of responses) {
            response.URI = `/meta_data/data_views?where=InternalID=${response.InternalID}`
        }
        
        return responses;
    }

    async updateContext(dataView: DataView) {
        if (dataView.Context) {
            if (dataView.Context.Object) {
                dataView.Context.Object = await this.objectReferencesService.get(dataView.Context.Object);
            }
    
            if (dataView.Context.Profile) {
                if (dataView.Context.Profile.InternalID) {
                    const profile = await this.profilesService.get(dataView.Context.Profile.InternalID);
    
                    if (!profile) {
                        throw new Error(`Profile with InternalID = ${dataView.Context.Profile.InternalID} not found`);
                    }
    
                    dataView.Context.Profile = profile;
                }
                else if (dataView.Context.Profile.Name) {
                    const profile = await this.profilesService.get(dataView.Context.Profile.Name);
    
                    if (!profile) {
                        throw new Error(`Profile with Name = ${dataView.Context.Profile.Name} not found`);
                    }
    
                    dataView.Context.Profile = profile;
                }
            }
        }
    }


    compare(context: DataViewContext, identity: { InternalID: number; Type: string; PermissionRoleID: number}): boolean {
        const type = DataViewConverter.toType(context);
        const profile = context.Profile.InternalID;
        return identity.Type === type && identity.PermissionRoleID === profile;
    }

    mergeDataViews(target: DataView, origin: DataView | undefined) {

        // validation of fields that can't be changed
        if (origin) {
            if (target.Type !== origin.Type) {
                throw new Error(`DataView Type can't be changed from ${origin.Type} to ${target.Type}`);
            }

            if (target.Context) {
                if (DataViewConverter.toType(target.Context) != DataViewConverter.toType(origin.Context!) || 
                    target.Context.Profile.InternalID !== origin.Context!.Profile.InternalID) {
                        throw new Error(`The Context sent does not match the existing Context. Expected: ${JSON.stringify(target.Context)}, Actual: ${JSON.stringify(origin.Context)}`);
                    }
            }
        }

        target.InternalID = target.InternalID ?? origin?.InternalID ?? 0;
        target.Type = target.Type ?? origin?.Type;
        target.Hidden = target.Hidden ?? origin?.Hidden ?? false
        target.Context = target.Context ?? origin?.Context;
        target.Title = target.Title ?? origin?.Title ?? '';
        target.Fields = target.Fields ?? origin?.Fields ?? [];

        switch(target.Type) {
            case 'Grid':
                this.mergeGridDataViews(target, origin as (GridDataView | undefined));
                break;
    
            case 'Menu': 
                break;
    
            case 'Configuration':
                break;
    
            default:
                this.mergeBaseFormDataViews(target as BaseFormDataView, origin as (BaseFormDataView | undefined));
                break;
        }
    }

    mergeGridDataViews(target: GridDataView, origin: GridDataView | undefined) {
        target.Columns = target.Columns ?? origin?.Columns ?? []
        target.FrozenColumnsCount = target.FrozenColumnsCount ?? origin?.FrozenColumnsCount ?? 0
        target.MinimumColumnWidth = target.MinimumColumnWidth ?? origin?.MinimumColumnWidth ?? 0
    }
    mergeBaseFormDataViews(target: BaseFormDataView, origin: BaseFormDataView | undefined) {
        target.Columns = target.Columns ?? origin?.Columns ?? []
        target.Rows = target.Rows ?? origin?.Rows ?? []
    }

    async fieldTransformations(): Promise<{ [key: string]: NodeTransformer }> {
        const profiles = await this.profilesService.profiles();
        const atds = await this.objectReferencesService.objectReferences();
        return {
            'Type': false, // DataViewType unsupported
            'Title': false, // Title not supported

            // CreationDateTime => CreationDate
            'CreationDateTime': (f: JSONBaseFilter) => { 
                f.ApiName = 'CreationDate'
            },

            // ModificationDateTime => ModificationDate
            'ModificationDateTime': (f: JSONBaseFilter) => { 
                f.ApiName = 'ModificationDate'
            },
            
            // Context.Name is UIControl.Type
            'Context.Name': (f: JSONBaseFilter) => { 
                f.ApiName = 'Type'
                f.Operation = 'Contains'
            },

            // Context.ScreenSize is the suffix of UIControl.Type
            'Context.ScreenSize': (f: JSONBaseFilter) => {
                if (f.Values[0] === 'Tablet') {
                    return false;
                }
                else {
                    f.ApiName = 'Type';
                    f.Operation = 'EndWith';
                }
            },

            // is UIControl.PermissionRoleID
            'Context.Profile.InternalID': (f: JSONBaseFilter) => {
                f.ApiName = 'PermissionRoleID'
            },
            
            // doesn't exist on the UIControl
            // convert to InternalID filter
            'Context.Profile.Name': (f: JSONBaseFilter) => {
                f.ApiName = 'PermissionRoleID';
                f.Values = [`${profiles.find(profile => profile.Name === f.Values[0])?.InternalID || 0}`];
            },
            
            // Context.Object.Resource = activities => UIControl.Type starts with '[GA'
            'Context.Object.Resource': (f: JSONBaseFilter) => {
                f.ApiName = 'Type';
                f.Operation = 'StartWith';
                f.Values = [ '[' + DataViewConverter.toResourcePrefix(f.Values[0] as ResourceType) || '']
            },

            // for list resource this is the generic list UUID
            'Context.Object.UUID': (f: JSONBaseFilter) => {
                f.ApiName = 'Type';
                f.Operation = 'Contains';
            },
            
            // ATD.Internal ID in part of UIControl.Type
            'Context.Object.InternalID': (f: JSONBaseFilter) => {
                f.FieldType = 'String';
                f.ApiName = 'Type';
                f.Operation = 'Contains';
            },

            // doensn't exist on the UIControl
            // convert to InternalID filter
            'Context.Object.Name': (f: JSONBaseFilter) => {
                f.ApiName = 'Type';
                f.Operation = 'Contains',
                f.Values = [ atds.find(atd => atd.Name === f.Values[0])?.InternalID?.toString() || '' ]
            },
        };
    }

    static whereFields: { [key: string]: FieldType } = {
        'InternalID': 'Integer',
        'Type': 'String',
        'Title': 'String',
        'Hidden': 'Bool',
        'CreationDateTime': 'DateTime',
        'ModificationDateTime': 'DateTime',
        'Context.Name': 'String',
        'Context.ScreenSize': 'String',
        'Context.Profile.InternalID': 'Integer',
        'Context.Profile.Name': 'String',
        'Context.Object.Resource': 'String',
        'Context.Object.InternalID': 'Integer',
        'Context.Object.Name': 'String',
        'Context.Object.UUID': 'String',
    }

}