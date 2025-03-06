import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, validateRequestBody } from 'commons';
import { getUser, verifyToken } from 'auth';
import { z } from 'zod';
// import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const verifyBodySchema = z.object({
    username: z.string().email(),
    token: z.string().min(8),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Making sure the request has a body
    if (!event.body) {
        return sendResponse({ message: 'Invalid request: No body provided' }, 400);
    }

    // Parsing the request body
    const body = JSON.parse(event.body);

    if (!body.username || !body.token) {
        return sendResponse({ verified: false, message: 'Missing required fields' }, 400);
    }

    // Validating if the request body matches the Zod Schema
    try {
        validateRequestBody(body, verifyBodySchema);
    } catch (error) {
        return sendResponse({ message: (error as Error).message }, 400);
    }

    const username = body.username;
    const token = body.token;

    // getting the JWT secret from AWS Secrets Manager
    //     const secret_name = 'wiki-realms/JWT_Token';
    //
    //     const client = new SecretsManagerClient({
    //         region: 'us-east-1',
    //     });
    //
    //     let response;
    //
    //     try {
    //         response = await client.send(
    //             new GetSecretValueCommand({
    //                 SecretId: secret_name,
    //                 VersionStage: 'AWSCURRENT', // VersionStage defaults to AWSCURRENT if unspecified
    //             }),
    //         );
    //     } catch (error) {
    //         // For a list of exceptions thrown, see
    //         // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    //         throw error;
    //     }
    //
    //     const secret = response.SecretString;
    //
    //     if (!secret) return sendResponse({ verified: false, message: 'Secret not found' }, 500);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return sendResponse({ message: 'JWT Secret not configured' }, 500);
    }

    // verify the validation of the current token
    const verificationResponse = verifyToken(username, token, jwtSecret);
    if (!verificationResponse.verified) return sendResponse(verificationResponse, 401);

    const foundUser = await getUser(username);
    if (!foundUser) {
        return sendResponse({ verified: false, message: 'User not found' }, 404);
    } else if (!foundUser.username || !foundUser.tokens) {
        return sendResponse({ verified: false, message: 'User record is incomplete' }, 500);
    }
    if (!foundUser.tokens.includes(token))
        return sendResponse({ verified: false, message: 'User is not authenticated' }, 401);

    return sendResponse({
        verified: true,
        message: 'success',
        username,
        token,
    });
};
