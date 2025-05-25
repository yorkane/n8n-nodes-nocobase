import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from '../query';

export async function handleFileUploadOperation(
	this: IExecuteFunctions,
	itemIndex: number,
	baseUrl: string,
	token: string,
	currentItem: INodeExecutionData,
): Promise<any> {
	const collectionNameValue = this.getNodeParameter('collectionName', itemIndex) as { mode: string; value: string };
	const collectionName = collectionNameValue.value;
	if (!collectionName) {
		throw new NodeOperationError(this.getNode(), 'Collection ID is required for uploadFile operation.', { itemIndex });
	}

	const uploadMethod = this.getNodeParameter('uploadMethod', itemIndex, 'binary') as 'binary' | 'filepath' | 'base64';
	let binaryPropertyNameValue: string | undefined = undefined;
	let binaryDataValue: NocoBaseRequestOptions['binaryData'] | undefined = undefined;
	let filePathValue: string | undefined = undefined;
	let base64DataValue: string | undefined = undefined;

	if (uploadMethod === 'binary' || uploadMethod === 'base64') {
		binaryPropertyNameValue = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
	}

	if (uploadMethod === 'binary') {
		if (!currentItem.binary || !currentItem.binary![binaryPropertyNameValue!]) {
			throw new NodeOperationError(
				this.getNode(),
				`No binary data found in input property '${binaryPropertyNameValue}' for item ${itemIndex}.`,
				{ itemIndex },
			);
		}
		binaryDataValue = currentItem.binary![binaryPropertyNameValue!];
	} else if (uploadMethod === 'filepath') {
		filePathValue = this.getNodeParameter('filePath', itemIndex) as string;
		if (!filePathValue) {
			throw new NodeOperationError(this.getNode(), 'File path is required when using filepath upload method.', { itemIndex });
		}
	} else if (uploadMethod === 'base64') {
		base64DataValue = this.getNodeParameter('base64Content', itemIndex) as string;
		if (!base64DataValue) {
			throw new NodeOperationError(this.getNode(), 'Base64 content is required when using base64 upload method.', { itemIndex });
		}
	}

	const uploadFileNameValue = (this.getNodeParameter('uploadFileName', itemIndex, '') as string) || undefined;

	const rawDataString = this.getNodeParameter('data', itemIndex, '{}') as string; // For metadata
	let metadataValue: object | undefined;
	try {
		const parsedData = JSON.parse(rawDataString);
		if (typeof parsedData === 'object' && parsedData !== null && Object.keys(parsedData).length > 0) {
			metadataValue = parsedData;
		} else {
			metadataValue = undefined; 
		}
	} catch (e) {
		metadataValue = undefined; // Default to undefined if parsing fails or JSON is empty
		this.logger.warn(`Invalid or empty JSON in Data field for metadata for item ${itemIndex}: ${(e as Error).message}. Proceeding without metadata.`);
	}

	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection',
		collectionName: collectionName,
		collectionOperation: 'uploadFile',
		data: metadataValue, // Metadata for the file
		binaryPropertyName: binaryPropertyNameValue,
		uploadFileName: uploadFileNameValue,
		binaryData: binaryDataValue,
		base64Data: base64DataValue,
		uploadMethod: uploadMethod,
		filePath: filePathValue,
	};

	return executeNocoBaseApi(apiOptions);
} 