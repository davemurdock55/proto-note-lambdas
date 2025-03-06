import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, parseAndValidateBody } from 'commons';
import { getUser, generateToken, updateUserTokens } from 'auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginBodySchema = z.object({
    username: z.string().email(),
    password: z.string().min(8),
});

// Define type for login body
type LoginBody = z.infer<typeof loginBodySchema>;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Validating if the request body matches the Zod Schema and has all the required fields
    const validatedResult = parseAndValidateBody<LoginBody>(event, loginBodySchema, ['username', 'password']);

    // If result is an error response, return it
    if ('statusCode' in validatedResult) {
        return validatedResult;
    }

    // Extract validated data
    const { username, password } = validatedResult.body;

    // Checking if the user already exists
    const foundUser = await getUser(username);
    if (!foundUser || !foundUser.username) {
        return sendResponse({ message: "User doesn't exist" }, 400);
    }

    // Checking the stored password against the one provided in the request body
    if (!bcrypt.compareSync(password, foundUser.password)) {
        // password doesn't match with the existing password
        return sendResponse({ message: 'Wrong Password' }, 403);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return sendResponse({ message: 'JWT Secret not configured' }, 500);
    }

    // generate token encapsulating username
    const token = generateToken(foundUser.username, jwtSecret);

    if (!token) {
        return sendResponse({ message: 'Token was not properly generated.' }, 500);
    }

    const tokenArray = foundUser.tokens || [];
    tokenArray.push(token); // store the generated token in the database

    if (!token) {
        return sendResponse({ message: 'Token was not properly generated.' }, 500);
    }

    // update the token for the user in the database
    try {
        const response = await updateUserTokens(username, tokenArray, token);
        return sendResponse({ message: 'User logged in successfully', response }, 200);
    } catch (err) {
        return sendResponse({ message: err }, 400);
    }
};
