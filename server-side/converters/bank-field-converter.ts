import { AddonData, FieldBank  } from "@pepperi-addons/papi-sdk";

export class BankFieldConverter {
  static toFieldBank(obj: AddonData): FieldBank {
    const res: FieldBank = {} as FieldBank;

    res.UUID = obj.Key;
    res.CreationDateTime = obj.CreationDateTime;
    res.ModificationDateTime = obj.ModificationDateTime;
    res.Hidden = obj.Hidden;
    res.FieldPrefix = obj.FieldPrefix;
    res.FieldType = obj.FieldType;
    res.Group = obj.Group;
    res.Title = obj.Title;
    res.FieldParams = obj.FieldParams;
    res.FieldID = obj.FieldID;

    return res;
  }
}
