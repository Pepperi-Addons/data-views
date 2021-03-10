import { validateProperty } from "./data-view.validator";
import {   DataViewFieldTypes } from "@pepperi-addons/papi-sdk";

export function validateBankFieldScheme(obj: any) {

    if (typeof obj !== 'object') {
        throw new Error(`Expected input to be of type 'object', instead get input of type '${typeof obj}'`);
    }
    validateProperty(obj, 'Title', 'string' ,'Title', true);
    validateProperty(obj, 'Group', 'string', 'Group', true);
    validateProperty(obj, 'FieldPrefix', 'string' , 'FieldPrefix', true);
    validateProperty(obj, 'FieldType', Object.keys(DataViewFieldTypes),'FieldType', false);
      
}