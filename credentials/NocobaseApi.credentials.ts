import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NocobaseApi implements ICredentialType {
	name = 'nocobaseApi';
	displayName = 'NocoBase API';
	documentationUrl = 'https://docs.nocobase.com/api/getting-started'; // 您可以替换为更具体的文档链接
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://nocobase.example.com',
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