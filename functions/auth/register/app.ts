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
    console.log('***1 Made it to the register function***');
    console.log('event: ', event);
    if (!event.body) {
        return sendResponse({ message: 'Invalid request: No body provided' }, 400);
    }

    console.log('Raw body:', event.body);
    const body = JSON.parse(event.body);
    console.log('Parsed body:', body);

    console.log('***2 About to validate the request body***');
    // validating the body's types and if the body contains those types
    try {
        validateRequestBody(body, registerBodySchema);
    } catch (error) {
        return sendResponse({ message: (error as Error).message }, 400);
    }
    console.log('***3 Finished validating the request body***');
    console.log('body: ', body);

    console.log('***4 About to finish function (find user in DB, hash, etc.)***');
    const foundUser = await getUser(body.username);
    if (foundUser && foundUser.username) {
        return sendResponse({ message: 'User already exists' }, 400);
    }

    const hashedPass = bcrypt.hashSync(body.password.trim(), SALT_ROUND);
    const newUser = {
        name: body.name,
        username: body.username,
        password: hashedPass,
    };
    const saveUserResponse = await saveUser(newUser);
    if (!saveUserResponse) return sendResponse({ message: 'Server Error: Please try again later' }, 400);
    return sendResponse({ message: 'User registered successfully' });
};
