import AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: "us-east-1",
  apiVersion: "2012-08-10",
});

// Helper function to get a record by key
export const getRecord = async (tableName: string, key: AWS.DynamoDB.DocumentClient.Key) => {
  const params = {
    TableName: tableName,
    Key: key,
  };

  try {
    const response = await dynamoDB.get(params).promise();
    return response.Item;
  } catch (error) {
    console.error("Error getting record:", error);
    throw error;
  }
};

// Helper function to put a record
export const putRecord = async (tableName: string, item: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap) => {
  const params = {
    TableName: tableName,
    Item: item,
  };

  try {
    await dynamoDB.put(params).promise();
    return true;
  } catch (error) {
    console.error("Error putting record:", error);
    throw error;
  }
};

// Helper function to update a record
export const updateRecord = async (
  tableName: string,
  key: AWS.DynamoDB.DocumentClient.Key,
  updateExpression: string,
  expressionAttributeValues: AWS.DynamoDB.DocumentClient.ExpressionAttributeValueMap
) => {
  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const response = await dynamoDB.update(params).promise();
    return response.Attributes;
  } catch (error) {
    console.error("Error updating record:", error);
    throw error;
  }
};

// Helper function to delete a record
export const deleteRecord = async (tableName: string, key: AWS.DynamoDB.DocumentClient.Key) => {
  const params = {
    TableName: tableName,
    Key: key,
  };

  try {
    await dynamoDB.delete(params).promise();
    return true;
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
};
