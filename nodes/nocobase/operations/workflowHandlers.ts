import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from '../query';
import { safeParseJsonParameter } from '../utils/parameterParsing';

export async function handleExecuteWorkflowOperation(
	this: IExecuteFunctions,
	itemIndex: number,
	baseUrl: string,
	token: string,
): Promise<any> {
	let workflowIdValue: string | undefined;
	const workflowIdParam = this.getNodeParameter('workflowId', itemIndex) as { value: string } | string;
	if (typeof workflowIdParam === 'object' && workflowIdParam.value) {
		workflowIdValue = workflowIdParam.value;
	} else if (typeof workflowIdParam === 'string') {
		workflowIdValue = workflowIdParam;
	}

	if (!workflowIdValue) {
		throw new NodeOperationError(this.getNode(), 'Workflow ID is required for executeWorkflow operation.', { itemIndex });
	}

	let dataValue: any = {}; // Default to object for triggerContext and other inputs
	const rawData = this.getNodeParameter('data', itemIndex, '{}') as string | object;
	try {
		const parsedData = safeParseJsonParameter(rawData, 'Data', itemIndex, this);
		dataValue = parsedData || {}; // Use parsed data or default to empty object
	} catch (e) {
		// If JSON parsing fails, log a warning and proceed with empty data
		dataValue = {};
		this.logger.warn(`Invalid JSON in Data field for workflow ${workflowIdValue}, item ${itemIndex}. Proceeding with empty data. Error: ${(e as Error).message}`);
	}

	const contextCollectionParam = this.getNodeParameter('collectionName', itemIndex, '') as { value: string } | string;
	const contextRecordIdParam = this.getNodeParameter('contextRecordId', itemIndex, '') as string;

	let actualContextCollectionName: string | undefined;
	if (typeof contextCollectionParam === 'object' && contextCollectionParam.value && contextCollectionParam.value.trim() !== '') {
		actualContextCollectionName = contextCollectionParam.value.trim();
	} else if (typeof contextCollectionParam === 'string' && contextCollectionParam.trim() !== '') {
		actualContextCollectionName = contextCollectionParam.trim();
	}

	const actualContextRecordId = typeof contextRecordIdParam === 'string' && contextRecordIdParam.trim() !== '' ? contextRecordIdParam.trim() : undefined;

	if (actualContextCollectionName || actualContextRecordId) {
		if (typeof dataValue !== 'object' || dataValue === null) dataValue = {}; // Ensure dataValue is an object

		const triggerContext: { collection?: string; recordId?: string } = {};
		if (actualContextCollectionName) {
			triggerContext.collection = actualContextCollectionName;
		}
		if (actualContextRecordId) {
			triggerContext.recordId = actualContextRecordId;
		}
		dataValue.triggerContext = triggerContext;

		if (actualContextCollectionName && !actualContextRecordId) {
			this.logger.warn('Context Collection Name was provided for workflow trigger, but Context Record ID is missing.', { itemIndex });
		} else if (!actualContextCollectionName && actualContextRecordId) {
			this.logger.warn('Context Record ID was provided for workflow trigger, but Context Collection Name is missing.', { itemIndex });
		}
	}

    // Determine if dataValue is effectively empty (only contains an empty triggerContext or is empty itself)
    let finalDataValue: object | undefined = dataValue;
    if (typeof dataValue === 'object' && dataValue !== null) {
        const keys = Object.keys(dataValue);
        if (keys.length === 0) {
            finalDataValue = undefined;
        } else if (keys.length === 1 && keys[0] === 'triggerContext') {
            // If only triggerContext is present, check if triggerContext itself has any keys
            if (typeof dataValue.triggerContext === 'object' && dataValue.triggerContext !== null && Object.keys(dataValue.triggerContext).length === 0) {
                finalDataValue = undefined; // triggerContext is empty, so effectively no data
            }
        }
    }

	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection', // Consistent with original; executeNocoBaseApi handles routing for 'executeWorkflow'
		collectionOperation: 'executeWorkflow',
		recordId: workflowIdValue, // This is the Workflow ID
		data: finalDataValue, // Contains input data and triggerContext
	};

	return executeNocoBaseApi(apiOptions);
} 