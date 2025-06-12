import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import axios from 'axios';

export class comfyui implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI',
		name: 'comfyUi',
		icon: 'file:comfyui.svg',
		group: ['transform'],
		version: 1,
		description: '管理ComfyUI的模型资源和队列',
		defaults: {
			name: 'ComfyUI',
		},
		inputs: [NodeConnectionType.Main],
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
				default: 'http://127.0.0.1:8188',
				description: 'ComfyUI 服务器地址 (例如 http://localhost:8188 或 https://example.com)',
				placeholder: 'http://127.0.0.1:8188',
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
				displayName: '操作类别',
				name: 'operationCategory',
				type: 'options',
				options: [
					{
						name: '队列管理',
						value: 'queue',
						description: '管理ComfyUI的工作流队列',
					},
					{
						name: '模型管理',
						value: 'models',
						description: '获取和管理ComfyUI的模型资源',
					},
				],
				default: 'queue',
				required: true,
				description: '要执行的操作类别',
			},
			// 队列管理操作
			{
				displayName: '队列操作',
				name: 'queueOperation',
				type: 'options',
				options: [
					{
						name: '获取最近5条历史记录',
						value: 'getRecentHistory',
						description: '获取最近5条历史记录',
					},
					{
						name: '获取队列状态',
						value: 'getQueueStatus',
						description: '获取当前队列状态',
					},
					{
						name: '清空队列',
						value: 'clearQueue',
						description: '清空当前队列中的所有任务',
					},
					{
						name: '中断当前执行',
						value: 'interruptExecution',
						description: '中断当前正在执行的任务',
					},
					{
						name: '清空历史记录',
						value: 'clearHistory',
						description: '清空历史记录',
					},
					{
						name: '删除历史记录项',
						value: 'deleteHistoryItem',
						description: '删除特定的历史记录项',
					},
					{
						name: '获取系统信息',
						value: 'getSystemInfo',
						description: '获取ComfyUI系统信息',
					},
				],
				default: 'getQueueStatus',
				required: true,
				description: '要执行的队列操作',
				displayOptions: {
					show: {
						operationCategory: ['queue'],
					},
				},
			},
			// 删除历史记录项参数
			{
				displayName: 'Prompt ID',
				name: 'promptId',
				type: 'string',
				default: '',
				description: '要删除的历史记录项的Prompt ID',
				displayOptions: {
					show: {
						operationCategory: ['queue'],
						queueOperation: ['deleteHistoryItem'],
					},
				},
				required: true,
			},
			// 模型管理操作
			{
				displayName: '模型操作',
				name: 'modelsOperation',
				type: 'options',
				options: [
					{
						name: '获取所有模型',
						value: 'getAllModels',
						description: '获取所有可用模型的列表',
					},
					{
						name: '获取特定类型模型',
						value: 'getModelsByType',
						description: '获取特定类型的模型列表',
					},
					{
						name: '获取采样器列表',
						value: 'getSamplers',
						description: '获取可用的采样器列表',
					},
					{
						name: '获取调度器列表',
						value: 'getSchedulers',
						description: '获取可用的调度器列表',
					},
					{
						name: '获取扩展列表',
						value: 'getExtensions',
						description: '获取已安装的扩展列表',
					},
					{
						name: '获取嵌入向量列表',
						value: 'getEmbeddings',
						description: '获取可用的嵌入向量列表',
					},
				],
				default: 'getAllModels',
				required: true,
				description: '要执行的模型操作',
				displayOptions: {
					show: {
						operationCategory: ['models'],
					},
				},
			},
			// 获取特定类型模型参数
			{
				displayName: '模型类型',
				name: 'modelType',
				type: 'options',
				options: [
					{
						name: '检查点模型',
						value: 'checkpoints',
						description: '稳定扩散检查点模型',
					},
					{
						name: 'VAE',
						value: 'vae',
						description: 'VAE模型',
					},
					{
						name: 'LoRA',
						value: 'loras',
						description: 'LoRA模型',
					},
					{
						name: 'ControlNet',
						value: 'controlnet',
						description: 'ControlNet模型',
					},
					{
						name: 'CLIP',
						value: 'clip',
						description: 'CLIP模型',
					},
					{
						name: 'CLIP Vision',
						value: 'clip_vision',
						description: 'CLIP Vision模型',
					},
					{
						name: '扩散器',
						value: 'diffusers',
						description: 'Diffusers模型',
					},
					{
						name: '正则化图像',
						value: 'regularization',
						description: '正则化图像',
					},
					{
						name: '升频器',
						value: 'upscale_models',
						description: '图像升频模型',
					},

				],
				default: 'checkpoints',
				description: '要获取的模型类型',
				displayOptions: {
					show: {
						operationCategory: ['models'],
						modelsOperation: ['getModelsByType'],
					},
				},
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// 获取基本参数
				let serverUrl = this.getNodeParameter('serverUrl', i) as string;
				// serverUrl 需要去掉末尾斜杠及以后的部分，用正则表达式匹配
				serverUrl = serverUrl.replace(/\/+$/, '');


				const operationCategory = this.getNodeParameter('operationCategory', i) as string;
				const manualHeaderKey = this.getNodeParameter('manualHeaderKey', i, '') as string;
				const manualHeaderValue = this.getNodeParameter('manualHeaderValue', i, '') as string;

				// 获取认证信息
				let headerKey = 'Authorization';
				let headerValue = '';
				try {
					const credentials = await this.getCredentials('httpHeaderAuth') as { name?: string; value?: string; } | undefined;
					if (credentials) {
						headerKey = credentials.name || 'Authorization';
						headerValue = credentials.value || '';
					}
				} catch (error) {
					// 凭证是可选的，所以可以继续
				}

				// 使用手动指定的header覆盖凭证
				const headerKeyToUse = manualHeaderKey.trim() !== '' ? manualHeaderKey.trim() : headerKey.trim();
				const headerValueToUse = manualHeaderValue.trim() !== '' ? manualHeaderValue.trim() : headerValue.trim();

				// 准备请求头
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};

				if (headerValueToUse) {
					headers[headerKeyToUse] = headerValueToUse;
				}

				// 移除可能导致问题的Content-Type头，某些GET请求不需要
				const getHeaders = { ...headers };
				delete getHeaders['Content-Type'];

				// 根据操作类别执行不同的逻辑
				let responseData;

				if (operationCategory === 'queue') {
					// 队列管理操作
					const queueOperation = this.getNodeParameter('queueOperation', i) as string;
					if (queueOperation === 'getRecentHistory') {
						// 获取最近5条历史记录
						try {
							responseData = (await axios.get(
								`${serverUrl}/history?max_items=5`,
								{ headers: getHeaders, timeout: 10000 }
							)).data;
						} catch (error) {
							// 如果/history失败，尝试/api/history
							responseData = (await axios.get(
								`${serverUrl}/api/history`,
								{ headers: getHeaders, timeout: 10000 }
							)).data;
						}
					}

					if (queueOperation === 'getQueueStatus') {
						// 获取队列状态
						try {
							responseData = (await axios.get(
								`${serverUrl}/queue`,
								{ headers: getHeaders, timeout: 10000 }
							)).data;
						} catch (error) {
							// 如果/queue失败，尝试/api/queue
							responseData = (await axios.get(
								`${serverUrl}/api/queue`,
								{ headers: getHeaders, timeout: 10000 }
							)).data;
						}
					} else if (queueOperation === 'clearQueue') {
						// 清空队列
						try {
							await axios.post(
								`${serverUrl}/queue`,
								{ clear: true },
								{ headers, timeout: 10000 }
							);
						} catch (error) {
							// 如果/queue失败，尝试/api/queue
							await axios.post(
								`${serverUrl}/api/queue`,
								{ clear: true },
								{ headers, timeout: 10000 }
							);
						}
						responseData = { success: true, message: '队列已清空' };
					} else if (queueOperation === 'interruptExecution') {
						// 中断当前执行
						try {
							await axios.post(
								`${serverUrl}/interrupt`,
								{},
								{ headers, timeout: 10000 }
							);
						} catch (error) {
							// 如果/interrupt失败，尝试/api/interrupt
							await axios.post(
								`${serverUrl}/api/interrupt`,
								{},
								{ headers, timeout: 10000 }
							);
						}
						responseData = { success: true, message: '已中断当前执行' };
					} else if (queueOperation === 'clearHistory') {
						// 清空历史记录
						try {
							await axios.post(
								`${serverUrl}/history`,
								{ clear: true },
								{ headers, timeout: 10000 }
							);
						} catch (error) {
							// 如果/history失败，尝试/api/history
							await axios.post(
								`${serverUrl}/api/history`,
								{ clear: true },
								{ headers, timeout: 10000 }
							);
						}
						responseData = { success: true, message: '历史记录已清空' };
					} else if (queueOperation === 'deleteHistoryItem') {
						// 删除历史记录项
						const promptId = this.getNodeParameter('promptId', i) as string;
						try {
							await axios.post(
								`${serverUrl}/history`,
								{ delete: [promptId] },
								{ headers, timeout: 10000 }
							);
						} catch (error) {
							// 如果/history失败，尝试/api/history
							await axios.post(
								`${serverUrl}/api/history`,
								{ delete: [promptId] },
								{ headers, timeout: 10000 }
							);
						}
						responseData = { success: true, message: `历史记录项 ${promptId} 已删除` };
					} else if (queueOperation === 'getSystemInfo') {
						// 获取系统信息
						try {
							responseData = (await axios.get(
								`${serverUrl}/system_stats`,
								{ headers: getHeaders, timeout: 10000 }
							)).data;
						} catch (error) {
							// 如果/system_stats失败，尝试/api/system_stats
							responseData = (await axios.get(
								`${serverUrl}/api/system_stats`,
								{ headers: getHeaders, timeout: 10000 }
							)).data;
						}
					}
				} else if (operationCategory === 'models') {
					// 模型管理操作
					const modelsOperation = this.getNodeParameter('modelsOperation', i) as string;

					if (modelsOperation === 'getAllModels') {
						// 获取所有模型
						const response = await axios.get(
							`${serverUrl}/object_info`,
							{ headers: getHeaders }
						);

						responseData = response.data;
					} else if (modelsOperation === 'getModelsByType') {
						// 获取特定类型模型
						const modelType = this.getNodeParameter('modelType', i) as string;

						// 获取并过滤特定类型的模型
						const allModels = (await axios.get(
							`${serverUrl}/object_info`,
							{ headers: getHeaders }
						)).data;
						const filteredModels: Record<string, any> = {};

						// 检查模型类型是否存在
						if (allModels[modelType]) {
							filteredModels[modelType] = allModels[modelType];
						}

						responseData = filteredModels;
					} else if (modelsOperation === 'getSamplers') {
						// 获取采样器列表
						responseData = (await axios.get(
							`${serverUrl}/samplers`,
							{ headers: getHeaders }
						)).data;
					} else if (modelsOperation === 'getSchedulers') {
						// 获取调度器列表
						responseData = (await axios.get(
							`${serverUrl}/schedulers`,
							{ headers: getHeaders }
						)).data;
					} else if (modelsOperation === 'getExtensions') {
						// 获取扩展列表
						responseData = (await axios.get(
							`${serverUrl}/extensions`,
							{ headers: getHeaders }
						)).data;
					} else if (modelsOperation === 'getEmbeddings') {
						// 获取嵌入向量列表
						responseData = (await axios.get(
							`${serverUrl}/embeddings`,
							{ headers: getHeaders }
						)).data;
					}
				}

				// 返回结果
				returnData.push({
					json: responseData,
				});
			} catch (error) {
				const suggestion = comfyui.getErrorSuggestion(error);
				const errorInfo = {
					error: error.message,
					status: error.response?.status,
					statusText: error.response?.statusText,
					url: error.config?.url,
					headers: error.config?.headers,
					suggestion: suggestion
				};

				if (this.continueOnFail()) {
					returnData.push({
						json: errorInfo,
					});
				} else {
					// 创建更详细的错误信息
					const detailedError = new Error(
						`ComfyUI API 错误 (${error.response?.status}): ${error.message}\n` +
						`URL: ${error.config?.url}\n` +
						`建议: ${suggestion}`
					);
					throw detailedError;
				}
			}
		}

		return [returnData];
	}

	/**
	 * 根据错误类型提供解决建议
	 */
	private static getErrorSuggestion(error: any): string {
		const status = error.response?.status;

		switch (status) {
			case 403:
				return '403 Forbidden - 检查以下项目:\n' +
					'1. ComfyUI服务器是否正确启动\n' +
					'2. 服务器URL是否正确 (通常是 http://127.0.0.1:8188)\n' +
					'3. 检查ComfyUI启动参数，确保没有启用访问限制\n' +
					'4. 如果使用了--listen参数，确保允许外部访问\n' +
					'5. 检查防火墙设置';
			case 404:
				return '404 Not Found - API端点不存在，可能的原因:\n' +
					'1. ComfyUI版本过旧，不支持此API\n' +
					'2. URL路径错误\n' +
					'3. 服务器配置问题';
			case 500:
				return '500 Internal Server Error - ComfyUI服务器内部错误:\n' +
					'1. 检查ComfyUI服务器日志\n' +
					'2. 重启ComfyUI服务器\n' +
					'3. 检查服务器资源使用情况';
			case undefined:
				if (error.code === 'ECONNREFUSED') {
					return '连接被拒绝 - ComfyUI服务器未运行或无法访问:\n' +
						'1. 确保ComfyUI服务器正在运行\n' +
						'2. 检查服务器地址和端口是否正确\n' +
						'3. 检查网络连接';
				}
				if (error.code === 'ETIMEDOUT') {
					return '请求超时 - 服务器响应缓慢:\n' +
						'1. 检查网络连接\n' +
						'2. 增加超时时间\n' +
						'3. 检查服务器负载';
				}
				return `网络错误 (${error.code}): ${error.message}`;
			default:
				return `HTTP ${status} 错误: ${error.response?.statusText || error.message}`;
		}
	}
}