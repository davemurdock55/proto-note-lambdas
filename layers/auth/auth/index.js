"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUserToken = exports.updateUserTokens = exports.verifyToken = exports.generateToken = exports.saveUser = exports.getUser = exports.SALT_ROUND = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const SALT_ROUND = 8;
exports.SALT_ROUND = SALT_ROUND;
// Initialize DynamoDB clients
const client = new client_dynamodb_1.DynamoDBClient({ region: "us-east-1" });
const dynamoDB = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
// retrieve user data via username from DynamoDB
const getUser = async (username) => {
    const params = {
        TableName: "login-database",
        Key: {
            username: username,
        },
    };
    try {
        const response = await dynamoDB.send(new lib_dynamodb_1.GetCommand(params));
        return response.Item || null;
    }
    catch (err) {
        console.error("Error getting user:", err);
        return null; // Return null instead of an error object
    }
};
exports.getUser = getUser;
// save user in DynamoDB
const saveUser = async (user) => {
    const params = {
        TableName: "login-database",
        Item: user,
    };
    try {
        await dynamoDB.send(new lib_dynamodb_1.PutCommand(params));
        return true;
    }
    catch (err) {
        console.error("Error saving user:", err);
        return false; // Return boolean instead of error
    }
};
exports.saveUser = saveUser;
// generate a token encapsulating the username (expires after 1 hour)
const generateToken = (username, jwtSecret) => {
    if (!username)
        return null;
    return jsonwebtoken_1.default.sign({ username }, jwtSecret, {
        expiresIn: "1h",
    });
};
exports.generateToken = generateToken;
// verify the validation of the current token
const verifyToken = (username, token, jwtSecret) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (decoded.username !== username) {
            return { verified: false, message: "Invalid User" };
        }
        return { verified: true, message: "User is verified" };
    }
    catch (error) {
        return { verified: false, message: "Invalid Token" };
    }
};
exports.verifyToken = verifyToken;
const updateUserTokens = async (username, tokenArray, token) => {
    const params = {
        TableName: "login-database",
        Key: {
            username: username,
        },
        UpdateExpression: `set tokens = :value`,
        ExpressionAttributeValues: {
            ":value": tokenArray,
        },
        ReturnValues: "UPDATED_NEW",
    };
    const response = {
        username: username,
        token: token,
    };
    try {
        await dynamoDB.send(new lib_dynamodb_1.UpdateCommand(params));
        return response;
    }
    catch (err) {
        console.error("Error updating tokens:", err);
        throw err;
    }
};
exports.updateUserTokens = updateUserTokens;
const removeUserToken = async (user, tokenToRemove) => {
    // User is already logged out
    if (!user.tokens || !user.tokens.includes(tokenToRemove)) {
        return {
            success: false,
            message: "User is already logged out",
            statusCode: 400, // Bad request
        };
    }
    // Filter out the token to remove
    const updatedTokens = user.tokens.filter((token) => token !== tokenToRemove);
    // Update the user's tokens in the database
    const params = {
        TableName: "login-database",
        Key: {
            username: user.username,
        },
        UpdateExpression: `set tokens = :value`,
        ExpressionAttributeValues: {
            ":value": updatedTokens,
        },
        ReturnValues: "UPDATED_NEW",
    };
    // Return a structured response
    try {
        await dynamoDB.send(new lib_dynamodb_1.UpdateCommand(params));
        return {
            success: true,
            username: user.username,
            statusCode: 200, // OK
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to update tokens: ${err.message}`,
            statusCode: 500, // Internal server error
        };
    }
};
exports.removeUserToken = removeUserToken;
