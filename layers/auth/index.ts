import AWS from "aws-sdk";
import jwt from "jsonwebtoken";
import { User } from "./types";

const SALT_ROUND = 8;

const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: "us-east-1",
  apiVersion: "2012-08-10",
});

// retrieve user data via username from DynamoDB
const getUser = async (username: User["username"]) => {
  const params = {
    Key: {
      username: username,
    },
    TableName: "login-database",
  };

  return await dynamoDB
    .get(params)
    .promise()
    .then((response) => {
      return response.Item;
    })
    .catch((err) => {
      return err;
    });
};

// save user in DynamoDB
const saveUser = async (user: User) => {
  const params = {
    Item: user,
    TableName: "login-database",
  };
  return await dynamoDB
    .put(params)
    .promise()
    .then(() => {
      return true;
    })
    .catch((err) => {
      return err;
    });
};

// generate a token encapsulating the username (expires after 1 hour)
const generateToken = (username: User["username"], jwtSecret: string) => {
  if (!username) return null;

  return jwt.sign({ username }, jwtSecret, {
    expiresIn: "1h",
  });
};

// verify the validation of the current token
const verifyToken = (username: User["username"], token: string, jwtSecret: string): { verified: boolean; message: string } => {
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

const updateUserTokens = async (username: string, tokenArray: string[], foundUser: User, token: string) => {
  const params = {
    Key: {
      username: username,
    },
    UpdateExpression: `set tokens = :value`,
    ExpressionAttributeValues: {
      ":value": tokenArray,
    },
    TableName: "login-database",
    ReturnValues: "UPDATED_NEW",
  };

  const response = {
    username: foundUser.username,
    name: foundUser.name,
    token: token,
  };

  return await dynamoDB
    .update(params)
    .promise()
    .then(() => response);
};

export { SALT_ROUND, getUser, saveUser, generateToken, verifyToken, updateUserTokens };
