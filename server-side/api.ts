import { Client, Request } from '@pepperi-addons/debug-server'
import { ServiceProvider } from "./service-provider";

export async function update_data_views_fields(client: Client, request: Request) {
    try {
        const provider = new ServiceProvider(client, request);
        const service = provider.fieldBankService();

        const params = request.body;
        const oldFieldID = params.OldFieldID;
        const newFieldID = params.NewFieldID;
        
        await service.updateDataViews(oldFieldID, newFieldID);
    } catch (ex) {
      throw new Error(ex);
    }
  }