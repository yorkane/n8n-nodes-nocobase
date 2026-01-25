"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NocobaseApi = void 0;
class NocobaseApi {
    constructor() {
        this.name = 'nocobaseApi';
        this.displayName = 'NocoBase API';
        this.documentationUrl = 'https://docs.nocobase.com/api/getting-started';
        this.properties = [
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: '',
                placeholder: 'e.g. https://nocobase.example.com no `/api` included',
                description: 'The base URL of your NocoBase instance (e.g. https://nocobase.example.com)',
                required: true,
            },
            {
                displayName: 'API Token',
                name: 'token',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                description: 'Your NocoBase API Secret token',
                required: true,
            },
        ];
    }
}
exports.NocobaseApi = NocobaseApi;
