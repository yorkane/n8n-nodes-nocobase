import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

/**
 * Safely parses a parameter that can be either a JSON string or an object.
 * This function handles both traditional string JSON parameters and objects passed directly by AI Agents.
 *
 * @param rawData - The raw parameter value (string or object)
 * @param paramName - The name of the parameter (for error messages)
 * @param itemIndex - The current item index (for error messages)
 * @param node - The IExecuteFunctions instance
 * @returns The parsed object, or undefined if the input is empty
 * @throws NodeOperationError if the input is invalid
 */
export function safeParseJsonParameter(
	rawData: string | object,
	paramName: string,
	itemIndex: number,
	node: IExecuteFunctions,
): object | undefined {
	// If rawData is already an object (AI Agent passing objects directly)
	if (typeof rawData === 'object' && rawData !== null) {
		// Check if it's an empty object
		if (Object.keys(rawData).length === 0) {
			return undefined;
		}
		return rawData;
	}

	// If rawData is a string, we need to parse it
	if (typeof rawData === 'string') {
		// Check for [object Object] - a common error when objects are improperly stringified
		if (rawData === '[object Object]') {
			throw new NodeOperationError(
				node.getNode(),
				`Invalid ${paramName}: Received "[object Object]" which indicates an object was improperly stringified. Please ensure you're passing a valid JSON string or object directly.`,
				{ itemIndex },
			);
		}

		// Handle empty string
		if (rawData.trim() === '' || rawData === '{}') {
			return undefined;
		}

		// Try to parse the JSON string
		try {
			const parsed = JSON.parse(rawData);

			// Ensure the parsed result is an object
			if (typeof parsed !== 'object' || parsed === null) {
				throw new NodeOperationError(
					node.getNode(),
					`Invalid ${paramName}: Expected an object, but got ${typeof parsed}`,
					{ itemIndex },
				);
			}

			// Check if it's an empty object
			if (Object.keys(parsed).length === 0) {
				return undefined;
			}

			return parsed;
		} catch (e) {
			// If it's already a NodeOperationError, re-throw it
			if (e instanceof NodeOperationError) {
				throw e;
			}

			// Otherwise, wrap the JSON parse error
			throw new NodeOperationError(
				node.getNode(),
				`Invalid JSON in ${paramName} field: ${(e as Error).message}`,
				{ itemIndex },
			);
		}
	}

	// If rawData is neither string nor object (e.g., number, boolean, etc.)
	throw new NodeOperationError(
		node.getNode(),
		`Invalid ${paramName}: Expected a JSON string or object, but got ${typeof rawData}`,
		{ itemIndex },
	);
}
