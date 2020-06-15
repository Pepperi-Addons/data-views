import { UIControlService } from "./ui-control.service";
import { ProfilesService } from "./profiles.service";
import { ObjectReferenceService } from "./object-reference.service";
import { DataViewConverter } from "../converters/data-view.converter";
import { DataView, ResourceType } from '@pepperi-addons/papi-sdk'
import { parse, transform, JSONFilter, JSONBaseFilter, toApiQueryString, filter, FieldType } from "@pepperi-addons/pepperi-filters";
import { NodeTransformer } from "@pepperi-addons/pepperi-filters/build/json-filter-transformer";
import { data_views } from "../meta_data";

export class DataViewService {

    constructor(
        private uiControlService: UIControlService, 
        private profilesService: ProfilesService,
        private objectReferencesService: ObjectReferenceService
        ) {

    }

    async get(internalID: number) {
        const uiControl = await this.uiControlService.get(internalID);

        if (!uiControl) {
            throw new Error(`DataView with InternalID = ${internalID} not found`);
        }

        const res = DataViewConverter.toDataView(uiControl)
        await this.updateFields(res);
        return res;
    }

    async find(where: string = '') {
        const jsonFilter = parse(where, DataViewService.whereFields);

        const transformedFilter = transform(jsonFilter, await this.fieldTransformations());

        const uiControlWhere = toApiQueryString(transformedFilter);
        console.log('DataView where:', where, ', UIControl where:', uiControlWhere)
        const uiControls = await this.uiControlService.find(uiControlWhere || '');
        console.log('Returned', uiControls.length, 'UIControls');
        
        let res = uiControls.map(DataViewConverter.toDataView);

        for (let dataView of res) {
            await this.updateFields(dataView);
        }

        // now lets filter them again
        // for filters that aren't supported
        res = filter(res, jsonFilter);
        
        return res;
    }

    async updateFields(dataView: DataView) {
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
    }

}