"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNocoBaseApi = executeNocoBaseApi;
const n8n_workflow_1 = require("n8n-workflow");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mime = __importStar(require("mime-types"));
mime.types['mp4'] = 'video/mp4';
mime.types['mpg4'] = 'video/mp4';
mime.types['wav'] = 'audio/wave';
mime.types['audio/wav'] = 'audio/wave';
mime.types['rtf'] = 'text/rtf';
mime.types['xml'] = 'text/xml';
mime.types['application/rtf'] = 'text/rtf';
async function executeNocoBaseApi(options) {
    const { node, baseUrl, token, collectionName, collectionOperation, recordId, data, queryParameters: rawCollectionQueryParams, moveOperationParams } = options;
    let endpoint = '';
    let method = 'GET';
    let body = {};
    let queryParams = {};
    if (!collectionOperation) {
        throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'Collection operation is required.');
    }
    if (collectionOperation === 'getServerInfo') {
        endpoint = `${baseUrl}/api/app:getInfo`;
        method = 'GET';
    }
    else if (collectionOperation === 'listCustom') {
        endpoint = `${baseUrl}/api/collections:list`;
        method = 'GET';
    }
    else if (collectionOperation === 'listUsers') {
        endpoint = `${baseUrl}/api/users:list`;
        method = 'GET';
    }
    else if (collectionOperation === 'uploadFile') {
        if (!collectionName) {
            throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'File Collection name is required for uploadFile operation.');
        }
        endpoint = `${baseUrl}/api/${collectionName}:create`;
        method = 'POST';
    }
    else if (collectionOperation === 'listWorkflows') {
        endpoint = `${baseUrl}/api/workflows:list`;
        method = 'GET';
    }
    else if (collectionOperation === 'executeWorkflow') {
        if (!options.recordId) {
            throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'Workflow ID (as recordId) is required for executeWorkflow operation.');
        }
        const verifyWorkflowOptions = {
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
            }
            else if (verifyResponse && Array.isArray(verifyResponse) && verifyResponse.length > 0) {
                workflowToExecute = verifyResponse[0];
            }
            if (!workflowToExecute) {
                throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Workflow with ID '${options.recordId}' not found.`);
            }
            if (workflowToExecute.id !== options.recordId && workflowToExecute.key !== options.recordId) {
                let foundMatch = false;
                if (String(workflowToExecute.id) === String(options.recordId) || workflowToExecute.key === options.recordId) {
                    foundMatch = true;
                }
                if (!foundMatch) {
                    throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Workflow with ID '${options.recordId}' not found (mismatch after filter).`);
                }
            }
            if (workflowToExecute.enabled !== true) {
                throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Workflow '${workflowToExecute.title || options.recordId}' (ID: ${options.recordId}) is disabled and cannot be triggered.`);
            }
        }
        catch (error) {
            if (error instanceof n8n_workflow_1.NodeOperationError)
                throw error;
            throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Failed to verify workflow status for ID '${options.recordId}'. Error: ${error.message}`);
        }
        endpoint = `${baseUrl}/api/workflows`;
        method = 'POST';
    }
    else {
        if (!collectionName) {
            throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'Collection name is required for this operation.');
        }
        endpoint = `${baseUrl}/api/${collectionName}`;
    }
    queryParams = { ...(rawCollectionQueryParams || {}) };
    switch (collectionOperation) {
        case 'getServerInfo':
        case 'listCustom':
        case 'listUsers':
        case 'listWorkflows':
            queryParams = { ...(rawCollectionQueryParams || {}) };
            body = {};
            break;
        case 'uploadFile':
            queryParams = {};
            body = {};
            break;
        case 'executeWorkflow':
            body = data || {};
            queryParams = { triggerWorkflows: options.recordId };
            break;
        case 'list':
            endpoint += ':list';
            method = 'GET';
            break;
        case 'get':
            endpoint += ':get';
            method = 'GET';
            if (recordId)
                queryParams.filterByTk = recordId;
            break;
        case 'create':
            endpoint += ':create';
            method = 'POST';
            body = data || {};
            break;
        case 'update':
            endpoint += ':update';
            method = 'POST';
            if (recordId)
                queryParams.filterByTk = recordId;
            body = data || {};
            break;
        case 'delete':
            endpoint += ':destroy';
            method = 'POST';
            if (recordId)
                queryParams.filterByTk = recordId;
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
        case 'select':
            endpoint += ':get';
            method = 'GET';
            if (recordId)
                queryParams.filterByTk = recordId;
            break;
        default:
            throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Collection operation '${collectionOperation}' not supported.`);
    }
    const cleanedQs = {};
    for (const [key, value] of Object.entries(queryParams)) {
        if (value === '' && (key === 'fields' || key === 'sort' || key === 'appends' || key === 'except' || key === 'targetId')) {
            continue;
        }
        else if (value !== undefined) {
            cleanedQs[key] = value;
        }
    }
    const requestOptions = {
        method,
        url: endpoint,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
    };
    if (collectionOperation === 'uploadFile') {
        let effectiveBinaryData = options.binaryData;
        let tempUploadMethodForFormData = options.uploadMethod;
        if (options.uploadMethod === 'base64' && options.base64Data) {
            try {
                Buffer.from(options.base64Data, 'base64');
                let fileName = options.uploadFileName || `file.bin`;
                let mimeType = mime.lookup(fileName) || 'application/octet-stream';
                if (!options.uploadFileName && options.binaryPropertyName && path.extname(options.binaryPropertyName)) {
                    fileName = options.binaryPropertyName;
                    mimeType = mime.lookup(fileName) || mimeType;
                }
                effectiveBinaryData = {
                    data: options.base64Data,
                    fileName: fileName,
                    mimeType: mimeType,
                };
                tempUploadMethodForFormData = 'binary';
                node.logger.info(`[NocoBase Node] Using provided Base64 data directly. FileName: ${fileName}, MimeType: ${mimeType}`);
            }
            catch (e) {
                throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Invalid Base64 string provided: ${e.message}`);
            }
        }
        const formData = {};
        const formdataFileKey = 'file';
        if (tempUploadMethodForFormData === 'binary') {
            if (!effectiveBinaryData || typeof effectiveBinaryData.data !== 'string' || effectiveBinaryData.data.length === 0) {
                throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'Binary data (as Base64 string) is missing or empty for upload.');
            }
            const fileName = options.uploadFileName || effectiveBinaryData.fileName || `${options.binaryPropertyName || 'uploaded_file'}.bin`;
            const mimeType = effectiveBinaryData.mimeType || mime.lookup(fileName) || 'application/octet-stream';
            formData[formdataFileKey] = {
                value: Buffer.from(effectiveBinaryData.data, 'base64'),
                options: { filename: fileName, contentType: mimeType },
            };
        }
        else if (tempUploadMethodForFormData === 'filepath') {
            if (!options.filePath) {
                throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'File path is required for filepath upload.');
            }
            try {
                const filePath = path.resolve(options.filePath);
                if (!fs.existsSync(filePath)) {
                    throw new n8n_workflow_1.NodeOperationError(node.getNode(), `File not found at path: ${filePath}`);
                }
                const fileBuffer = fs.readFileSync(filePath);
                const fileName = options.uploadFileName || path.basename(filePath);
                const mimeType = mime.lookup(fileName) || 'application/octet-stream';
                formData[formdataFileKey] = {
                    value: fileBuffer,
                    options: { filename: fileName, contentType: mimeType },
                };
            }
            catch (error) {
                throw new n8n_workflow_1.NodeOperationError(node.getNode(), `Error processing file for upload: ${error.message}`);
            }
        }
        else {
            throw new n8n_workflow_1.NodeOperationError(node.getNode(), 'Unsupported or missing upload method for file upload.');
        }
        if (options.data && typeof options.data === 'object' && Object.keys(options.data).length > 0) {
            Object.entries(options.data).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    formData[key] = JSON.stringify(value);
                }
                else {
                    formData[key] = value;
                }
            });
        }
        requestOptions.body = formData;
        requestOptions.headers['Content-Type'] = 'multipart/form-data';
        delete requestOptions.qs;
        delete requestOptions.json;
    }
    else {
        if (Object.keys(cleanedQs).length > 0) {
            requestOptions.qs = cleanedQs;
        }
        if (method === 'POST') {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.json = true;
            if (body && Object.keys(body).length > 0) {
                requestOptions.body = body;
            }
            else {
                requestOptions.body = {};
            }
        }
        else {
            delete requestOptions.body;
            delete requestOptions.json;
        }
    }
    let responseData = await node.helpers.request(requestOptions);
    if (options.collectionOperation === 'listCustom') {
        if (Array.isArray(responseData)) {
            responseData = responseData.filter((collection) => {
                const origin = collection.origin;
                const autoCreate = collection.autoCreate;
                return (origin === undefined || origin === null || origin === '') &&
                    (autoCreate === undefined || autoCreate === null || autoCreate === false);
            });
        }
        else if (responseData && responseData.data && Array.isArray(responseData.data)) {
            responseData.data = responseData.data.filter((collection) => {
                const origin = collection.origin;
                const autoCreate = collection.autoCreate;
                return (origin === undefined || origin === null || origin === '') &&
                    (autoCreate === undefined || autoCreate === null || autoCreate === false);
            });
        }
        else {
            options.node.logger.warn('Response for listCustom was not an array or expected object, cannot filter.');
        }
    }
    return responseData;
}
