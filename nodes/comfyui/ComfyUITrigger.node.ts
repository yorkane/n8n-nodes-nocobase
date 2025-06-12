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

export class comfyuiTrigger implements INodeType {
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
				name: 'httpHeaderAuth',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'ComfyUI 服务器地址',
				name: 'serverUrl',
				type: 'string',
				default: 'ws://127.0.0.1:8188',
				description: 'ComfyUI 服务器地址 (例如 ws://localhost:8188 或 wss://example.com)，不需要包含/ws路径',
				placeholder: 'ws://127.0.0.1:8188',
				required: true,
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
				displayName: '事件类型选择方式',
				name: 'eventTypeChoice',
				type: 'options',
				options: [
					{
						name: '预定义事件',
						value: 'predefined',
					},
					{
						name: '自定义事件',
						value: 'custom',
					},
				],
				default: 'predefined',
				description: '选择使用预定义事件类型还是自定义事件类型',
				required: true,
			},
			{
				displayName: '预定义事件类型',
				name: 'predefinedEventType',
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
				displayOptions: {
					show: {
						eventTypeChoice: ['predefined'],
					},
				},
				required: true,
			},
			{
				displayName: '自定义事件类型',
				name: 'customEventType',
				type: 'string',
				default: '',
				description: '输入要监听的自定义事件类型',
				placeholder: '例如: custom.event',
				displayOptions: {
					show: {
						eventTypeChoice: ['custom'],
					},
				},
				required: true,
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
			{
				displayName: '实例 ID',
				name: 'instanceId',
				type: 'string',
				default: '',
				description: '可选：为触发器实例指定一个ID，会附加到输出结果中。',
				required: false,
			},
			{
				displayName: '启用心跳保活',
				name: 'enableHeartbeat',
				type: 'boolean',
				default: true,
				description: '启用心跳机制以保持WebSocket连接活跃，防止连接超时',
				required: false,
			},
			{
				displayName: '心跳间隔 (秒)',
				name: 'heartbeatInterval',
				type: 'number',
				default: 30,
				description: '发送心跳消息的间隔时间（秒）',
				displayOptions: {
					show: {
						enableHeartbeat: [true],
					},
				},
				required: false,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// this.logger.info('ComfyUI Trigger 开始执行');

		// Get server URL from node parameters
		const serverUrl = this.getNodeParameter('serverUrl', '') as string;
		if (!serverUrl) {
			this.logger.error('ComfyUI 服务器地址未配置');
			throw new Error('ComfyUI 服务器地址是必需的');
		}

		// Get manual header parameters
		const manualHeaderKey = this.getNodeParameter('manualHeaderKey', '') as string;
		const manualHeaderValue = this.getNodeParameter('manualHeaderValue', '') as string;

		// Get credentials (optional)
		let headerKey = 'Authorization';
		let headerValue = '';
		try {
			const credentials = await this.getCredentials('httpHeaderAuth') as { name?: string; value?: string; } | undefined;
			if (credentials) {
				headerKey = credentials.name || 'Authorization';
				headerValue = credentials.value || '';
			}
		} catch (error) {
			// Credentials are optional, so we can continue without them
			this.logger.debug('未配置认证凭证，将不使用认证');
		}

		const eventTypeChoice = this.getNodeParameter('eventTypeChoice', 'predefined') as string;
		const eventType = eventTypeChoice === 'predefined' 
			? this.getNodeParameter('predefinedEventType', '') as string
			: this.getNodeParameter('customEventType', '') as string;
		const reconnectInterval = this.getNodeParameter('reconnectInterval', 5) as number;
		const maxRetries = this.getNodeParameter('maxRetries', -1) as number;
		const instanceId = this.getNodeParameter('instanceId', '') as string;
		const enableHeartbeat = this.getNodeParameter('enableHeartbeat', true) as boolean;
		const heartbeatInterval = this.getNodeParameter('heartbeatInterval', 30) as number;
		const clientId = randomUUID();

		const serverUrlToUse = serverUrl.trim();
		const headerKeyToUse = manualHeaderKey.trim() !== '' ? manualHeaderKey.trim() : headerKey.trim();
		const apiTokenToUse = manualHeaderValue.trim() !== '' ? manualHeaderValue.trim() : headerValue.trim();

		this.logger.debug(`配置信息: serverUrl=${serverUrlToUse}, eventType=${eventType}, clientId=${clientId}, reconnectInterval=${reconnectInterval}, maxRetries=${maxRetries}`);

		let retryCount = 0;
		let ws: WebSocket;
		let isClosing = false;
		let heartbeatTimer: NodeJS.Timeout | null = null;

		const createWebSocketConnection = () => {
			if (isClosing) return;

			try {
				// 解析WebSocket URL
				const parsedUrl = new URL(serverUrlToUse);
				let protocol: string;
				if (parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'ws:') {
					protocol = parsedUrl.protocol.slice(0, -1); // 移除末尾的 ':'
				} else {
					protocol = parsedUrl.protocol === 'https:' ? 'wss' : 'ws';
				}
				const wsUrl = `${protocol}://${parsedUrl.host}/ws?clientId=${clientId}`;
				// this.logger.info(`WebSocket URL: ${wsUrl}`);
				
				const authHeaders: { [key: string]: string } = {};
				if (apiTokenToUse) {
					authHeaders[headerKeyToUse.trim()] = apiTokenToUse.trim();
				}

				ws = new WebSocket(wsUrl, {
					headers: authHeaders,
				});

				ws.on('open', () => {
					this.logger.info(`WebSocket 连接已建立: ${wsUrl},headerKeyToUse=${headerKeyToUse},apiTokenToUse=${apiTokenToUse}`);
					retryCount = 0; // 重置重试计数
					
					// 启动心跳机制
					if (enableHeartbeat) {
						this.logger.debug(`启动心跳机制，间隔: ${heartbeatInterval}秒`);
						heartbeatTimer = setInterval(() => {
							if (ws && ws.readyState === WebSocket.OPEN) {
								try {
									// 发送ping消息保持连接活跃
									ws.ping();
									this.logger.debug('发送心跳ping消息');
								} catch (error) {
									this.logger.error('发送心跳消息失败', { error });
								}
							} else {
								// 连接已关闭，清理心跳定时器
								if (heartbeatTimer) {
									clearInterval(heartbeatTimer);
									heartbeatTimer = null;
								}
							}
						}, heartbeatInterval * 1000);
					}
				});

				ws.on('message', (data: WebSocket.Data) => {
					try {
						const message = JSON.parse(data.toString());
						const { type, data: eventData } = message;

						// this.logger.debug('收到WebSocket消息', { 
						// 	messageType: type,
						// 	messageData: eventData 
						// });

						if (eventType === 'all' || type === eventType) {
							const executionData: INodeExecutionData[][] = [[{
								json: {
									event: type,
									data: eventData,
									timestamp: new Date().toISOString(),
									instance_id: instanceId,
									original_url: serverUrlToUse,
								},
							}]];

							this.emit(executionData);
						}
					} catch (error) {
						this.logger.error('处理WebSocket消息时出错', { error });
					}
				});

				ws.on('error', (error) => {
					this.logger.error('WebSocket 错误', { error });
				});

				ws.on('close', () => {
					// this.logger.info('WebSocket 连接已关闭');
					
					// 清理心跳定时器
					if (heartbeatTimer) {
						clearInterval(heartbeatTimer);
						heartbeatTimer = null;
						this.logger.debug('已清理心跳定时器');
					}
					
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
				
				// 清理心跳定时器
				if (heartbeatTimer) {
					clearInterval(heartbeatTimer);
					heartbeatTimer = null;
					this.logger.debug('关闭时清理心跳定时器');
				}
				
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			},
		};
	}
}