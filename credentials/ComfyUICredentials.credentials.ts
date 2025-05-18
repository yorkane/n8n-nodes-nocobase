import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ComfyUICredentials implements ICredentialType {
	name = 'comfyUICredentials';
	displayName = 'ComfyUI Credentials';
	documentationUrl = 'https://docs.n8n.io/credentials/comfyui';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'http://127.0.0.1:8188',
			required: true,
		},
		{
			displayName: 'API 令牌',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
		},
		{
			displayName: '认证头名称',
			name: 'headerKey',
			type: 'string',
			default: 'Authorization',
			required: false,
			description: '自定义认证时使用的HTTP请求头名称，例如 "X-Api-Key"。默认为 "Authorization"。',
		},
	];
}