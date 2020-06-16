import { Client, Request } from '@pepperi-addons/debug-server'
import { ServiceProvider } from './service-provider'
import { performance } from 'perf_hooks';

export async function data_views(client: Client, request: Request) {
    const t0 = performance.now();
    
    const provider = new ServiceProvider(client, request);
    const service = provider.dataViewService();
    let res: any = undefined;

    if (request.method === 'GET') {
        res = await service.find(request.query.where || '');
    }
    else if (request.method === 'POST') {
        res = await service.upsert(request.body);
    }

    console.log('Request:', JSON.stringify(request), 'took', (performance.now() - t0).toFixed(2), 'milliseconds')

    return res;
};