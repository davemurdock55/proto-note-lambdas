import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { getUser, TokenVerificationResult, verifyToken } from 'auth';
import jwt from 'jsonwebtoken';

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    try {
        // Extract token from header
        const authHeader = event.headers?.Authorization || '';
        if (!authHeader) {
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        // Parse token (assuming format: "Bearer token")
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

        // Decode token to get username
        const decoded: any = jwt.decode(token);
        if (!decoded || !decoded.username) {
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        const username = decoded.username;

        // Get JWT secret and verify
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT Secret not configured');
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        // Verify token validity
        const verificationResponse: TokenVerificationResult = verifyToken(username, token, jwtSecret);
        if (!verificationResponse.verified) {
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        // Verify user exists and token is valid
        const foundUser = await getUser(username);
        if (!foundUser || !foundUser.tokens?.includes(token)) {
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        // User is authenticated, return Allow policy
        return generatePolicy(username, 'Allow', event.methodArn, {
            username,
            name: foundUser.name,
        });
    } catch (error) {
        console.error('Authorization error:', error);
        return generatePolicy('user', 'Deny', event.methodArn);
    }
};

// Helper function to generate policy document
function generatePolicy(
    principalId: string,
    effect: 'Allow' | 'Deny',
    resource: string,
    context?: Record<string, any>,
): APIGatewayAuthorizerResult {
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource,
            },
        ],
    };

    const response: APIGatewayAuthorizerResult = {
        principalId,
        policyDocument,
        context,
    };

    return response;
}
