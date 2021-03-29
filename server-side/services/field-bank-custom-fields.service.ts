import { AddonData, AddonDataScheme, DataView, PapiClient, FieldBankCustomField } from "@pepperi-addons/papi-sdk";
import {v4 as uuid} from 'uuid';
import config from "../../addon.config.json";
import { DataViewService} from "./data-views.service";
import { validateBankFieldScheme } from "../validators/field-bank-custom-fields.validator";

export class FieldBankCustomFieldsService {
	constructor(private papiClient: PapiClient, private dataViewService: DataViewService) {}

	async upsert(fieldBankUUID: string, fieldBank: FieldBankCustomField): Promise <FieldBankCustomField> {
		const tableName = GetTableName(fieldBankUUID);

		validateBankFieldScheme(fieldBank);
		await this.validateThatTableExist(tableName);

		const key = fieldBank.Key ? fieldBank.Key : uuid();

		let fieldId = fieldBank.FieldPrefix;
		if (fieldBank.FieldParams && Object.keys(fieldBank.FieldParams).length > 0) {
			fieldId += "?" + new URLSearchParams(fieldBank.FieldParams).toString();
		}

		let addonData: AddonData = {
			Key: key,
			FieldID: fieldId
		};

		if (fieldBank.Key) {
			const existingField = await this.getCustomFieldByFieldUUID(tableName, fieldBankUUID, fieldBank.Key);
			if (fieldId !== existingField.FieldID){
				// Update fields of data views that contain the old field id
				const params = {OldFieldID: existingField.FieldID, NewFieldID: fieldId};
				const executionUuid = await this.papiClient.addons.api.async().uuid(config.AddonUUID).file('meta_data').func('update_data_views_fields').post(undefined,params);
				console.log(`executionUuid: ${executionUuid}`)

			}
		} else {
			addonData = {
				...addonData,
				...fieldBank
			}
            // Set the default for this field: TextBox
			if (!addonData.FieldType) {
				addonData.FieldType = `TextBox`
			}
		}
		const result = await this.papiClient.addons.data.uuid(config.AddonUUID).table(tableName).upsert(addonData);
		return <FieldBankCustomField> result;
	}

	async updateDataViews(newFieldID: string, oldFieldID: string): Promise <void> {

		const prefix = oldFieldID.substr(0, oldFieldID.indexOf('?'));
        // Update the field id of the data views that customized with the old field id
		// Search by prefix because the whole fieldID contains invalid characters (like '&')
		const uiControls = await this.papiClient.uiControls.find({fields : ['InternalID'], where: `UIControlData like '%"${prefix}%'` });
		const whereClauseOfIDs = uiControls.map(uc=>uc.InternalID).join("','");
		const dataViews = await this.dataViewService.find(`InternalID IN (${whereClauseOfIDs})`,false);
		const dataViewsToUpdate: DataView[] =[];
	
		for(let dataView of dataViews){
			if (dataView.Fields) {
				let needToUpdateDataView = false;
				for(let field of dataView.Fields) {
					if (field.FieldID === oldFieldID) {
						field.FieldID = newFieldID;
						needToUpdateDataView = true;
					}
				}
				if (needToUpdateDataView){
					dataViewsToUpdate.push(dataView);
				}
			}
		}
		if (dataViewsToUpdate.length > 0){
			await this.dataViewService.bulkUpsert(dataViewsToUpdate);
		}
	}

	private async validateThatTableExist(tableName: string): Promise <void> {
        // Create a table in ADAL if it does not exist
		const addonDataScheme: AddonDataScheme = {
			Name: tableName,
			Type: `data`,
		};
		await this.papiClient.addons.data.schemes.post(addonDataScheme);
	}

	async get(fieldBankUUID: string): Promise <FieldBankCustomField[]> {
		try {
			const tableName = GetTableName(fieldBankUUID);
			const result: AddonData[] = await this.papiClient.addons.data.uuid(config.AddonUUID).table(tableName).find();
			return <FieldBankCustomField[]> result;

		} catch (ex) {
			throw new Error(`Object with field Bank UUID: '${fieldBankUUID}' not found`);
		}
	}

	async getCustomFieldByFieldUUID(tableName: string, fieldBankUUID: string, fieldUUID: string): Promise < FieldBankCustomField > {
		try {
			let field = await this.papiClient.addons.data.uuid(config.AddonUUID).table(tableName).key(fieldUUID).get();
			return <FieldBankCustomField> field;
		} catch (ex) {
			throw new Error(`Object with field Bank UUID: '${fieldBankUUID}' and field UUID: '${fieldUUID}' not found`);
		}
	}
}

function GetTableName(fieldBankUUID: string) {
	return `${fieldBankUUID}_FieldBank`;
}
