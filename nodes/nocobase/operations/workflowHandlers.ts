import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from '../query';

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
	const rawDataString = this.getNodeParameter('data', itemIndex, '{}') as string;
	try {
		// Attempt to parse, but ensure dataValue remains an object if rawDataString is empty or just {}
		const parsedJson = JSON.parse(rawDataString);
		if (typeof parsedJson === 'object' && parsedJson !== null) {
			dataValue = parsedJson;
		} else {
			// If parsedJson is not an object (e.g. a string, number from a malformed JSON intended to be an object),
			// or if rawDataString was not a valid JSON object string, initialize dataValue to ensure it's an object.
			dataValue = {};
		}
	} catch (e) {
		// If JSON.parse fails (e.g. malformed JSON that isn't empty string or "{}"),
		// it might be safer to throw, or log and proceed with dataValue as an empty object.
		// For now, let's ensure dataValue is an object and log a warning.
		dataValue = {};
		this.logger.warn(`Invalid JSON in Data field for workflow ${workflowIdValue}, item ${itemIndex}. Proceeding with empty data. Error: ${(e as Error).message}`);
		// Optionally rethrow: throw new NodeOperationError(this.getNode(), `Invalid JSON in Data field: ${(e as Error).message}`, { itemIndex });
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