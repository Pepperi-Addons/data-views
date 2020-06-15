import { Client, Request } from '@pepperi-addons/debug-server'
import { ServiceProvider } from './service-provider'

export async function data_views(client: Client, request: Request) {
    const provider = new ServiceProvider(client, request);
    const service = provider.dataViewService();

    if (request.method === 'GET') {
        return service.find(request.query.where || '');
    }
};