import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, parseAndValidateBody } from 'commons';
import { User } from 'auth/types';
import { SALT_ROUND, getUser, saveUser } from 'auth';
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

const registerBodySchema = z.object({
    name: z.string(),
    username: z.string().email(),
    password: z.string().min(8),
});

// Define type for register body
type RegisterBody = z.infer<typeof registerBodySchema>;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Parse and validate in one step
    const validatedResult = parseAndValidateBody<RegisterBody>(event, registerBodySchema, [
        'name',
        'username',
        'password',
    ]);

    // If result is an error response, return it
    if ('statusCode' in validatedResult) {
        return validatedResult;
    }

    // Extract validated data
    const { name, username, password } = validatedResult.body;

    // Checking if the user already exists
    const foundUser = await getUser(username);
    if (foundUser && foundUser.username) {
        return sendResponse({ message: 'User already exists' }, 400);
    }

    // Hashing the password
    const hashedPass = bcrypt.hashSync(password.trim(), SALT_ROUND);
    // Creating the new User object (to be sent to the database)
    const newUser: User = {
        name: name,
        username: username,
        password: hashedPass,
    };

    // Saving the new user to the database
    try {
        const saveUserResponse = await saveUser(newUser);
        if (!saveUserResponse) {
            console.error('Error saving user:', saveUserResponse);
            return sendResponse({ message: 'Server Error: Please try again later' }, 500);
        }
    } catch (error) {
        console.error('Error saving user:', error);
        return sendResponse({ message: 'Server Error: Please try again later' }, 500);
    }
    // Responding with a success message
    return sendResponse({ message: 'User registered successfully' });
};
