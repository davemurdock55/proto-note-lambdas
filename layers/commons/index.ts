import { ZodSchema, ZodError } from "zod";

// Helper function to send a response back to the client
const sendResponse = (payload: any, statusCode: number = 200, headers: any = { "Content-Type": "application/json" }) => {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload),
  };
};

// Helper function to validate request body using Zod schema
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

// exporting all helper functions
export { sendResponse, validateRequestBody };
