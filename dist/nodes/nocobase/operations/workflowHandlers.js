"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExecuteWorkflowOperation = handleExecuteWorkflowOperation;
const n8n_workflow_1 = require("n8n-workflow");
const query_1 = require("../query");
const parameterParsing_1 = require("../utils/parameterParsing");
async function handleExecuteWorkflowOperation(itemIndex, baseUrl, token) {
    let workflowIdValue;
    const workflowIdParam = this.getNodeParameter('workflowId', itemIndex);
    if (typeof workflowIdParam === 'object' && workflowIdParam.value) {
        workflowIdValue = workflowIdParam.value;
    }
    else if (typeof workflowIdParam === 'string') {
        workflowIdValue = workflowIdParam;
    }
    if (!workflowIdValue) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Workflow ID is required for executeWorkflow operation.', { itemIndex });
    }
    let dataValue = {};
    const rawData = this.getNodeParameter('data', itemIndex, '{}');
    try {
        const parsedData = (0, parameterParsing_1.safeParseJsonParameter)(rawData, 'Data', itemIndex, this);
        dataValue = parsedData || {};
    }
    catch (e) {
        dataValue = {};
        this.logger.warn(`Invalid JSON in Data field for workflow ${workflowIdValue}, item ${itemIndex}. Proceeding with empty data. Error: ${e.message}`);
    }
    const contextCollectionParam = this.getNodeParameter('collectionName', itemIndex, '');
    const contextRecordIdParam = this.getNodeParameter('contextRecordId', itemIndex, '');
    let actualContextCollectionName;
    if (typeof contextCollectionParam === 'object' && contextCollectionParam.value && contextCollectionParam.value.trim() !== '') {
        actualContextCollectionName = contextCollectionParam.value.trim();
    }
    else if (typeof contextCollectionParam === 'string' && contextCollectionParam.trim() !== '') {
        actualContextCollectionName = contextCollectionParam.trim();
    }
    const actualContextRecordId = typeof contextRecordIdParam === 'string' && contextRecordIdParam.trim() !== '' ? contextRecordIdParam.trim() : undefined;
    if (actualContextCollectionName || actualContextRecordId) {
        if (typeof dataValue !== 'object' || dataValue === null)
            dataValue = {};
        const triggerContext = {};
        if (actualContextCollectionName) {
            triggerContext.collection = actualContextCollectionName;
        }
        if (actualContextRecordId) {
            triggerContext.recordId = actualContextRecordId;
        }
        dataValue.triggerContext = triggerContext;
        if (actualContextCollectionName && !actualContextRecordId) {
            this.logger.warn('Context Collection Name was provided for workflow trigger, but Context Record ID is missing.', { itemIndex });
        }
        else if (!actualContextCollectionName && actualContextRecordId) {
            this.logger.warn('Context Record ID was provided for workflow trigger, but Context Collection Name is missing.', { itemIndex });
        }
    }
    let finalDataValue = dataValue;
    if (typeof dataValue === 'object' && dataValue !== null) {
        const keys = Object.keys(dataValue);
        if (keys.length === 0) {
            finalDataValue = undefined;
        }
        else if (keys.length === 1 && keys[0] === 'triggerContext') {
            if (typeof dataValue.triggerContext === 'object' && dataValue.triggerContext !== null && Object.keys(dataValue.triggerContext).length === 0) {
                finalDataValue = undefined;
            }
        }
    }
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionOperation: 'executeWorkflow',
        recordId: workflowIdValue,
        data: finalDataValue,
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
