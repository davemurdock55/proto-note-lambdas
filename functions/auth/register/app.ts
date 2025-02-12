import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, validateRequestBody } from 'commons';
import { User } from 'auth/types';
import { getUser, saveUser } from 'auth';
import bcrypt from 'bcryptjs';
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

const SALT_ROUND = 8;

const registerBodySchema = z.object({
    name: z.string(),
    username: z.string().email(),
    password: z.string().min(8),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Making sure the request has a body
    if (!event.body) {
        return sendResponse({ message: 'Invalid request: No body provided' }, 400);
    }

    // Parsing the request body
    const body = JSON.parse(event.body);

    // Validating if the request body matches the Zod Schema
    try {
        validateRequestBody(body, registerBodySchema);
    } catch (error) {
        return sendResponse({ message: (error as Error).message }, 400);
    }

    // Checking if the user already exists
    const foundUser = await getUser(body.username);
    if (foundUser && foundUser.username) {
        return sendResponse({ message: 'User already exists' }, 400);
    }

    // Hashing the password
    const hashedPass = bcrypt.hashSync(body.password.trim(), SALT_ROUND);
    // Creating the new User object (to be sent to the database)
    const newUser: User = {
        name: body.name,
        username: body.username,
        password: hashedPass,
    };

    // Saving the new user to the database
    const saveUserResponse = await saveUser(newUser);
    if (!saveUserResponse) return sendResponse({ message: 'Server Error: Please try again later' }, 400);

    // Responding with a success message
    return sendResponse({ message: 'User registered successfully' });
};
