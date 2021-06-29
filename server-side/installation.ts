import { Client, Request } from "@pepperi-addons/debug-server"
import semver from 'semver'
import { ServiceProvider } from "./service-provider"

export async function install(client: Client, request: Request) {
    return {success:true}
}

export async function uninstall(client: Client, request: Request) {
    return {success:true}
}

export async function upgrade(client: Client, request: Request) {
    // DI-18161
    // When upgrading from version '1.0.3' or less
    // we want to fix Grid UIControls that were created with Columns != 1
    if (request.body.FromVersion && semver.compare(request.body.FromVersion, '1.0.3') <= 0) {
        const provider = new ServiceProvider(client, request);
        const uiControlService = provider.uiControlService();
        const dataViewService = provider.dataViewService();

        // get all corrupted UIControl ID's
        const uiControlsIds = await uiControlService.allUIControlsIdentities(
            `UIControlData LIKE '%ViewType\":1%' AND UIControlData NOT LIKE '%Columns\":1%'`
        ).then(res => res.map(uic => uic.InternalID));
        if (uiControlsIds.length) {
            console.log(`found ${uiControlsIds.length} corrupted IDs: `, uiControlsIds);
    
            // get the data views
            const dataViews = await dataViewService.find(`InternalID IN (${uiControlsIds.join(',')})`, true);

            // make sure we get the exact right number
            if (uiControlsIds.length !== dataViews.length) {
                throw new Error(`Error fixing corrupted data views, expecting to fix ${uiControlsIds.length} dataViews, but could only fix ${dataViews.length}`)
            }
            
            // updated them will fix the issue
            const upsertResult = await dataViewService.bulkUpsert(dataViews);

            console.log("Bulk upsert result: ", upsertResult);
        }
    }
    return {success:true}
}

export async function downgrade(client: Client, request: Request) {
    return {success:true}
}