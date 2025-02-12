import AWS from "aws-sdk";
import { User } from "./types";

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

export { getUser, saveUser };
