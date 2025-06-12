import { IExecuteFunctions } from 'n8n-workflow';
import { executeNocoBaseApi, NocoBaseRequestOptions } from '../query';

export async function handleGetServerInfo(
	this: IExecuteFunctions,
	baseUrl: string,
	token: string,
): Promise<any> {
	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection',
		collectionOperation: 'getServerInfo',
	};
	return executeNocoBaseApi(apiOptions);
}

export async function handleListCustomCollections(
	this: IExecuteFunctions,
	baseUrl: string,
	token: string,
): Promise<any> {
	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection',
		collectionOperation: 'listCustom',
	};
	return executeNocoBaseApi(apiOptions);
}

export async function handleListUsers(
	this: IExecuteFunctions,
	baseUrl: string,
	token: string,
): Promise<any> {
	// If listUsers supports query parameters like pagination, they should be handled here.
	// For now, assuming no specific parameters beyond the operation itself.
	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection',
		collectionOperation: 'listUsers',
	};
	return executeNocoBaseApi(apiOptions);
}

export async function handleListWorkflows(
	this: IExecuteFunctions,
	baseUrl: string,
	token: string,
): Promise<any> {
	const apiOptions: NocoBaseRequestOptions = {
		node: this,
		baseUrl,
		token,
		resource: 'collection',
		collectionOperation: 'listWorkflows',
	};
	return executeNocoBaseApi(apiOptions);
} 