import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB clients
const client = new DynamoDBClient({ region: "us-east-1" });
const dynamoDB = DynamoDBDocumentClient.from(client);

// Helper function to get a record by key
export const getRecord = async (tableName: string, key: Record<string, any>) => {
  const params = {
    TableName: tableName,
    Key: key,
  };

  try {
    const response = await dynamoDB.send(new GetCommand(params));
    return response.Item;
  } catch (error) {
    console.error("Error getting record:", error);
    throw error;
  }
};

// Helper function to put a record
export const putRecord = async (tableName: string, item: Record<string, any>) => {
  const params = {
    TableName: tableName,
    Item: item,
  };

  try {
    await dynamoDB.send(new PutCommand(params));
    return true;
  } catch (error) {
    console.error("Error putting record:", error);
    throw error;
  }
};

// Helper function to update a record
export const updateRecord = async (tableName: string, key: Record<string, any>, updateExpression: string, expressionAttributeValues: Record<string, any>) => {
  const params: UpdateCommandInput = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const response = await dynamoDB.send(new UpdateCommand(params));
    return response.Attributes;
  } catch (error) {
    console.error("Error updating record:", error);
    throw error;
  }
};

// Helper function to delete a record
export const deleteRecord = async (tableName: string, key: Record<string, any>) => {
  const params = {
    TableName: tableName,
    Key: key,
  };

  try {
    await dynamoDB.send(new DeleteCommand(params));
    return true;
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
};
