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
	uploadMethod?: 'binary' | 'filepath' | 'base64';
	filePath?: string;
	base64Data?: string; // Added for base64 content
	// Association related properties are removed
	// workflowId is not explicitly added here, we will use recordId for workflowId in executeWorkflow.
}

// 定义具体的类型替代 any
export interface CollectionData {
	name: string;
	title?: string;
	origin?: string;
	autoCreate?: boolean;
}

export interface WorkflowData {
	id: string;
	title?: string;
	name?: string;
	label?: string;
	key?: string;
	enabled: boolean;
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
	} = options;

	let endpoint = '';
	let method: IHttpRequestMethods = 'GET'; // Default method
	let body: any = {};
	let queryParams: Record<string, any> = {};

	if (!collectionOperation) { 
		throw new NodeOperationError(node.getNode(), 'Collection operation is required.');
	}

	// Initial endpoint and method setup based on operation type
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
		endpoint = `${baseUrl}/api/${collectionName}:create`; // Correct endpoint for upload
		method = 'POST'; // Correct method for upload
	} else if (collectionOperation === 'listWorkflows') {
		endpoint = `${baseUrl}/api/workflows:list`;
		method = 'GET';
	} else if (collectionOperation === 'executeWorkflow') {
		if (!options.recordId) { // recordId here is workflowId
			throw new NodeOperationError(node.getNode(), 'Workflow ID (as recordId) is required for executeWorkflow operation.');
		}
		// ... (Verification logic for workflow - assuming it's correct and remains unchanged)
		const verifyWorkflowOptions: IHttpRequestOptions = {
			url: `${baseUrl}/api/workflows:list`,
			method: 'GET',
			headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
			qs: { filter: { id: options.recordId } },
			json: true,
		};
		try {
			const verifyResponse = await node.helpers.request(verifyWorkflowOptions);
			let workflowToExecute;
			if (verifyResponse && verifyResponse.data && Array.isArray(verifyResponse.data) && verifyResponse.data.length > 0) {
				workflowToExecute = verifyResponse.data[0];
			} else if (verifyResponse && Array.isArray(verifyResponse) && verifyResponse.length > 0) {
				workflowToExecute = verifyResponse[0]; 
			}

			if (!workflowToExecute) {
				throw new NodeOperationError(node.getNode(), `Workflow with ID '${options.recordId}' not found.`);
			}
			if (workflowToExecute.id !== options.recordId && workflowToExecute.key !== options.recordId) {
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
			if (error instanceof NodeOperationError) throw error;
			throw new NodeOperationError(node.getNode(), `Failed to verify workflow status for ID '${options.recordId}'. Error: ${error.message}`);
		}
		endpoint = `${baseUrl}/api/workflows`; 
		method = 'POST';
	} else { // For other collection-specific operations
		if (!collectionName) {
			throw new NodeOperationError(node.getNode(), 'Collection name is required for this operation.');
		}
		endpoint = `${baseUrl}/api/${collectionName}`;
	}
	
	queryParams = { ...(rawCollectionQueryParams || {}) };

	switch (collectionOperation) {
		// Cases for getServerInfo, listCustom, listUsers, listWorkflows already have method and endpoint set.
		// For these, body is typically empty, and queryParams are passed if any.
		case 'getServerInfo':
		case 'listCustom':
		case 'listUsers':
		case 'listWorkflows':
			queryParams = { ...(rawCollectionQueryParams || {}) }; // Ensure queryParams are correctly assigned
			body = {};
			break;
		case 'uploadFile':
			// Endpoint and method are already set specifically for uploadFile.
			queryParams = {}; // No queryParams for direct file upload to :create
			body = {}; // FormData will be constructed later and assigned to requestOptions.body
			break;
		case 'executeWorkflow':
			// Endpoint and method are already set for executeWorkflow.
			body = data || {};
			queryParams = { triggerWorkflows: options.recordId }; 
			break;
		case 'list':
			endpoint += ':list';
			method = 'GET'; // Ensure method is GET for list
			break;
		case 'get':
			endpoint += ':get';
			method = 'GET'; // Ensure method is GET for get
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
			continue;
		} else if (value !== undefined) {
			cleanedQs[key] = value;
		}
	}

	const requestOptions: IHttpRequestOptions = {
		method,
		url: endpoint,
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/json',
		},
	};

	if (collectionOperation === 'uploadFile') {
		let effectiveBinaryData: IBinaryData | undefined = options.binaryData;
		let tempUploadMethodForFormData = options.uploadMethod;

		if (options.uploadMethod === 'base64' && options.base64Data) {
			try {
				// Validate the Base64 string. This will throw an error if it's invalid.
				Buffer.from(options.base64Data, 'base64');

				let fileName = options.uploadFileName || `file.bin`;
				let mimeType = mime.lookup(fileName) || 'application/octet-stream';

				if (!options.uploadFileName && options.binaryPropertyName && path.extname(options.binaryPropertyName)) {
					fileName = options.binaryPropertyName;
					mimeType = mime.lookup(fileName) || mimeType;
				}

				effectiveBinaryData = {
					data: options.base64Data, // Directly use the provided Base64 string
					fileName: fileName,
					mimeType: mimeType,
				};
				tempUploadMethodForFormData = 'binary'; // Keep this, as subsequent logic decodes from base64
				node.logger.info(`[NocoBase Node] Using provided Base64 data directly. FileName: ${fileName}, MimeType: ${mimeType}`);
			} catch (e) {
				throw new NodeOperationError(node.getNode(), `Invalid Base64 string provided: ${(e as Error).message}`);
			}
		}

		const formData: Record<string, any> = {};
		const formdataFileKey = 'file';

		if (tempUploadMethodForFormData === 'binary') {
			if (!effectiveBinaryData || typeof effectiveBinaryData.data !== 'string' || effectiveBinaryData.data.length === 0) {
				throw new NodeOperationError(node.getNode(), 'Binary data (as Base64 string) is missing or empty for upload.');
			}
			const fileName = options.uploadFileName || effectiveBinaryData.fileName || `${options.binaryPropertyName || 'uploaded_file'}.bin`;
			const mimeType = effectiveBinaryData.mimeType || mime.lookup(fileName) || 'application/octet-stream';
			
			formData[formdataFileKey] = {
				value: Buffer.from(effectiveBinaryData.data, 'base64'), // Correctly decodes from Base64
				options: { filename: fileName, contentType: mimeType },
			};
		} else if (tempUploadMethodForFormData === 'filepath') {
			if (!options.filePath) {
				throw new NodeOperationError(node.getNode(), 'File path is required for filepath upload.');
			}
			try {
				const filePath = path.resolve(options.filePath);
				if (!fs.existsSync(filePath)) {
					throw new NodeOperationError(node.getNode(), `File not found at path: ${filePath}`);
				}
				const fileBuffer = fs.readFileSync(filePath); // New: Read directly into a buffer
				const fileName = options.uploadFileName || path.basename(filePath);
				const mimeType = mime.lookup(fileName) || 'application/octet-stream';

				formData[formdataFileKey] = { // Use 'file' as the key
					value: fileBuffer, // New: Send buffer
					options: { filename: fileName, contentType: mimeType },
				};
			} catch (error) {
				throw new NodeOperationError(node.getNode(), `Error processing file for upload: ${(error as Error).message}`);
			}
		} else {
			throw new NodeOperationError(node.getNode(), 'Unsupported or missing upload method for file upload.');
		}

		if (options.data && typeof options.data === 'object' && Object.keys(options.data).length > 0) {
			Object.entries(options.data).forEach(([key, value]) => {
				if (typeof value === 'object' && value !== null) {
					formData[key] = JSON.stringify(value);
				} else {
					formData[key] = value;
				}
			});
		}
		
		requestOptions.body = formData;
		requestOptions.headers!['Content-Type'] = 'multipart/form-data';
		// qs and json should not be set for multipart/form-data
		delete requestOptions.qs; 
		delete (requestOptions as any).json;

	} else { // For non-uploadFile operations
		if (Object.keys(cleanedQs).length > 0) {
			requestOptions.qs = cleanedQs;
		}

		if (method === 'POST') {
			requestOptions.headers!['Content-Type'] = 'application/json';
			requestOptions.json = true; // For n8n helper to stringify body and parse response
			if (body && Object.keys(body).length > 0) {
				requestOptions.body = body;
			} else {
				requestOptions.body = {}; // Send empty JSON object if no body provided for these methods
			}
		} else {
			// For GET, DELETE, etc., no JSON body is typically sent.
			// qs might be used, and headers like Accept are already set.
			// Ensure body and json flag are not set from previous logic if method is not POST/PUT/PATCH.
			delete requestOptions.body;
			delete (requestOptions as any).json;
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