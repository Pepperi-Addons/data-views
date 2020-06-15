import Bottle from 'bottlejs'
import { Client, Request } from '@pepperi-addons/debug-server'
import { PapiClient } from '@pepperi-addons/papi-sdk'
import { BackendService } from './services/backend.service';
import { UIControlService } from './services/ui-control.service';
import { ProfilesService } from './services/profiles.service';
import { ObjectReferenceService } from './services/object-reference.service';
import { DataViewService } from './services/data-views.service';

export class ServiceProvider {

    bottle: Bottle

    constructor(client: Client, request: Request) {
        this.bottle = new Bottle();

        this.bottle.service('PapiClient', function() {
            return new PapiClient({
                baseURL: client.BaseURL,
                token: client.OAuthAccessToken
            })
        });
        this.bottle.service('BackendService', BackendService, 'PapiClient');
        this.bottle.service('UIControlService', UIControlService, 'BackendService');
        this.bottle.service('ProfilesService', ProfilesService, 'BackendService');
        this.bottle.service('ObjectReferenceService', ObjectReferenceService, 'BackendService');
        this.bottle.service('DataViewService', DataViewService, 'UIControlService', 'ProfilesService', 'ObjectReferenceService');
    }

    backendService() {
        return this.bottle.container.BackendService as BackendService;
    }

    dataViewService() {
        return this.bottle.container.DataViewService as DataViewService;
    }
}