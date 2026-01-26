"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFileUploadOperation = handleFileUploadOperation;
const n8n_workflow_1 = require("n8n-workflow");
const query_1 = require("../query");
const parameterParsing_1 = require("../utils/parameterParsing");
async function handleFileUploadOperation(itemIndex, baseUrl, token, currentItem) {
    const collectionNameValue = this.getNodeParameter('collectionName', itemIndex);
    const collectionName = collectionNameValue.value;
    if (!collectionName) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Collection ID is required for uploadFile operation.', { itemIndex });
    }
    const uploadMethod = this.getNodeParameter('uploadMethod', itemIndex, 'binary');
    let binaryPropertyNameValue = undefined;
    let binaryDataValue = undefined;
    let filePathValue = undefined;
    let base64DataValue = undefined;
    if (uploadMethod === 'binary' || uploadMethod === 'base64') {
        binaryPropertyNameValue = this.getNodeParameter('binaryPropertyName', itemIndex, 'data');
    }
    if (uploadMethod === 'binary') {
        if (!currentItem.binary || !currentItem.binary[binaryPropertyNameValue]) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary data found in input property '${binaryPropertyNameValue}' for item ${itemIndex}.`, { itemIndex });
        }
        binaryDataValue = currentItem.binary[binaryPropertyNameValue];
    }
    else if (uploadMethod === 'filepath') {
        filePathValue = this.getNodeParameter('filePath', itemIndex);
        if (!filePathValue) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'File path is required when using filepath upload method.', { itemIndex });
        }
    }
    else if (uploadMethod === 'base64') {
        base64DataValue = this.getNodeParameter('base64Content', itemIndex);
        if (!base64DataValue) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Base64 content is required when using base64 upload method.', { itemIndex });
        }
    }
    const uploadFileNameValue = this.getNodeParameter('uploadFileName', itemIndex, '') || undefined;
    const rawData = this.getNodeParameter('data', itemIndex, '{}');
    let metadataValue;
    try {
        metadataValue = (0, parameterParsing_1.safeParseJsonParameter)(rawData, 'Data', itemIndex, this);
    }
    catch (e) {
        metadataValue = undefined;
        this.logger.warn(`Invalid or empty JSON in Data field for metadata for item ${itemIndex}: ${e.message}. Proceeding without metadata.`);
    }
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionName: collectionName,
        collectionOperation: 'uploadFile',
        data: metadataValue,
        binaryPropertyName: binaryPropertyNameValue,
        uploadFileName: uploadFileNameValue,
        binaryData: binaryDataValue,
        base64Data: base64DataValue,
        uploadMethod: uploadMethod,
        filePath: filePathValue,
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
