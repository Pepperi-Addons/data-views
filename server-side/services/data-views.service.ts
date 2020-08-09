import { UIControlService } from "./ui-control.service";
import { ProfilesService } from "./profiles.service";
import { ObjectReferenceService } from "./object-reference.service";
import { DataViewConverter } from "../converters/data-view.converter";
import { DataView, ResourceType, DataViewContext, UIControlData } from '@pepperi-addons/papi-sdk'
import { parse, transform, JSONFilter, JSONBaseFilter, toApiQueryString, filter, FieldType, concat } from "@pepperi-addons/pepperi-filters";
import { NodeTransformer } from "@pepperi-addons/pepperi-filters/build/json-filter-transformer";
import { validateDataView } from "../validators/data-view.validator";

export class DataViewService {

    constructor(
        private uiControlService: UIControlService, 
        private profilesService: ProfilesService,
        private objectReferencesService: ObjectReferenceService
        ) {

    }

    async get(internalID: number): Promise<DataView> {
        const uiControl = await this.uiControlService.get(internalID);

        if (!uiControl) {
            throw new Error(`Could not find DataView with InternalID = ${internalID}`);
        }

        const res = DataViewConverter.toDataView(uiControl)
        await this.updateContext(res);
        return res;
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

    async upsert(dataView: DataView): Promise<DataView> {

        validateDataView(dataView);
        
        // this might be updating an existing dataView or creating a new one
        let existing: DataView | undefined = undefined;
        
        // if InternalID was specified always look for the dataView with that UIControl
        if (dataView.InternalID) {
            existing = await this.get(dataView.InternalID);

            await this.updateContext(dataView);

            if (!this.compare(dataView.Context, existing.Context)) {
                throw new Error(`The Context send does not match the current Context. Current Context: ${JSON.stringify(existing.Context)}`)
            }
        }
        else {
            await this.updateContext(dataView);
            
            // See if there is a dataview with this context already
            let where = this.createContextQuery(dataView.Context);
            let results = await this.find(where, false);
            if (results.length > 1) {
                throw new Error(`There should only be one data view for context: ${JSON.stringify(dataView.Context)}`);
            }
            else if (results.length == 1) {
                existing = results[0];
            } 
        }

        const uiControl: UIControlData =  await this.uiControlService.upsert(DataViewConverter.toUIControlData(dataView));
        const res =  DataViewConverter.toDataView(uiControl);
        
        // update fields that don't exist on the UIControl  
        await this.updateContext(res);

        return res;
    }

    async updateContext(dataView: DataView) {
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


    compare(c1: DataViewContext, c2: DataViewContext): boolean {
        let res = true;

        // dataView.Context.Name must equal
        res = res && c1.Name === c2.Name;

        // dataView.Context.ScreenSize must equal
        res = res && c1.ScreenSize === c2.ScreenSize;

        // dataView.Context.Profile must equal
        res = res && c1.Profile.InternalID === c2.Profile.InternalID;

        // dataView.Context.Object must equal
        if (res && c1.Object) {
            res = res && !!c2.Object;
            if (res && c2.Object) {
                res = res && c1.Object.Resource === c2.Object.Resource;

                // atds
                if (c1.Object.Resource !== 'lists') {
                    res = res && c1.Object.InternalID == c2.Object.InternalID;
                }
                else {
                    // generic lists
                    res = res && c1.Object.UUID === c2.Object.UUID;
                }
            }
        }
    
        return res;
    }

    createContextQuery(context: DataViewContext) {
        const where = concat(
            true, 
            `Context.Name = '${context.Name}'`,
            `Context.ScreenSize = '${context.ScreenSize}'`,
            `Context.Profile.InternalID = ${context.Profile.InternalID}`,
            context.Object ? `Context.Object.Resource = '${context.Object.Resource}'` : undefined,
            context.Object?.Resource === 'lists' ? `Context.Object.InternalID = ${context.Object.InternalID}` : undefined,
            context.Object && context.Object.Resource !== 'lists' ? `Context.Object.UUID = '${context.Object.UUID}'` : undefined,
        )
        return where;
    }

    async fieldTransformations(): Promise<{ [key: string]: NodeTransformer }> {
        const profiles = await this.profilesService.profiles();
        const atds = await this.objectReferencesService.objectReferences();
        return {
            'Type': false, // DataViewType unsupported
            'Title': false, // Title not supported
            
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
                f.Values = [profiles.find(profile => profile.Name === f.Values[0])?.Name || ''];
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
        'CreationDate': 'DateTime',
        'ModificationDate': 'DateTime',
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