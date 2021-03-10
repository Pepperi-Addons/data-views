import {  AddonData, AddonDataScheme, DataView, PapiClient, FieldBank } from "@pepperi-addons/papi-sdk";

import config from "../../addon.config.json";
import { Guid } from "../../shared/Guid";
import { BankFieldConverter } from "../converters/bank-field-converter";
import { DataViewService } from "./data-views.service";
import {  validateBankFieldScheme } from "../validators/bank-field.validator";

export class BankFieldService {
  constructor(private papiClient: PapiClient, private dataViewService: DataViewService) {}

  async upsert(fieldBankUUID: string, fieldBank: FieldBank): Promise<FieldBank> {
    const tableName = `${fieldBankUUID}_FieldBank`;

    validateBankFieldScheme(fieldBank);
    await this.validateThatTableExist(tableName);
    
    const fieldIdUUID = fieldBank.UUID ? fieldBank.UUID : Guid.newGuid();
    let fieldId = fieldBank.FieldPrefix;
    if (fieldBank.FieldParams) {
      fieldId += "?" + new URLSearchParams(fieldBank.FieldParams).toString();
    }

    let addonData: AddonData = { Key: fieldIdUUID, FieldID: fieldId };
    if (fieldBank.UUID) {
      const existingField = await this.getByFieldUUID(tableName, fieldBankUUID, fieldBank.UUID);

      Object.assign(addonData, fieldBank);
      this.updateDataViews(fieldId, existingField.FieldID);

    } else {
      Object.assign(addonData, {
        Title: fieldBank.Title,
        Group: fieldBank.Group,
        FieldPrefix: fieldBank.FieldPrefix,
        FieldParams: fieldBank.FieldParams,
        Hidden: fieldBank.Hidden,
        FieldType: fieldBank.FieldType ? fieldBank.FieldType : "1", 
      });
    }
    const result = await this.papiClient.addons.data.uuid(config.AddonUUID).table(tableName).upsert(addonData);
    return BankFieldConverter.toFieldBank(result);
  }

  private async updateDataViews(newFieldID: string, oldFieldID?: string): Promise<void> {
    let dataViewsToUpdate: DataView[] = [];
    this.dataViewService
      .find("", false)
      .then((dataViews) => {
        dataViews.forEach((data_view) => {
          if (data_view.Fields)
            data_view.Fields.forEach((field) => {
              if (field.FieldID == oldFieldID) {
                field.FieldID = newFieldID;
                dataViewsToUpdate.push(data_view);
              }
            });
        });
      })
      .then(() => {
        if (dataViewsToUpdate.length > 0) {
          this.dataViewService.bulkUpsert(dataViewsToUpdate);
        }
      });
  }

  private async validateThatTableExist(tableName: string): Promise<void> {
    try {
      await this.papiClient.addons.data.uuid(config.AddonUUID).table(tableName).find();
    } catch (ex) {
      // table doesn't exit - create new
      const addonDataScheme: AddonDataScheme = {
        Name: tableName,
        Type: `data`,
      };
      await this.papiClient.addons.data.schemes.post(addonDataScheme);
    }
  }

  async get(fieldBankUUID: string): Promise<FieldBank[]> {
    try {
      const tableName = `${fieldBankUUID}_FieldBank`;

      return this.papiClient.addons.data
        .uuid(config.AddonUUID)
        .table(tableName)
        .find()
        .then((arr) => arr.map(BankFieldConverter.toFieldBank));
    } catch (ex) {
      throw new Error(`Object with field Bank UUID: '${fieldBankUUID}' not found`);
    }
  }

  async getByFieldUUID(tableName: string, fieldBankUUID: string, fieldUUID: string): Promise<FieldBank> {
    try {
      let field = await this.papiClient.addons.data.uuid(config.AddonUUID).table(tableName).key(fieldUUID).get();
      return BankFieldConverter.toFieldBank(field);
    } catch (ex) {
      throw new Error(`Object with field Bank UUID: '${fieldBankUUID}' and field UUID: '${fieldUUID}' not found`);
    }
  }
}
