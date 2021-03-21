import Bottle from 'bottlejs'
import { Client, Request } from '@pepperi-addons/debug-server'
import { PapiClient } from '@pepperi-addons/papi-sdk'
import { UIControlService } from './services/ui-control.service';
import { ProfilesService } from './services/profiles.service';
import { ObjectReferenceService } from './services/object-reference.service';
import { DataViewService } from './services/data-views.service';
import { FieldBankCustomFieldsService } from "./services/field-bank-custom-fields.service";

export class ServiceProvider {
  bottle: Bottle;

  constructor(client: Client, request: Request) {
        this.bottle = new Bottle();

        this.bottle.service('PapiClient', function() {
            return new PapiClient({
                baseURL: client.BaseURL,
                token: client.OAuthAccessToken,
                addonSecretKey: client.AddonSecretKey,
                addonUUID: client.AddonUUID

            })
        });
        this.bottle.service('UIControlService', UIControlService, 'PapiClient');
        this.bottle.service('ProfilesService', ProfilesService, 'PapiClient');
        this.bottle.service('ObjectReferenceService', ObjectReferenceService, 'PapiClient');
        this.bottle.service('DataViewService', DataViewService, 'UIControlService', 'ProfilesService', 'ObjectReferenceService', 'PapiClient');
        this.bottle.service("FieldBankService", FieldBankCustomFieldsService, "PapiClient", "DataViewService");
  }

  dataViewService() {
    return this.bottle.container.DataViewService as DataViewService;
  }
  fieldBankService() {
    return this.bottle.container.FieldBankService as FieldBankCustomFieldsService;  
  }
}
