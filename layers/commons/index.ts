import { ZodSchema, ZodError } from "zod";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/**
 * Helper function to send a standardized response back to the client
 * @param payload - The data to send in the response body
 * @param statusCode - HTTP status code (defaults to 200)
 * @param headers - HTTP headers (defaults to application/json)
 * @returns API Gateway formatted response object
 */
const sendResponse = (payload: any, statusCode: number = 200, headers: any = { "Content-Type": "application/json" }) => {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload),
  };
};

/**
 * Helper function to validate request body using Zod schema
 * @param body - The request body to validate
 * @param schema - Zod schema to validate against
 * @throws Error if validation fails
 */
const validateRequestBody = (body: any, schema: ZodSchema): void => {
  try {
    schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
    }
    throw error;
  }
};

/**
 * Helper function to parse and validate request body
 * @param event - API Gateway event
 * @param schema - Zod schema to validate against
 * @param requiredFields - Array of required field names
 * @returns Parsed and validated body object
 */
const parseAndValidateBody = <T>(event: APIGatewayProxyEvent, schema: ZodSchema, requiredFields: string[] = []): { body: T } | APIGatewayProxyResult => {
  // Check if body exists
  if (!event.body) {
    return sendResponse({ message: "Invalid request: No body provided" }, 400);
  }

  // Parse request body
  try {
    const body = JSON.parse(event.body) as T;

    // Check for required fields
    for (const field of requiredFields) {
      if (body[field as keyof T] === undefined || body[field as keyof T] === null) {
        return sendResponse({ message: `Missing required field: ${field}` }, 400);
      }
    }

    // Validate against schema
    try {
      validateRequestBody(body, schema);
      return { body };
    } catch (error) {
      return sendResponse({ message: (error as Error).message }, 400);
    }
  } catch (error) {
    return sendResponse({ message: "Invalid JSON in request body" }, 400);
  }
};

// exporting all helper functions
export { sendResponse, validateRequestBody, parseAndValidateBody };
