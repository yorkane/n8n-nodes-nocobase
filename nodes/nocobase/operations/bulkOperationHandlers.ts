import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from '../query';
import { safeParseJsonParameter } from '../utils/parameterParsing';

export interface BulkOperationResult {
	totalRecords: number;
	successCount: number;
	failureCount: number;
	results: Array<{
		index: number;
		success: boolean;
		data?: any;
		error?: string;
	}>;
	summary: string;
}

/**
 * Handles bulk create operation for collection records.
 * Processes multiple records sequentially and tracks success/failure for each.
 *
 * @param this - The IExecuteFunctions context
 * @param itemIndex - The current item index
 * @param baseUrl - The NocoBase base URL
 * @param token - The authentication token
 * @param collectionName - The collection name to create records in
 * @returns BulkOperationResult with detailed results for each record
 */
export async function handleBulkCreateOperation(
	this: IExecuteFunctions,
	itemIndex: number,
	baseUrl: string,
	token: string,
	collectionName: string,
): Promise<BulkOperationResult> {
	// Get the bulk data parameter
	const rawBulkData = this.getNodeParameter('bulkData', itemIndex, '[]') as string | object;
	const continueOnFailure = this.getNodeParameter('bulkContinueOnFailure', itemIndex, true) as boolean;

	// Parse the bulk data
	let bulkDataArray: any[];
	try {
		const parsedData = safeParseJsonParameter(rawBulkData, 'Bulk Data', itemIndex, this);

		if (!parsedData) {
			throw new NodeOperationError(
				this.getNode(),
				'Bulk Data cannot be empty. Please provide an array of record objects.',
				{ itemIndex },
			);
		}

		// Ensure it's an array
		if (!Array.isArray(parsedData)) {
			// If a single object was provided, wrap it in an array
			bulkDataArray = [parsedData];
			this.logger.info(`Bulk Data was a single object, wrapping in array for bulk create operation.`);
		} else {
			bulkDataArray = parsedData;
		}
	} catch (e) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid Bulk Data: ${(e as Error).message}`,
			{ itemIndex },
		);
	}

	// Validate the array is not empty
	if (bulkDataArray.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Bulk Data array is empty. Please provide at least one record to create.',
			{ itemIndex },
		);
	}

	// Initialize result tracking
	const result: BulkOperationResult = {
		totalRecords: bulkDataArray.length,
		successCount: 0,
		failureCount: 0,
		results: [],
		summary: '',
	};

	// Process each record sequentially
	for (let i = 0; i < bulkDataArray.length; i++) {
		const recordData = bulkDataArray[i];

		// Validate that each item is an object
		if (typeof recordData !== 'object' || recordData === null) {
			const errorMsg = `Record at index ${i} is not a valid object (got ${typeof recordData})`;
			result.results.push({
				index: i,
				success: false,
				error: errorMsg,
			});
			result.failureCount++;

			if (!continueOnFailure) {
				result.summary = `Bulk create stopped at record ${i} due to validation error: ${errorMsg}`;
				return result;
			}
			continue;
		}

		// Validate that the object is not empty
		if (Object.keys(recordData).length === 0) {
			const errorMsg = `Record at index ${i} is an empty object`;
			result.results.push({
				index: i,
				success: false,
				error: errorMsg,
			});
			result.failureCount++;

			if (!continueOnFailure) {
				result.summary = `Bulk create stopped at record ${i} due to validation error: ${errorMsg}`;
				return result;
			}
			continue;
		}

		// Create the record via API
		try {
			const apiOptions: NocoBaseRequestOptions = {
				node: this,
				baseUrl,
				token,
				resource: 'collection',
				collectionName: collectionName,
				collectionOperation: 'create',
				data: recordData,
			};

			const response = await executeNocoBaseApi(apiOptions);

			result.results.push({
				index: i,
				success: true,
				data: response,
			});
			result.successCount++;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			result.results.push({
				index: i,
				success: false,
				error: errorMsg,
			});
			result.failureCount++;

			if (!continueOnFailure) {
				result.summary = `Bulk create stopped at record ${i} due to error: ${errorMsg}`;
				return result;
			}
		}
	}

	// Generate summary
	if (result.failureCount === 0) {
		result.summary = `Successfully created all ${result.totalRecords} records`;
	} else if (result.successCount === 0) {
		result.summary = `Failed to create all ${result.totalRecords} records`;
	} else {
		result.summary = `Created ${result.successCount} of ${result.totalRecords} records (${result.failureCount} failures)`;
	}

	return result;
}
