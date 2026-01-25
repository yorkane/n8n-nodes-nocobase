import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodeListSearchResult,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { CollectionData, WorkflowData } from './query';

// New imports for handlers
import { handleCollectionRecordOperation } from './operations/collectionRecordHandlers';
import { handleFileUploadOperation } from './operations/fileUploadHandler';
import { handleExecuteWorkflowOperation } from './operations/workflowHandlers';
import { handleGetServerInfo, handleListCustomCollections, handleListUsers, handleListWorkflows } from './operations/otherHandlers';
import { handleBulkCreateOperation } from './operations/bulkOperationHandlers';

class NocoBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NocoBase',
		name: 'nocobase',
		icon: 'file:nocobase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + (($parameter["operation"] === "list" || $parameter["operation"] === "get" || $parameter["operation"] === "create" || $parameter["operation"] === "update" || $parameter["operation"] === "delete" || $parameter["operation"] === "move" || $parameter["operation"] === "select" || $parameter["operation"] === "uploadFile" || $parameter["operation"] === "bulkCreate") ? ": " + $parameter["collectionName"] : "") + ($parameter["operation"] === "executeWorkflow" ? ": " + $parameter["workflowId"] : "")}}',
		description: 'Interact with NocoBase API (Collections, App Info, Users, File Uploads, Workflows)',
		usableAsTool: true,
		defaults: {
			name: 'NocoBase',
		},
		inputs: ['main'],
		outputs: ['main'],
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
						name: 'Search Record',
						value: 'select',
						description: 'Select a record from a collection with search support',
						action: 'Select a record',
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
						name: 'Bulk Create (Collection Records)',
						value: 'bulkCreate',
						description: 'Create multiple records in a collection in one operation',
						action: 'Bulk create records',
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
				default: 'select',
			},
			{
				displayName: 'Collection ID',
				name: 'collectionName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						operation: ['list', 'get', 'create', 'update', 'delete', 'move', 'select', 'uploadFile', 'executeWorkflow', 'bulkCreate'],
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
				noDataExpression: false,
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
					{
						name: 'Base64 Encoded String',
						value: 'base64',
						description: 'Upload file from Base64 encoded string',
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
				displayName: 'Base64 Content',
				name: 'base64Content',
				type: 'string',
				typeOptions: {
					multiline: true, // For better UX with long base64 strings
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
						uploadMethod: ['base64'],
					},
				},
				default: '',
				description: 'Base64 encoded string of the file to upload',
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
				displayName: 'Bulk Data (JSON Array)',
				name: 'bulkData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['bulkCreate'],
					},
				},
				default: '[]',
				placeholder: '[{"name": "Record 1", "status": "active"}, {"name": "Record 2", "status": "pending"}]',
				description: 'Array of record objects to create. Each object should contain the fields for one record. AI Agents can pass this as an array directly without stringification.',
			},
			{
				displayName: 'Continue on Failure',
				name: 'bulkContinueOnFailure',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['bulkCreate'],
					},
				},
				default: true,
				description: 'Whether to continue creating remaining records if one fails. If disabled, the operation stops at the first error.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				placeholder: 'id,field1,field2',
				displayOptions: {
					show: {
						operation: ['list', 'get'],
					},
				},
				description: 'Fields to select (comma-separated)',
			},
			{
				displayName: 'Appends',
				name: 'appends',
				type: 'string',
				default: '',
				placeholder: 'ref_obj_id_fk1,ref_obj_id_fk2',
				displayOptions: {
					show: {
						operation: ['list', 'get', 'select'],
					},
				},
				description: 'Appended association fields (comma-separated), e.g. posts, tags',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				default: '',
				placeholder: '-id,-field2, name,-createdTime',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				description: 'Sort fields (comma-separated, `field` asc defualt, `-field` to descending)',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				description: 'Page number',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 20,
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				description: 'Number of records per page',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'json',
				default: '{}',
				placeholder: '{"$and":[{"status":{"$in":["active","pending"]}},\\n{"price":{"$gt":100}}]}',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				description: 'eg: {"$and":[{"status":{"$in":["active","pending"]}},\\n{"price":{"$gt":100}}]} ... $eq, $ne, $gte, $gt, $lte, $lt, $not, $is, $in, $notIn, $like, $notLike, $iLike, $notILike, $and, $or, $empty, $notEmpty, $includes, $notIncludes, $startsWith, $notStartsWith, $endWith, $notEndWith, $dateOn, $dateNotOn, $dateBefore, $dateNotBefore, $dateAfter, $dateNotAfter https://docs-cn.nocobase.com/development/http-api/filter-operators',
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
				noDataExpression: false,
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
			{
				displayName: 'Search Field',
				name: 'searchField',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
				default: 'name',
				description: 'Field name to use for searching records in the dropdown (e.g., name, title, email)',
			},
			{
				displayName: 'Select Record ID',
				name: 'selectedRecordId',
				type: 'resourceLocator',
				required: true,
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
				default: { mode: 'list', value: '' },
				description: 'Select a record from the collection. Use the dropdown search to filter records by the selected search field.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'listRecords',
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
							this.logger.error(`[NocoBase Node] listCollections: Failed to parse string response: ${(e as Error).message}`, { rawResponse });
							return { results: [] };
						}
					} else {
						parsedResponse = rawResponse;
					}

					const collectionsSource = Array.isArray(parsedResponse) ? parsedResponse : (parsedResponse.data || []);

					if (!Array.isArray(collectionsSource)) {
						this.logger.error('[NocoBase Node] listCollections: "collectionsSource" is not an array after parsing.', { parsedResponse });
						return { results: [] };
					}

					const filteredCollections = collectionsSource.filter((collection: CollectionData) => {
						const origin = collection.origin;
						const autoCreate = collection.autoCreate;
						return (origin === undefined || origin === null || origin === '') &&
							(autoCreate === undefined || autoCreate === null || autoCreate === false);
					});

					const results = filteredCollections.map((collection: CollectionData) => {
						if (!collection || typeof collection.name === 'undefined') {
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
					this.logger.error(`[NocoBase Node] listCollections: Error fetching or processing collections: ${(error as Error).message}`, { error });
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
					let jsonData: any;
					if (rawOutputFromHelper && typeof rawOutputFromHelper === 'object' && typeof rawOutputFromHelper.response === 'string') {
						try {
							jsonData = JSON.parse(rawOutputFromHelper.response);
							this.logger.info('[NocoBase Node] listWorkflows: Path A - Successfully parsed rawOutputFromHelper.response.', { jsonData: JSON.stringify(jsonData) });
						} catch (e) {
							this.logger.error('[NocoBase Node] listWorkflows: Path A - Failed to parse JSON from rawOutputFromHelper.response.', { error: (e as Error).message, responseString: rawOutputFromHelper.response });
							return { results: [] };
						}
					} else if (rawOutputFromHelper && typeof rawOutputFromHelper === 'object' && rawOutputFromHelper.data && Array.isArray(rawOutputFromHelper.data)) {
						jsonData = rawOutputFromHelper;
					} else if (typeof rawOutputFromHelper === 'string') {
						try {
							jsonData = JSON.parse(rawOutputFromHelper);
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
					} else {
						this.logger.error('[NocoBase Node] listWorkflows: jsonData does not contain a .data array or is not structured as expected.', { jsonData: JSON.stringify(jsonData) });
						return { results: [] };
					}
					const filteredWorkflows = workflowsSource.filter((wf: WorkflowData) => {
						return wf.enabled === true;
					});
					const results = filteredWorkflows.map((wf: WorkflowData) => {
						const name = wf.title || wf.name || wf.label || `Workflow ID: ${wf.id || wf.key || JSON.stringify(wf)}`;
						const value = wf.id;

						if (typeof value === 'undefined') {
							return null;
						}
						return {
							name: String(name),
							value: String(value),
						};
					}).filter((result: { name: string; value: string } | null) => result !== null) as INodeListSearchResult['results'];

					return { results };
				} catch (error) {
					if (!(error instanceof NodeOperationError)) {
						this.logger.error(`[NocoBase Node] listWorkflows: Unhandled error in listWorkflows: ${(error as Error).message}`, { errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
					}
					return { results: [] };
				}
			},
			async listRecords(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('nocobaseApi');
				const baseUrl = credentials.baseUrl as string;
				const token = credentials.token as string;

				// Get the current node's parameters to access collection name and search settings
				const collectionName = this.getNodeParameter('collectionName') as { mode: string; value: string };
				if (!collectionName || !collectionName.value) {
					this.logger.error('[NocoBase Node] listRecords: Collection name is required.');
					return { results: [] };
				}

				// Get search field
				const searchField = this.getNodeParameter('searchField') as string ?? 'name';

				const allRecords: any[] = [];
				let page = 1;
				const pageSize = 20;
				const maxRecords = 100; // Maximum records to fetch
				let hasMore = true;

				// Fetch records until we have enough matches or reach maxRecords
				while (hasMore && allRecords.length < maxRecords) {
					const queryParams: Record<string, any> = {
						page: page,
						pageSize: pageSize,
						sort: '-createdAt',
					};

					const requestOptions: IHttpRequestOptions = {
						method: 'GET',
						url: `${baseUrl}/api/${collectionName.value}:list`,
						headers: {
							'Authorization': `Bearer ${token}`,
							'Accept': 'application/json',
						},
						qs: queryParams,
						json: true,
					};

					try {
						const response = await this.helpers.request(requestOptions);
						let pageRecords: any[] = [];

						// Handle different response formats
						if (Array.isArray(response)) {
							pageRecords = response;
						} else if (response && typeof response === 'object') {
							if (Array.isArray(response.data)) {
								pageRecords = response.data;
							} else if (Array.isArray(response.results)) {
								pageRecords = response.results;
							}
						}

						// No more records
						if (pageRecords.length === 0) {
							hasMore = false;
							break;
						}

						allRecords.push(...pageRecords);
						page++;

						// Stop if we've fetched enough pages
						if (allRecords.length >= maxRecords) {
							break;
						}

					} catch (error) {
						this.logger.error(`[NocoBase Node] listRecords: Error fetching page ${page}: ${(error as Error).message}`);
						break;
					}
				}

				let records = allRecords;

				// Client-side filtering
				if (filter && filter.trim() !== '' && records.length > 0) {
					const filterLower = filter.toLowerCase();
					this.logger.info(`[NocoBase Node] listRecords: Client-side filtering field='${searchField}', value='${filter}', total records=${records.length}`);
					records = records.filter((record: any) => {
						const fieldValue = record[searchField];
						if (fieldValue !== null && fieldValue !== undefined) {
							return String(fieldValue).toLowerCase().includes(filterLower);
						}
						return false;
					});
					this.logger.info(`[NocoBase Node] listRecords: Filtered to ${records.length} records`);
				}

				// Limit to first 10 records
				records = records.slice(0, 10);

				const results = records.map((record: any) => {
					if (!record || typeof record !== 'object') {
						return null;
					}

					// Try to get a display name from various fields
					let displayName = `Record ${record.id || ''}`;

					// Priority: title > name > searchField > id
					if (record.title) {
						displayName = `${record.title} (ID: ${record.id})`;
					} else if (record.name) {
						displayName = `${record.name} (ID: ${record.id})`;
					} else if (record[searchField]) {
						displayName = `${record[searchField]} (ID: ${record.id})`;
					}

					return {
						name: displayName,
						value: String(record.id),
					};
				}).filter((result): result is { name: string; value: string } => result !== null);

				return { results };

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
				this.logger.info(`[NocoBase Node] Executing operation: ${operation} for item ${i}`);

				let responseData: any;

				// Collection Record Operations
				if (['list', 'get', 'create', 'update', 'delete', 'move', 'select'].includes(operation)) {
					const collectionNameValue = this.getNodeParameter('collectionName', i) as { mode: string; value: string };
					const collectionName = collectionNameValue.value;
					if (!collectionName) {
						throw new NodeOperationError(this.getNode(), `Collection ID is required for operation '${operation}'.`, { itemIndex: i });
					}
					responseData = await handleCollectionRecordOperation.call(this, i, operation, baseUrl, token, collectionName);
				}
				// Bulk Create Operation
				else if (operation === 'bulkCreate') {
					const collectionNameValue = this.getNodeParameter('collectionName', i) as { mode: string; value: string };
					const collectionName = collectionNameValue.value;
					if (!collectionName) {
						throw new NodeOperationError(this.getNode(), `Collection ID is required for operation '${operation}'.`, { itemIndex: i });
					}
					responseData = await handleBulkCreateOperation.call(this, i, baseUrl, token, collectionName);
				}
				// File Upload Operation
				else if (operation === 'uploadFile') {
					responseData = await handleFileUploadOperation.call(this, i, baseUrl, token, items[i]);
				}
				// Workflow Execution Operation
				else if (operation === 'executeWorkflow') {
					responseData = await handleExecuteWorkflowOperation.call(this, i, baseUrl, token);
				}
				// Other specific operations
				else if (operation === 'getServerInfo') {
					responseData = await handleGetServerInfo.call(this, baseUrl, token);
				}
				else if (operation === 'listCustom') { // list all collections
					responseData = await handleListCustomCollections.call(this, baseUrl, token);
				}
				else if (operation === 'listUsers') {
					responseData = await handleListUsers.call(this, baseUrl, token);
				}
				else if (operation === 'listWorkflows') { // Added handler for listWorkflows
					responseData = await handleListWorkflows.call(this, baseUrl, token);
				}
				// Fallback or error for unknown operations
				else {
					throw new NodeOperationError(this.getNode(), `The operation '${operation}' is not supported or implemented yet.`, { itemIndex: i });
				}
				// Ensure responseData is an object
				let finalJsonData = responseData;
				if (typeof responseData === 'string') {
					try {
						finalJsonData = JSON.parse(responseData);
					} catch (parseError) {
						// Log the error and throw a new NodeOperationError, as the response is not as expected.
						this.logger.error(`[NocoBase Node] Failed to parse JSON string response for operation '${operation}'. Raw string: "${responseData}". Error: ${(parseError as Error).message}`, { itemIndex: i });
						throw new NodeOperationError(this.getNode(), `Received a string response that could not be parsed as JSON for operation '${operation}': ${(parseError as Error).message}`, { itemIndex: i });
					}
				}
				returnData.push({ json: finalJsonData });

			} catch (error) {
				const errorMessage = (error instanceof Error) ? error.message : String(error);
				this.logger.error(`[NocoBase Node] Error during operation for item ${i}: ${errorMessage}`, { errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)), itemIndex: i });
				if (this.continueOnFail()) {
					returnData.push({ json: { error: errorMessage } });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [returnData];
	}
}

export { NocoBase as nocobase };

