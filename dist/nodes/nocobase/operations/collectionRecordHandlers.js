"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCollectionRecordOperation = handleCollectionRecordOperation;
const query_1 = require("../query");
const parameterParsing_1 = require("../utils/parameterParsing");
async function handleCollectionRecordOperation(itemIndex, operation, baseUrl, token, collectionName) {
    let recordIdValue = undefined;
    let dataValue = undefined;
    let moveParamsValue = undefined;
    const queryParameters = {};
    if (operation === 'get' || operation === 'update' || operation === 'delete' || operation === 'select') {
        const recordIdParam = operation === 'select' ? 'selectedRecordId' : 'recordId';
        recordIdValue = this.getNodeParameter(recordIdParam, itemIndex, '');
        if (typeof recordIdValue === 'object' && recordIdValue !== null && 'value' in recordIdValue) {
            recordIdValue = recordIdValue.value;
        }
        if (recordIdValue === '')
            recordIdValue = undefined;
    }
    if (operation === 'create' || operation === 'update') {
        const rawData = this.getNodeParameter('data', itemIndex, '{}');
        dataValue = (0, parameterParsing_1.safeParseJsonParameter)(rawData, 'Data', itemIndex, this);
    }
    if (operation === 'list' || operation === 'get' || operation === 'select') {
        const fields = this.getNodeParameter('fields', itemIndex, '');
        if (fields)
            queryParameters.fields = fields;
        const appends = this.getNodeParameter('appends', itemIndex, '');
        if (appends)
            queryParameters.appends = appends;
        if (operation === 'list') {
            const sort = this.getNodeParameter('sort', itemIndex, '');
            if (sort)
                queryParameters.sort = sort;
            const page = this.getNodeParameter('page', itemIndex, 1);
            if (page !== 1)
                queryParameters.page = page;
            const pageSize = this.getNodeParameter('pageSize', itemIndex, 20);
            if (pageSize !== 20)
                queryParameters.pageSize = pageSize;
            const filterJson = this.getNodeParameter('filter', itemIndex, '{}');
            try {
                const filterObj = JSON.parse(filterJson);
                if (typeof filterObj === 'object' && filterObj !== null && Object.keys(filterObj).length > 0) {
                    queryParameters.filter = filterObj;
                }
            }
            catch (e) {
                this.logger.warn(`Invalid JSON in Filter field for item ${itemIndex}, filter will be ignored: ${e.message}`);
            }
        }
    }
    if (operation === 'move') {
        moveParamsValue = {
            sourceRecordId: this.getNodeParameter('sourceRecordId', itemIndex, ''),
            targetRecordId: this.getNodeParameter('targetRecordId', itemIndex, ''),
            moveMethod: this.getNodeParameter('moveMethod', itemIndex, 'insertAfter'),
            sortFieldName: this.getNodeParameter('sortFieldName', itemIndex, 'sort'),
            targetScopeJson: this.getNodeParameter('targetScopeJson', itemIndex, ''),
            stickyToTop: this.getNodeParameter('stickyToTop', itemIndex, false),
        };
    }
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionName: collectionName,
        collectionOperation: operation,
        recordId: recordIdValue,
        data: dataValue,
        queryParameters: Object.keys(queryParameters).length > 0 ? queryParameters : undefined,
        moveOperationParams: moveParamsValue,
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
