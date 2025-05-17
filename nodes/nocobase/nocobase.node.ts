import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
	INodeListSearchResult,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from './query';

class NocoBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NocoBase',
		name: 'nocobase',
		icon: 'file:nocobase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + (($parameter["operation"] === "list" || $parameter["operation"] === "get" || $parameter["operation"] === "create" || $parameter["operation"] === "update" || $parameter["operation"] === "delete" || $parameter["operation"] === "move" || $parameter["operation"] === "uploadFile") ? ": " + $parameter["collectionName"] : "") + ($parameter["operation"] === "executeWorkflow" ? ": " + $parameter["workflowId"] : "")}}',
		description: 'Interact with NocoBase API (Collections, App Info, Users, File Uploads, Workflows)',
		defaults: {
			name: 'NocoBase',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'nocobaseApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Authorization: '={{$credentials.token}}',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Server Info',
						value: 'getServerInfo',
						description: 'Get general information about the NocoBase server/application',
						action: 'Get server info',
					},
					{
						name: 'List Collections',
						value: 'listCustom',
						description: 'Get a list of user-defined collections (tables)',
						action: 'Get a list of custom collections',
					},
					{
						name: 'List Users',
						value: 'listUsers',
						description: 'Get a list of users',
						action: 'Get a list of users',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload a file to a NocoBase file collection',
						action: 'Upload a file',
					},
					{
						name: 'List Workflows',
						value: 'listWorkflows',
						description: 'Get a list of workflows',
						action: 'Get a list of workflows',
					},
					{
						name: 'Execute Workflow',
						value: 'executeWorkflow',
						description: 'Execute a NocoBase workflow',
						action: 'Execute a workflow',
					},
					{
						name: 'List (Collection Records)',
						value: 'list',
						description: 'Get a list of records from a collection',
						action: 'Get a list of records',
					},
					{
						name: 'Get (Collection Record)',
						value: 'get',
						description: 'Get a single record from a collection',
						action: 'Get a single record',
					},
					{
						name: 'Create (Collection Record)',
						value: 'create',
						description: 'Create a new record in a collection',
						action: 'Create a new record',
					},
					{
						name: 'Update (Collection Record)',
						value: 'update',
						description: 'Update a record in a collection',
						action: 'Update a record',
					},
					{
						name: 'Delete (Collection Record)',
						value: 'delete',
						description: 'Delete a record from a collection',
						action: 'Delete a record',
					},
					{
						name: 'Move (Collection Record)',
						value: 'move',
						description: 'Move/reorder a record in a collection',
						action: 'Move a record',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Collection ID',
				name: 'collectionName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						operation: ['list', 'get', 'create', 'update', 'delete', 'move', 'uploadFile', 'executeWorkflow'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'listCollections',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9_]+',
									errorMessage: 'Collection ID can only contain letters, numbers and underscores',
								},
							},
						],
					},
				],
				description: 'ID of the NocoBase collection. For Execute Workflow, this is the optional context collection.',
			},
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
						uploadMethod: ['binary'],
					},
				},
				default: 'data',
				description: 'Name of the binary property in the input item that contains the file data to upload.',
			},
			{
				displayName: 'Upload Method',
				name: 'uploadMethod',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				options: [
					{
						name: 'Binary Data',
						value: 'binary',
						description: 'Upload file from binary data',
					},
					{
						name: 'File Path',
						value: 'filepath',
						description: 'Upload file from local path',
					},
				],
				default: 'binary',
				description: 'Method to upload the file',
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
						uploadMethod: ['filepath'],
					},
				},
				default: '',
				description: 'Path to the file you want to upload',
			},
			{
				displayName: 'Uploaded File Name (Optional)',
				name: 'uploadFileName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				default: '',
				description: 'Optional. Filename to use on the server. If empty, uses filename from binary data or a default.',
			},
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
					},
				},
				default: '',
				description: 'ID of the record to operate on.',
			},
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'resourceLocator',
				required: true,
				displayOptions: {
					show: {
						operation: ['executeWorkflow'],
					},
				},
				default: { mode: 'list', value: '' },
				description: 'Select or enter the ID of the workflow to execute. The list shows enabled workflows only.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'listWorkflows',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Context Record ID (Optional)',
				name: 'contextRecordId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['executeWorkflow'],
					},
				},
				default: '',
				description: 'Optional. Enter the ID of the record from the context collection.',
			},
			{
				displayName: 'Data (JSON)',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['create', 'update', 'uploadFile', 'executeWorkflow'],
					},
				},
				default: '{}',
				description: 'Data for creating/updating a record, providing metadata for file uploads, or input for executing a workflow.',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'collection',
				placeholder: 'Add Parameter',
				default: {},
				displayOptions: {
					show: {
						operation: ['list', 'get', 'listCustom', 'listUsers', 'listWorkflows'],
					},
				},
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'json',
						default: '{}',
						description: 'Filter conditions',
					},
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: 'Fields to select (comma-separated)',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'string',
						default: '',
						description: 'Sort fields (comma-separated, prefix with - for descending)',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description: 'Page number',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 20,
						description: 'Number of records per page',
					},
				],
			},
			{
				displayName: 'Source Record ID',
				name: 'sourceRecordId',
				type: 'string',
				required: true, 
				displayOptions: {
					show: {
						operation: ['move'],
					},
				},
				default: '',
				description: 'ID of the record to move',
			},
			{
				displayName: 'Target Record ID',
				name: 'targetRecordId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['move'],
					},
				},
				default: '',
				description: 'ID of the target record for insertAfter or insertBefore methods',
			},
			{
				displayName: 'Move Method',
				name: 'moveMethod',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['move'],
					},
				},
				options: [
					{ name: 'Insert After Target', value: 'insertAfter' },
					{ name: 'Insert Before Target', value: 'insertBefore' },
				],
				default: 'insertAfter',
				description: 'Method to use for moving the record in relation to the target',
			},
			{
				displayName: 'Sort Field Name',
				name: 'sortFieldName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['move'],
					},
				},
				default: 'sort',
				description: 'Name of the sort field (default: sort)',
			},
			{
				displayName: 'Target Scope (JSON String)',
				name: 'targetScopeJson',
				type: 'string',
				typeOptions: { rows: 2 },
				displayOptions: {
					show: {
						operation: ['move'],
					},
				},
				default: '',
				description: 'JSON string defining the target scope, e.g., \'{\\"parent_id\\": 1}\'',
			},
			{
				displayName: 'Sticky to Top',
				name: 'stickyToTop',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['move'],
					},
				},
				default: false,
				description: 'Whether to stick the record to the top',
			},
		],
	};

	methods = {
		listSearch: {
			async listCollections(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('nocobaseApi');
				const baseUrl = credentials.baseUrl as string;
				const token = credentials.token as string;

				const requestOptions: IHttpRequestOptions = {
					method: 'GET',
					url: `${baseUrl}/api/collections:list`,
					headers: {
						'Authorization': `Bearer ${token}`,
						'Accept': 'application/json',
					},
				};

				try {
					const rawResponse = await this.helpers.request(requestOptions);

					let parsedResponse: any;
					if (typeof rawResponse === 'string') {
						try {
							parsedResponse = JSON.parse(rawResponse);
						} catch (e) {
							// If parsing fails, log an error and return empty results to prevent UI break
							this.logger.error(`[NocoBase Node] listCollections: Failed to parse string response: ${ (e as Error).message }`, { rawResponse });
							return { results: [] };
						}
					} else {
						parsedResponse = rawResponse;
					}

					let collectionsSource = Array.isArray(parsedResponse) ? parsedResponse : (parsedResponse.data || []);

					if (!Array.isArray(collectionsSource)) {
						this.logger.error('[NocoBase Node] listCollections: "collectionsSource" is not an array after parsing.', { parsedResponse });
						return { results: [] };
					}

					const filteredCollections = collectionsSource.filter((collection: any) => {
						const origin = collection.origin;
						const autoCreate = collection.autoCreate;
						// Keep if origin is not set (undefined, null, or empty string)
						// AND autoCreate is not true (undefined, null, or false)
						return (origin === undefined || origin === null || origin === '') &&
						       (autoCreate === undefined || autoCreate === null || autoCreate === false);
					});
					
					const results = filteredCollections.map((collection: any) => {
						if (!collection || typeof collection.name === 'undefined') {
							// This case should ideally be rare after filtering, but good to keep
							this.logger.warn('[NocoBase Node] listCollections: Skipping collection with missing name after filtering.', { collection });
							return null;
						}
						return {
							name: collection.title || collection.name,
							value: collection.name,
							url: `${baseUrl}/api/${collection.name}`,
						};
					}).filter(result => result !== null) as INodeListSearchResult['results'];

					return { results };

				} catch (error) {
					this.logger.error(`[NocoBase Node] listCollections: Error fetching or processing collections: ${ (error as Error).message }`, { error });
					return { results: [] };
				}
			},
			async listWorkflows(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('nocobaseApi');
				const baseUrl = credentials.baseUrl as string;
				const token = credentials.token as string;

				const requestOptions: IHttpRequestOptions = {
					method: 'GET',
					url: `${baseUrl}/api/workflows:list`,
					headers: {
						'Authorization': `Bearer ${token}`,
						'Accept': 'application/json',
					},
				};

				try {
					const rawOutputFromHelper = await this.helpers.request(requestOptions);
					this.logger.info('[NocoBase Node] listWorkflows: Received output from this.helpers.request.', { rawOutputFromHelper: JSON.stringify(rawOutputFromHelper) });

					let jsonData: any;

					if (rawOutputFromHelper && typeof rawOutputFromHelper === 'object' && typeof rawOutputFromHelper.response === 'string') {
						this.logger.info('[NocoBase Node] listWorkflows: Path A - Detected rawOutputFromHelper.response as string.');
						try {
							jsonData = JSON.parse(rawOutputFromHelper.response);
							this.logger.info('[NocoBase Node] listWorkflows: Path A - Successfully parsed rawOutputFromHelper.response.', { jsonData: JSON.stringify(jsonData) });
						} catch (e) {
							this.logger.error('[NocoBase Node] listWorkflows: Path A - Failed to parse JSON from rawOutputFromHelper.response.', { error: (e as Error).message, responseString: rawOutputFromHelper.response });
							return { results: [] };
						}
					} else if (rawOutputFromHelper && typeof rawOutputFromHelper === 'object' && rawOutputFromHelper.data && Array.isArray(rawOutputFromHelper.data)) {
						this.logger.info('[NocoBase Node] listWorkflows: Path B - Detected rawOutputFromHelper.data as an array. Using rawOutputFromHelper as jsonData.');
						jsonData = rawOutputFromHelper;
					} else if (typeof rawOutputFromHelper === 'string') {
						 this.logger.info('[NocoBase Node] listWorkflows: Path C - Detected rawOutputFromHelper as a direct string.');
						 try {
							jsonData = JSON.parse(rawOutputFromHelper);
							this.logger.info('[NocoBase Node] listWorkflows: Path C - Successfully parsed direct string rawOutputFromHelper.', { jsonData: JSON.stringify(jsonData) });
						 } catch (e) {
							this.logger.error('[NocoBase Node] listWorkflows: Path C - Failed to parse direct string rawOutputFromHelper.', { error: (e as Error).message, rawOutputFromHelper });
							return { results: [] };
						 }
					}
					else {
						this.logger.error('[NocoBase Node] listWorkflows: Path D - Unexpected structure from this.helpers.request. Cannot determine JSON data path.', { rawOutputFromHelper: JSON.stringify(rawOutputFromHelper) });
						return { results: [] };
					}

					let workflowsSource = [];
					if (jsonData && typeof jsonData === 'object' && jsonData.data && Array.isArray(jsonData.data)) {
						workflowsSource = jsonData.data;
						this.logger.info('[NocoBase Node] listWorkflows: Extracted workflowsSource from jsonData.data.', { count: workflowsSource.length });
					} else {
						this.logger.error('[NocoBase Node] listWorkflows: jsonData does not contain a .data array or is not structured as expected.', { jsonData: JSON.stringify(jsonData) });
						return { results: [] };
					}

					const filteredWorkflows = workflowsSource.filter((wf: any) => {
					  this.logger.info(`[NocoBase Node] listWorkflows: Filtering workflow: ID=${wf.id}, Title='${wf.title}', Enabled=${wf.enabled} (Type: ${typeof wf.enabled})`);
					  return wf.enabled === true;
					});
					this.logger.info(`[NocoBase Node] listWorkflows: Found ${filteredWorkflows.length} enabled workflows after filtering.`);

					const results = filteredWorkflows.map((wf: any) => {
						const name = wf.title || wf.name || wf.label || `Workflow ID: ${wf.id || wf.key || JSON.stringify(wf)}`;
						const value = wf.id;

						if (typeof value === 'undefined') {
							this.logger.warn('[NocoBase Node] listWorkflows: Skipping workflow due to undefined value (id). ', { workflow: JSON.stringify(wf) });
							return null;
						}
						return {
							name: String(name),
							value: String(value),
						};
					}).filter((result: { name: string; value: string } | null) => result !== null) as INodeListSearchResult['results'];
					this.logger.info(`[NocoBase Node] listWorkflows: Mapped to ${results.length} results for UI.`, { results: JSON.stringify(results) });

					return { results };
				} catch (error) {
					if (!(error instanceof NodeOperationError)) {
						 this.logger.error(`[NocoBase Node] listWorkflows: Unhandled error in listWorkflows: ${ (error as Error).message }`, { errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
					}
					return { results: [] };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('nocobaseApi');
		const baseUrl = credentials.baseUrl as string;
		const token = credentials.token as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				this.logger.info(`Executing NocoBase operation: ${operation}`);

				let collectionName: string | undefined;
				if (operation === 'uploadFile' || (operation !== 'listCustom' && operation !== 'getServerInfo' && operation !== 'listUsers' && operation !== 'listWorkflows' && operation !== 'executeWorkflow')) {
					const collectionNameValue = this.getNodeParameter('collectionName', i) as { mode: string; value: string };
					collectionName = collectionNameValue.value;
				}

				let recordIdValue: string | undefined = undefined;
				let dataValue: object | undefined = undefined;
				let moveParamsValue: NocoBaseRequestOptions['moveOperationParams'] | undefined = undefined;
				let binaryPropertyNameValue: string | undefined = undefined;
				let uploadFileNameValue: string | undefined = undefined;
				let binaryDataValue: NocoBaseRequestOptions['binaryData'] | undefined = undefined;
				let workflowIdValue: string | undefined = undefined;

				if (operation === 'get' || operation === 'update' || operation === 'delete') {
					recordIdValue = this.getNodeParameter('recordId', i, '') as string;
					if (recordIdValue === '') recordIdValue = undefined;
				}
				if (operation === 'executeWorkflow') {
					const workflowIdParam = this.getNodeParameter('workflowId', i) as { value: string } | string;
					if (typeof workflowIdParam === 'object' && workflowIdParam.value) {
						workflowIdValue = workflowIdParam.value;
					} else if (typeof workflowIdParam === 'string') {
						workflowIdValue = workflowIdParam;
					}
					if (workflowIdValue === '' || workflowIdValue === undefined) {
						throw new NodeOperationError(this.getNode(), 'Workflow ID is required for executeWorkflow operation.', { itemIndex: i });
					}
				}
				if (operation === 'create' || operation === 'update' || operation === 'executeWorkflow' ) {
					let rawDataString = this.getNodeParameter('data', i, '{}') as string;
					try {
						dataValue = JSON.parse(rawDataString);
					} catch (e) {
						throw new NodeOperationError(this.getNode(), `Invalid JSON in Data field: ${(e as Error).message}`, { itemIndex: i });
					}
					
					if (operation === 'executeWorkflow') {
						// Use 'collectionName' for context collection if provided for executeWorkflow
						const contextCollectionParam = this.getNodeParameter('collectionName', i, '') as { value: string } | string;
						const contextRecordIdParam = this.getNodeParameter('contextRecordId', i, '') as string;

						let actualContextCollectionName: string | undefined;
						if (typeof contextCollectionParam === 'object' && contextCollectionParam.value && contextCollectionParam.value.trim() !== '') {
							actualContextCollectionName = contextCollectionParam.value.trim();
						} else if (typeof contextCollectionParam === 'string' && contextCollectionParam.trim() !== '') {
							actualContextCollectionName = contextCollectionParam.trim();
						}

						const actualContextRecordId = typeof contextRecordIdParam === 'string' && contextRecordIdParam.trim() !== '' ? contextRecordIdParam.trim() : undefined;

						// Only add triggerContext if at least one of collection or recordId is provided
						if (actualContextCollectionName || actualContextRecordId) {
							if (typeof dataValue !== 'object' || dataValue === null) dataValue = {}; // Ensure dataValue is an object
							
							const triggerContext: { collection?: string; recordId?: string } = {};
							if (actualContextCollectionName) {
								triggerContext.collection = actualContextCollectionName;
							}
							if (actualContextRecordId) {
								triggerContext.recordId = actualContextRecordId;
							}
							(dataValue as any).triggerContext = triggerContext;

							if (actualContextCollectionName && !actualContextRecordId) {
								this.logger.warn('Context Collection Name was provided for workflow trigger, but Context Record ID is missing. The workflow might require both.', { itemIndex: i });
							} else if (!actualContextCollectionName && actualContextRecordId) {
								this.logger.warn('Context Record ID was provided for workflow trigger, but Context Collection Name is missing. The workflow might require both.', { itemIndex: i });
							}
						}

					} else { // For 'create' or 'update' (not 'executeWorkflow')
						if (Object.keys(dataValue as object).length === 0) {
							dataValue = undefined;
						}
					}
				} else if (operation === 'move') {
					moveParamsValue = {
						sourceRecordId: this.getNodeParameter('sourceRecordId', i, '') as string,
						targetRecordId: this.getNodeParameter('targetRecordId', i, '') as string,
						moveMethod: this.getNodeParameter('moveMethod', i, 'insertAfter') as string,
						sortFieldName: this.getNodeParameter('sortFieldName', i, 'sort') as string,
						targetScopeJson: this.getNodeParameter('targetScopeJson', i, '') as string,
						stickyToTop: this.getNodeParameter('stickyToTop', i, false) as boolean,
					};
				} else if (operation === 'uploadFile') {
					const uploadMethod = this.getNodeParameter('uploadMethod', i, 'binary') as string;
					
					if (uploadMethod === 'binary') {
						binaryPropertyNameValue = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
						
						if (!items[i].binary || !items[i].binary![binaryPropertyNameValue]) {
							throw new NodeOperationError(this.getNode(), `No binary data found in input property '${binaryPropertyNameValue}' for item ${i}.`, { itemIndex: i });
						}
						binaryDataValue = items[i].binary![binaryPropertyNameValue];
					} else if (uploadMethod === 'filepath') {
						const filePath = this.getNodeParameter('filePath', i) as string;
						if (!filePath) {
							throw new NodeOperationError(this.getNode(), 'File path is required when using filepath upload method.');
						}
					}
					
					uploadFileNameValue = this.getNodeParameter('uploadFileName', i, '') as string;
					if (uploadFileNameValue === '') uploadFileNameValue = undefined;
				}

				const apiOptions: NocoBaseRequestOptions = {
					node: this,
					baseUrl,
					token,
					resource: 'collection',
					collectionName: collectionName, 
					collectionOperation: operation,
					recordId: operation === 'executeWorkflow' ? workflowIdValue : recordIdValue,
					data: dataValue,
					queryParameters: this.getNodeParameter('queryParameters', i, {}) as Record<string, any>,
					moveOperationParams: moveParamsValue,
					binaryPropertyName: binaryPropertyNameValue,
					uploadFileName: uploadFileNameValue,
					binaryData: binaryDataValue,
					uploadMethod: operation === 'uploadFile' ? this.getNodeParameter('uploadMethod', i, 'binary') as 'binary' | 'filepath' : undefined,
					filePath: operation === 'uploadFile' && this.getNodeParameter('uploadMethod', i) === 'filepath' ? this.getNodeParameter('filePath', i) as string : undefined,
				};

				const responseData = await executeNocoBaseApi(apiOptions);

				returnData.push({
					json: responseData,
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}
		return [returnData];
	}
}

export { NocoBase as nocobase };

