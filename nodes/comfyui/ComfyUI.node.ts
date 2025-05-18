import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export class ComyUINode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI Node',
		name: 'ComyUI',
		icon: 'file:comfyui.svg',
		group: ['transform'], // Or a more appropriate group like 'ai', 'image'
		version: 1,
		description: 'Interacts with a ComfyUI instance',
		defaults: {
			name: 'ComfyUI Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [],
		requestDefaults: {
			// baseURL: 'http://localhost:8188', // Default ComfyUI server address
			// headers: {
			// 	Accept: 'application/json',
			// 	'Content-Type': 'application/json',
			// },
		},
		properties: [
			// Define properties for ComfyUI interaction
			// Example: ComfyUI server URL, workflow ID, input parameters
			{
				displayName: 'ComfyUI Server URL',
				name: 'serverUrl',
				type: 'string',
				default: 'http://127.0.0.1:8188',
				placeholder: 'http://localhost:8188',
				description: 'The URL of your ComfyUI server',
				required: true,
			},
			{
				displayName: 'Workflow API JSON',
				name: 'workflowApiJson',
				type: 'json',
				default: '',
				placeholder: 'Paste your ComfyUI API Workflow JSON here',
				description: 'The JSON representation of the ComfyUI workflow (API format)',
				typeOptions: {
					rows: 10,
				},
				required: true,
			},
			{
				displayName: 'Inputs',
				name: 'inputs',
				type: 'json',
				default: '{}',
				description: 'Inputs for the ComfyUI workflow, as a JSON object. E.g.',
				typeOptions: {
					rows: 5,
				},
				required: true,
			},
		],
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Implement the logic to interact with ComfyUI
		// Example: Send a request to the ComfyUI server, process the response, etc.
		// For now, just return the input data
		const items = this.getInputData();
		return [items];
	}
}

export { ComyUINode as ComfyUI };