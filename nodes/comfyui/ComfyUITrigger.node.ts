/// <reference lib="dom" />
import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';

export class ComfyUITrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI Trigger',
		name: 'comfyUiTrigger',
		icon: 'file:comfyui.svg',
		group: ['trigger'],
		version: 1,
		description: '触发器，用于监听ComfyUI WebSocket事件',
		defaults: {
			name: 'ComfyUI Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'comfyUICredentials',
				required: true,
			},
		],
		properties: [
			{
				displayName: '手动指定 ComfyUI 地址',
				name: 'manualApiUrl',
				type: 'string',
				default: '',
				description: '可选：手动输入 ComfyUI WebSocket 地址 (例如 ws://localhost:8188/ws 或 wss://example.com/ws)。如果填写，将覆盖凭证中的地址。',
				placeholder: 'ws://127.0.0.1:8188/ws',
				required: false,
			},
			{
				displayName: '手动指定 Header Key',
				name: 'manualHeaderKey',
				type: 'string',
				default: '',
				description: '可选：手动输入认证 Header 的 Key (例如 Authorization)。如果填写，将覆盖凭证中的 Header Key。',
				required: false,
			},
			{
				displayName: '手动指定 Header Value',
				name: 'manualHeaderValue',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: '可选：手动输入认证 Header 的 Value. 如果填写，将覆盖凭证中的 Header Value。',
				required: false,
			},
			{
				displayName: '事件类型',
				name: 'eventType',
				type: 'options',
				options: [
					{
						name: 'ky_monitor',
						value: 'ky_monitor.queue',
						description: '当工作流开始执行时触发',
					},
					{
						name: '状态更新',
						value: 'status',
						description: '当状态更新时触发',
					},
					{
						name: '所有事件',
						value: 'all',
						description: '监听所有事件类型',
					},
				],
				default: 'ky_monitor.queue',
				description: '要监听的ComfyUI事件类型',
				required: true,
			},
			{
				displayName: '特定Prompt ID',
				name: 'promptId',
				type: 'string',
				default: '',
				description: '可选：仅监听特定Prompt ID的事件，留空则监听所有',
				required: false,
			},
			{
				displayName: '重连间隔 (秒)',
				name: 'reconnectInterval',
				type: 'number',
				default: 5,
				description: '断开连接后等待多少秒尝试重新连接',
				required: false,
			},
			{
				displayName: '最大重试次数',
				name: 'maxRetries',
				type: 'number',
				default: -1,
				description: '最大重试次数，-1表示无限重试',
				required: false,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		this.logger.info('ComfyUI Trigger 开始执行');

		// Get credentials
		const credentials = await this.getCredentials('comfyUICredentials') as { apiUrl: string; apiToken?: string; headerKey?: string; } | undefined;

		if (!credentials || !credentials.apiUrl) {
			this.logger.error('ComfyUI Credentials (apiUrl) not configured or missing apiUrl field.');
			throw new Error('ComfyUI Credentials (apiUrl) are required and not configured or missing apiUrl field.');
		}
		const serverUrlFromCreds = credentials.apiUrl;
		const apiTokenFromCreds = credentials.apiToken;
		const headerKeyFromCreds = credentials.headerKey;

		const manualApiUrl = this.getNodeParameter('manualApiUrl', '') as string;
		const manualHeaderKey = this.getNodeParameter('manualHeaderKey', '') as string;
		const manualHeaderValue = this.getNodeParameter('manualHeaderValue', '') as string;

		const eventType = this.getNodeParameter('eventType', '') as string;
		const promptId = this.getNodeParameter('promptId', '') as string;
		const reconnectInterval = this.getNodeParameter('reconnectInterval', 5) as number;
		const maxRetries = this.getNodeParameter('maxRetries', -1) as number;
		const clientId = randomUUID();

		const serverUrlToUse = manualApiUrl.trim() !== '' ? manualApiUrl.trim() : serverUrlFromCreds;
		const headerKeyToUse = manualHeaderKey.trim() !== '' ? manualHeaderKey.trim() : (headerKeyFromCreds && headerKeyFromCreds.trim() !== '' ? headerKeyFromCreds.trim() : 'Authorization');
		const apiTokenToUse = manualHeaderValue.trim() !== '' ? manualHeaderValue.trim() : apiTokenFromCreds;

		this.logger.debug(`配置信息: serverUrl=${serverUrlToUse}, eventType=${eventType}, promptId=${promptId}, clientId=${clientId}, reconnectInterval=${reconnectInterval}, maxRetries=${maxRetries}`);

		let retryCount = 0;
		let ws: WebSocket;
		let isClosing = false;

		const createWebSocketConnection = () => {
			if (isClosing) return;

			try {
				// 解析WebSocket URL
				const parsedUrl = new URL(serverUrlToUse);
				const protocol = parsedUrl.protocol === 'https:' ? 'wss' : 'ws';
				const wsUrl = `${protocol}://${parsedUrl.host}/ws?clientId=${clientId}`;
				this.logger.info(`WebSocket URL: ${wsUrl}`);
				
				let authHeaders: { [key: string]: string } = {};
				if (apiTokenToUse) {
					authHeaders[headerKeyToUse] = apiTokenToUse;
				}

				ws = new WebSocket(wsUrl, {
					headers: authHeaders,
				});

				ws.on('open', () => {
					this.logger.info('WebSocket 连接已建立');
					retryCount = 0; // 重置重试计数
				});

				ws.on('message', (data: WebSocket.Data) => {
					try {
						const message = JSON.parse(data.toString());
						const { type, data: eventData } = message;

						this.logger.debug('收到WebSocket消息', { 
							messageType: type,
							messageData: eventData 
						});

						if (eventType === 'all' || type === eventType) {
							if (!promptId || (eventData && eventData.prompt_id === promptId)) {
								const executionData: INodeExecutionData[][] = [[{
									json: {
										event: type,
										data: eventData,
										timestamp: new Date().toISOString(),
									},
								}]];

								this.emit(executionData);
							}
						}
					} catch (error) {
						this.logger.error('处理WebSocket消息时出错', { error });
					}
				});

				ws.on('error', (error) => {
					this.logger.error('WebSocket 错误', { error });
				});

				ws.on('close', () => {
					this.logger.info('WebSocket 连接已关闭');
					if (!isClosing) {
						if (maxRetries === -1 || retryCount < maxRetries) {
							retryCount++;
							this.logger.info(`尝试重新连接 (第 ${retryCount} 次)...`);
							setTimeout(createWebSocketConnection, reconnectInterval * 1000);
						} else if (maxRetries !== -1) {
							this.logger.error(`达到最大重试次数 (${maxRetries}), 停止重连`);
						}
					}
				});

			} catch (error) {
				this.logger.error(`创建WebSocket连接时出错 - 无效的服务器URL: ${serverUrlToUse}`, { error });

				if (!isClosing && (maxRetries === -1 || retryCount < maxRetries)) {
					retryCount++;
					this.logger.info(`尝试重新连接 (第 ${retryCount} 次) due to connection creation error...`);
					setTimeout(createWebSocketConnection, reconnectInterval * 1000);
				} else if (!isClosing) {
					this.logger.error(`达到最大重试次数 (${maxRetries}) 或不允许重试, 停止重连 (connection creation error)`);
				}
			}
		};

		createWebSocketConnection();

		return {
			closeFunction: async () => {
				this.logger.info('关闭 WebSocket 连接');
				isClosing = true;
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			},
		};
	}
}

export { ComfyUITrigger as comfyUiTrigger };