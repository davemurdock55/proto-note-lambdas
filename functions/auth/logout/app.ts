import { getUser, removeUserToken } from 'auth';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAndValidateBody, sendResponse } from 'commons';
import { z } from 'zod';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

// Define schema for logout request
const logoutBodySchema = z.object({
    username: z.string().email(),
    token: z.string().min(1),
});

// Define type for logout body
type LogoutBody = z.infer<typeof logoutBodySchema>;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Parse and validate in one step
    const validatedResult = parseAndValidateBody<LogoutBody>(event, logoutBodySchema, ['username', 'token']);

    // If result is an error response, return it
    if ('statusCode' in validatedResult) {
        return validatedResult;
    }

    // Extract validated data
    const { username, token } = validatedResult.body;

    const foundUser = await getUser(username);
    if (!foundUser || !foundUser.username) {
        // user doesn't exist in database
        return sendResponse({ message: "User doesn't exist" }, 404);
    }

    try {
        const result = await removeUserToken(foundUser, token);

        if (!result.success) {
            return sendResponse({ message: result.message || 'Error during logout process' }, result.statusCode);
        }

        // Return success response
        return sendResponse({ message: 'Logged out successfully' }, 200);
    } catch (error) {
        console.error('Error updating user tokens:', error);
        return sendResponse({ message: `Error during logout process` }, 500);
    }
};
