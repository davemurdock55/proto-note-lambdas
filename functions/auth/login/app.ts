import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, validateRequestBody } from 'commons';
import { getUser, generateToken, updateUserTokens } from 'auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginBodySchema = z.object({
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
        validateRequestBody(body, loginBodySchema);
    } catch (error) {
        return sendResponse({ message: (error as Error).message }, 400);
    }

    // Checking if the user already exists
    const foundUser = await getUser(body.username);
    if (!foundUser || !foundUser.username) {
        return sendResponse({ message: "User doesn't exist" }, 400);
    }

    // Checking the stored password against the one provided in the request body
    if (!bcrypt.compareSync(body.password, foundUser.password)) {
        // password doesn't match with the existing password
        return sendResponse({ message: 'Wrong Password' }, 403);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return sendResponse({ message: 'JWT Secret not configured' }, 500);
    }

    const token = generateToken(foundUser.username, jwtSecret); // generate token encapsulating username
    const tokenArray = foundUser.tokens || [];
    tokenArray.push(token); // store the generated token in the database

    if (!token) {
        return sendResponse({ message: 'Token was not properly generated.' }, 500);
    }

    // update the token for the user in the database
    try {
        const response = await updateUserTokens(body.username, tokenArray, foundUser, token);
        return sendResponse({ message: 'User logged in successfully', response }, 200);
    } catch (err) {
        return sendResponse({ message: err }, 400);
    }
};
