import jwt from "jsonwebtoken";
import { User } from "./types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";

const SALT_ROUND = 8;

// Initialize DynamoDB clients
const client = new DynamoDBClient({ region: "us-east-1" });
const dynamoDB = DynamoDBDocumentClient.from(client);

// retrieve user data via username from DynamoDB
const getUser = async (username: User["username"]): Promise<User | null> => {
  const params = {
    TableName: "login-database",
    Key: {
      username: username,
    },
  };

  try {
    const response = await dynamoDB.send(new GetCommand(params));
    return (response.Item as User) || null;
  } catch (err) {
    console.error("Error getting user:", err);
    return null; // Return null instead of an error object
  }
};

// save user in DynamoDB
const saveUser = async (user: User): Promise<boolean> => {
  const params = {
    TableName: "login-database",
    Item: user,
  };

  try {
    await dynamoDB.send(new PutCommand(params));
    return true;
  } catch (err) {
    console.error("Error saving user:", err);
    return false; // Return boolean instead of error
  }
};

// generate a token encapsulating the username (expires after 1 hour)
const generateToken = (username: User["username"], jwtSecret: string) => {
  if (!username) return null;

  return jwt.sign({ username }, jwtSecret, {
    expiresIn: "1h",
  });
};

export interface TokenVerificationResult {
  verified: boolean;
  message: string;
}

// verify the validation of the current token
const verifyToken = (username: User["username"], token: string, jwtSecret: string): TokenVerificationResult => {
  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    if (decoded.username !== username) {
      return { verified: false, message: "Invalid User" };
    }
    return { verified: true, message: "User is verified" };
  } catch (error) {
    return { verified: false, message: "Invalid Token" };
  }
};

const updateUserTokens = async (username: string, tokenArray: string[], token: string) => {
  const params: UpdateCommandInput = {
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
    await dynamoDB.send(new UpdateCommand(params));
    return response;
  } catch (err) {
    console.error("Error updating tokens:", err);
    throw err;
  }
};

type TokenRemovalResponse = {
  success: boolean;
  username?: string;
  message?: string;
  statusCode: number;
};

const removeUserToken = async (user: User, tokenToRemove: string): Promise<TokenRemovalResponse> => {
  // User is already logged out
  if (!user.tokens || !user.tokens.includes(tokenToRemove)) {
    return {
      success: false,
      message: "User is already logged out",
      statusCode: 400, // Bad request
    } as TokenRemovalResponse;
  }

  // Filter out the token to remove
  const updatedTokens = user.tokens.filter((token: string) => token !== tokenToRemove);

  // Update the user's tokens in the database
  const params: UpdateCommandInput = {
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
    await dynamoDB.send(new UpdateCommand(params));
    return {
      success: true,
      username: user.username,
      statusCode: 200, // OK
    } as TokenRemovalResponse;
  } catch (err) {
    return {
      success: false,
      message: `Failed to update tokens: ${(err as Error).message}`,
      statusCode: 500, // Internal server error
    } as TokenRemovalResponse;
  }
};

export { SALT_ROUND, getUser, saveUser, generateToken, verifyToken, updateUserTokens, removeUserToken };
