import {
	AddonData,
	AddonDataScheme,
	DataView,
	PapiClient,
	DataViewField,
    FieldBankCustomField
} from "@pepperi-addons/papi-sdk";
import {v4 as uuidv4} from 'uuid';
import config from "../../addon.config.json";
import {
	DataViewService
} from "./data-views.service";
import {
	validateBankFieldScheme
} from "../validators/bank-field.validator";

export class FieldBankService {
	constructor(private papiClient: PapiClient, private dataViewService: DataViewService) {}

	async upsert(fieldBankUUID: string, fieldBank: FieldBankCustomField): Promise <FieldBankCustomField> {
		const tableName = `${fieldBankUUID}_FieldBank`;

		validateBankFieldScheme(fieldBank);
		await this.validateThatTableExist(tableName);

		const fieldIdUUID = fieldBank.Key ? fieldBank.Key : uuidv4();

		let fieldId = fieldBank.FieldPrefix;
		if (fieldBank.FieldParams) {
			fieldId += "?" + new URLSearchParams(fieldBank.FieldParams).toString();
		}

		let addonData: AddonData = {
			Key: fieldIdUUID,
			FieldID: fieldId
		};
		if (fieldBank.Key) {
			const existingField = await this.getCustomFieldByFieldUUID(tableName, fieldBankUUID, fieldBank.Key);
			Object.assign(addonData, fieldBank);
			const isEqual = this.Comapre(<FieldBankCustomField>addonData, existingField);
			if (!isEqual)
				this.updateDataViews(fieldId, existingField.FieldID);

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

	private Comapre(newField: FieldBankCustomField, existingField: FieldBankCustomField) {
		return newField.FieldID === existingField.FieldID;
	}

	private async updateDataViews(newFieldID: string, oldFieldID ? : string): Promise <void> {

        // Update the field id of the data views that customized with the old field id
		const uiControlsIds = await this.papiClient.uiControls.find({fields : ['InternalID'], where: `UIControlData like '%${oldFieldID}%'` });
		for(let uiControl of uiControlsIds){
		    const dataViews = await this.dataViewService.find(`InternalID=${uiControl.InternalID}`,false);
            let dataView: DataView = dataViews[0];
		    let field = (<DataViewField[]>dataView?.Fields)?.find(f =>f.FieldID === oldFieldID);
            if (field){
                field.FieldID = newFieldID;
                await this.dataViewService.upsert(dataView);
            }
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

	async get(fieldBankUUID: string): Promise < FieldBankCustomField[]> {
		try {
			const tableName = `${fieldBankUUID}_FieldBank`;
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