import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from '../query';

export async function handleCollectionRecordOperation(
	this: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	baseUrl: string,
	token: string,
	collectionName: string,
): Promise<any> {
	let recordIdValue: string | undefined = undefined;
	let dataValue: object | undefined = undefined;
	let moveParamsValue: NocoBaseRequestOptions['moveOperationParams'] | undefined = undefined;
	const queryParameters: Record<string, any> = {};

	if (operation === 'get' || operation === 'update' || operation === 'delete') {
		recordIdValue = this.getNodeParameter('recordId', itemIndex, '') as string;
		if (recordIdValue === '') recordIdValue = undefined;
	}

	if (operation === 'create' || operation === 'update') {
		const rawDataString = this.getNodeParameter('data', itemIndex, '{}') as string;
		try {
			dataValue = JSON.parse(rawDataString);
			if (Object.keys(dataValue as object).length === 0) {
				dataValue = undefined;
			}
		} catch (e) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid JSON in Data field: ${(e as Error).message}`,
				{ itemIndex },
			);
		}
	}

	if (operation === 'list' || operation === 'get') {
		const fields = this.getNodeParameter('fields', itemIndex, '') as string;
		if (fields) queryParameters.fields = fields;

		const appends = this.getNodeParameter('appends', itemIndex, '') as string;
		if (appends) queryParameters.appends = appends;

		if (operation === 'list') {
			const sort = this.getNodeParameter('sort', itemIndex, '') as string;
			if (sort) queryParameters.sort = sort;

			const page = this.getNodeParameter('page', itemIndex, 1) as number;
			if (page !== 1) queryParameters.page = page; // Only include if not default

			const pageSize = this.getNodeParameter('pageSize', itemIndex, 20) as number;
			if (pageSize !== 20) queryParameters.pageSize = pageSize; // Only include if not default

			const filterJson = this.getNodeParameter('filter', itemIndex, '{}') as string;
			try {
				const filterObj = JSON.parse(filterJson);
				if (typeof filterObj === 'object' && filterObj !== null && Object.keys(filterObj).length > 0) {
					queryParameters.filter = filterObj;
				}
			} catch (e) {
				this.logger.warn(
					`Invalid JSON in Filter field for item ${itemIndex}, filter will be ignored: ${(e as Error).message
					}`,
				);
				// Or rethrow: throw new NodeOperationError(this.getNode(), `Invalid JSON in Filter field: ${(e as Error).message}`, { itemIndex });
			}
		}
	}

	if (operation === 'move') {
		moveParamsValue = {
			sourceRecordId: this.getNodeParameter('sourceRecordId', itemIndex, '') as string,
			targetRecordId: this.getNodeParameter('targetRecordId', itemIndex, '') as string,
			moveMethod: this.getNodeParameter('moveMethod', itemIndex, 'insertAfter') as string,
			sortFieldName: this.getNodeParameter('sortFieldName', itemIndex, 'sort') as string,
			targetScopeJson: this.getNodeParameter('targetScopeJson', itemIndex, '') as string,
			stickyToTop: this.getNodeParameter('stickyToTop', itemIndex, false) as boolean,
		};
	}

	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection', // Assuming executeNocoBaseApi uses this along with collectionName
		collectionName: collectionName,
		collectionOperation: operation,
		recordId: recordIdValue,
		data: dataValue,
		queryParameters: Object.keys(queryParameters).length > 0 ? queryParameters : undefined,
		moveOperationParams: moveParamsValue,
	};

	return executeNocoBaseApi(apiOptions);
} 