import {
	IHttpRequestMethods,
	IHttpRequestOptions,
	IExecuteFunctions, // To access helpers.request
	NodeOperationError,
	IBinaryData, // Added IBinaryData
} from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

export interface NocoBaseRequestOptions {
	baseUrl: string;
	token: string;
	node: IExecuteFunctions; 
	resource: 'collection'; // Hardcoded to 'collection'
	// For Collection resource
	collectionName?: string; // Optional: not used for listCustom
	collectionOperation: string; // Renamed from operation for clarity inside node
	recordId?: string;
	data?: object;
	queryParameters?: Record<string, any>;
	moveOperationParams?: {
		sourceRecordId: string;
		targetRecordId: string;
		moveMethod: string;
		sortFieldName: string;
		targetScopeJson: string;
		stickyToTop: boolean;
	};
	// File Upload specific properties
	binaryPropertyName?: string;
	uploadFileName?: string;
	binaryData?: IBinaryData; 
	uploadMethod?: 'binary' | 'filepath';
	filePath?: string;
	// Association related properties are removed
	// workflowId is not explicitly added here, we will use recordId for workflowId in executeWorkflow.
}

export async function executeNocoBaseApi(options: NocoBaseRequestOptions): Promise<any> {
	const { 
		node, 
		baseUrl, 
		token, 
		collectionName, 
		collectionOperation, 
		recordId, 
		data, 
		queryParameters: rawCollectionQueryParams, 
		moveOperationParams
		// binaryPropertyName, uploadFileName, and binaryData are intentionally not destructured here
		// as they are used conditionally as options.binaryPropertyName, options.uploadFileName, options.binaryData
	} = options;

	let endpoint = '';
	let method: IHttpRequestMethods = 'GET';
	let body: any = {};
	let queryParams: Record<string, any> = {};

	// No longer need to check options.resource as it's always 'collection'
	if (!collectionOperation) { 
		throw new NodeOperationError(node.getNode(), 'Collection operation is required.');
	}

	// Endpoint construction logic based on operation type
	if (collectionOperation === 'getServerInfo') {
		endpoint = `${baseUrl}/api/app:getInfo`;
		method = 'GET'; 
	} else if (collectionOperation === 'listCustom') {
		endpoint = `${baseUrl}/api/collections:list`; 
		method = 'GET';
	} else if (collectionOperation === 'listUsers') {
		endpoint = `${baseUrl}/api/users:list`;
		method = 'GET';
	} else if (collectionOperation === 'uploadFile') {
		if (!collectionName) {
			throw new NodeOperationError(node.getNode(), 'File Collection name is required for uploadFile operation.');
		}
		endpoint = `${baseUrl}/api/${collectionName}:create`;
		method = 'POST';
	} else if (collectionOperation === 'listWorkflows') {
		endpoint = `${baseUrl}/api/workflows:list`;
		method = 'GET';
	} else if (collectionOperation === 'executeWorkflow') {
		if (!options.recordId) {
			throw new NodeOperationError(node.getNode(), 'Workflow ID (as recordId) is required for executeWorkflow operation.');
		}

		// Safeguard: Verify the workflow is enabled before triggering
		const verifyWorkflowOptions: IHttpRequestOptions = {
			url: `${baseUrl}/api/workflows:list`,
			method: 'GET',
			headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
			qs: { filter: { id: options.recordId } }, // Assumes NocoBase supports this filter structure for workflows list
			json: true,
		};
		try {
			const verifyResponse = await node.helpers.request(verifyWorkflowOptions);
			let workflowToExecute;
			if (verifyResponse && verifyResponse.data && Array.isArray(verifyResponse.data) && verifyResponse.data.length > 0) {
				workflowToExecute = verifyResponse.data[0];
			} else if (verifyResponse && Array.isArray(verifyResponse) && verifyResponse.length > 0) {
				// Fallback if response is an array directly containing the workflow object matching the filter
				workflowToExecute = verifyResponse[0]; 
			}

			if (!workflowToExecute) {
				throw new NodeOperationError(node.getNode(), `Workflow with ID '${options.recordId}' not found.`);
			}
			if (workflowToExecute.id !== options.recordId && workflowToExecute.key !== options.recordId) {
			    // Additional check if filter might return other items if not precise enough
			    // This depends heavily on how NocoBase filtering works for workflows:list with an ID.
			    // If options.recordId can be numeric or string (key), we should ensure the found item matches.
			    // This simple check assumes id is numeric and options.recordId might be string, or vice-versa for key.
			    // A more robust check might involve type coercion or checking both id and key if possible.
			    let foundMatch = false;
			    if (String(workflowToExecute.id) === String(options.recordId) || workflowToExecute.key === options.recordId) {
			        foundMatch = true;
			    }
			    if (!foundMatch) {
			        throw new NodeOperationError(node.getNode(), `Workflow with ID '${options.recordId}' not found (mismatch after filter).`);
			    }
			}

			if (workflowToExecute.enabled !== true) {
				throw new NodeOperationError(node.getNode(), `Workflow '${workflowToExecute.title || options.recordId}' (ID: ${options.recordId}) is disabled and cannot be triggered.`);
			}
		} catch (error: any) {
			if (error instanceof NodeOperationError) throw error; // Re-throw if already our error type
			throw new NodeOperationError(node.getNode(), `Failed to verify workflow status for ID '${options.recordId}'. Error: ${error.message}`);
		}

		endpoint = `${baseUrl}/api/workflows`; // General endpoint for workflows
		method = 'POST';
	} else {
		// For all other collection-specific operations that require a collectionName
		if (!collectionName) {
			throw new NodeOperationError(node.getNode(), 'Collection name is required for this operation.');
		}
		endpoint = `${baseUrl}/api/${collectionName}`;
		// Specific suffixes like :list, :get, etc., will be added in the switch statement
	}
	
	queryParams = { ...(rawCollectionQueryParams || {}) };

	switch (collectionOperation) {
		case 'getServerInfo':
			queryParams = {}; 
			body = {};
			break;
		case 'listCustom':
			body = {};
			break;
		case 'listUsers':
			// Endpoint and method already set.
			// queryParams (e.g., for filtering, pagination) are passed through.
			body = {};
			break;
		case 'uploadFile':
			// Method and endpoint are already set. Body will be formData.
			// queryParams are typically not used for direct file upload POST to :create
			queryParams = {}; 
			body = {}; // Ensure standard body is empty, formData will be used
			break;
		case 'listWorkflows':
			body = {};
			break;
		case 'executeWorkflow':
			body = data || {};
			// queryParams will be set here, using options.recordId for the specific workflow
			queryParams = { triggerWorkflows: options.recordId }; 
			break;
		case 'list':
			endpoint += ':list';
			break;
		case 'get':
			endpoint += ':get';
			if (recordId) queryParams.filterByTk = recordId;
			break;
		case 'create':
			endpoint += ':create';
			method = 'POST';
			body = data || {};
			break;
		case 'update':
			endpoint += ':update';
			method = 'POST';
			if (recordId) queryParams.filterByTk = recordId;
			body = data || {};
			break;
		case 'delete':
			endpoint += ':destroy';
			method = 'POST';
			if (recordId) queryParams.filterByTk = recordId;
			break;
		case 'move':
			endpoint += ':move';
			method = 'POST';
			if (moveOperationParams) {
				queryParams.sourceId = moveOperationParams.sourceRecordId;
				queryParams.targetId = moveOperationParams.targetRecordId;
				queryParams.method = moveOperationParams.moveMethod;
				queryParams.sortField = moveOperationParams.sortFieldName;
				if (moveOperationParams.targetScopeJson) {
					queryParams.targetScope = moveOperationParams.targetScopeJson;
				}
				queryParams.sticky = moveOperationParams.stickyToTop;
			}
			body = {}; 
			break;
		default:
			throw new NodeOperationError(node.getNode(), `Collection operation '${collectionOperation}' not supported.`);
	}

	const cleanedQs: Record<string, any> = {};
	for (const [key, value] of Object.entries(queryParams)) {
		if (value === '' && (key === 'fields' || key === 'sort' || key === 'appends' || key === 'except' || key === 'targetId')) {
		} else if (value !== undefined) {
			cleanedQs[key] = value;
		}
	}

	const requestOptions: IHttpRequestOptions = {
		method,
		url: endpoint,
		headers: {
			'Authorization': `Bearer ${token}`,
			// Accept header might not be strictly needed for formData upload but doesn't hurt
			// However, for file uploads, we usually expect a JSON response confirming success/failure.
			'Accept': 'application/json', 
		},
		// json: true, // DO NOT use json: true for multipart/form-data
	};

	if (collectionOperation === 'uploadFile') {
		if (!collectionName) {
			throw new NodeOperationError(node.getNode(), 'File Collection name is required for uploadFile operation.');
		}
		endpoint = `${baseUrl}/api/${collectionName}:create`;
		method = 'POST';

		let fileBuffer: Buffer;
		let fileName: string;
		let mimeType: string;

		if (options.uploadMethod === 'filepath' && options.filePath) {
			try {
				fileBuffer = fs.readFileSync(options.filePath);
				fileName = options.uploadFileName || path.basename(options.filePath);
				mimeType = mime.lookup(options.filePath) || 'application/octet-stream';
			} catch (e: any) {
				throw new NodeOperationError(node.getNode(), `Failed to read file from path: ${options.filePath}. Error: ${e.message}`);
			}
		} else if (options.uploadMethod === 'binary' || !options.uploadMethod) {
			// 原有的二进制数据上传逻辑
			if (!options.binaryData) {
				throw new NodeOperationError(node.getNode(), `Binary data object not found for the specified binary property '${options.binaryPropertyName}'. Ensure the upstream node provides data to this property.`);
			}
			// if (!options.binaryData.id) { 
			// 	throw new NodeOperationError(node.getNode(), `The binary data object for property '${options.binaryPropertyName}' is incomplete: it is missing the required 'id' field. Please ensure the upstream node provides a complete n8n binary object structure (IBinaryData).`);
			// }
			if (typeof options.binaryData.data !== 'string' || options.binaryData.data === '') {
				throw new NodeOperationError(node.getNode(), `The binary data object for property '${options.binaryPropertyName}' is missing the actual data content (expected a non-empty base64 string in the '.data' field).`);
			}

			try {
				fileBuffer = Buffer.from(options.binaryData.data, 'base64');
				fileName = options.uploadFileName || options.binaryData.fileName || 'uploaded_file';
				mimeType = options.binaryData.mimeType;
			} catch (e: any) {
				throw new NodeOperationError(node.getNode(), `Failed to decode base64 binary data for upload. Original error: ${e.message}`);
			}
		} else {
			throw new NodeOperationError(node.getNode(), 'Invalid upload method specified.');
		}

		(requestOptions as any).formData = {
			file: {
				value: fileBuffer,
				options: {
					filename: fileName,
					contentType: mimeType,
				},
			},
		};

		// 添加额外的 JSON 元数据
		if (data && Object.keys(data).length > 0) {
			Object.entries(data).forEach(([key, value]) => {
				if (key !== 'file') {
					(requestOptions as any).formData[key] = JSON.stringify(value);
				}
			});
		}
		// When using formData, Content-Type header is set automatically by the request library.
		// Do not set json: true.
	} else {
		// For all other operations (non-file upload)
		requestOptions.json = true; // Expect JSON response and auto-parse
		if (Object.keys(cleanedQs).length > 0) {
			requestOptions.qs = cleanedQs;
		}
		if (method === 'POST' && body && Object.keys(body).length > 0) {
			requestOptions.body = body;
			if (requestOptions.headers) { // Ensure headers object exists
				requestOptions.headers['Content-Type'] = 'application/json';
			}
		}
	}

	let responseData = await node.helpers.request(requestOptions);

	if (options.collectionOperation === 'listCustom') {
		if (Array.isArray(responseData)) {
			responseData = responseData.filter((collection: any) => {
				const origin = collection.origin;
				const autoCreate = collection.autoCreate;
				return (origin === undefined || origin === null || origin === '') && 
				       (autoCreate === undefined || autoCreate === null || autoCreate === false);
			});
		} else if (responseData && responseData.data && Array.isArray(responseData.data)) {
			responseData.data = responseData.data.filter((collection: any) => {
				const origin = collection.origin;
				const autoCreate = collection.autoCreate;
				return (origin === undefined || origin === null || origin === '') && 
				       (autoCreate === undefined || autoCreate === null || autoCreate === false);
			});
		} else {
			options.node.logger.warn('Response for listCustom was not an array or expected object, cannot filter.');
		}
	}

	return responseData;
} 