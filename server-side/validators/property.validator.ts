export function validateProperty(obj: any, key: string, type: 'number' | 'string' | 'boolean' | 'object' | 'array' | readonly string[], path: string = key, required: boolean = true) {
    const exists = (key in obj);
    if (!exists && required) {
        throw new Error(`Missing expected field: '${path}'`)
    }
    else if (exists) {
        if (type === 'array') {
            if (!Array.isArray(obj[key])) {
                throw new Error(`Expected field: '${path}' to be of type: 'array'`);
            }
        }
        else if (Array.isArray(type)) {
            // string enum
            if (!type.includes(obj[key])) {
                throw new Error(`Expected field: '${path}' to be of one of: ${type.join(', ')}`);
            }
        }
        else {
            if (typeof obj[key] !== type) {
                throw new Error(`Expected field: '${path}' to be of type: '${type}'`);
            }
        }
    }
}