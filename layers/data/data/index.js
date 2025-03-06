"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRecord = exports.updateRecord = exports.putRecord = exports.getRecord = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Initialize DynamoDB clients
const client = new client_dynamodb_1.DynamoDBClient({ region: "us-east-1" });
const dynamoDB = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
// Helper function to get a record by key
const getRecord = async (tableName, key) => {
    const params = {
        TableName: tableName,
        Key: key,
    };
    try {
        const response = await dynamoDB.send(new lib_dynamodb_1.GetCommand(params));
        return response.Item;
    }
    catch (error) {
        console.error("Error getting record:", error);
        throw error;
    }
};
exports.getRecord = getRecord;
// Helper function to put a record
const putRecord = async (tableName, item) => {
    const params = {
        TableName: tableName,
        Item: item,
    };
    try {
        await dynamoDB.send(new lib_dynamodb_1.PutCommand(params));
        return true;
    }
    catch (error) {
        console.error("Error putting record:", error);
        throw error;
    }
};
exports.putRecord = putRecord;
// Helper function to update a record
const updateRecord = async (tableName, key, updateExpression, expressionAttributeValues) => {
    const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "UPDATED_NEW",
    };
    try {
        const response = await dynamoDB.send(new lib_dynamodb_1.UpdateCommand(params));
        return response.Attributes;
    }
    catch (error) {
        console.error("Error updating record:", error);
        throw error;
    }
};
exports.updateRecord = updateRecord;
// Helper function to delete a record
const deleteRecord = async (tableName, key) => {
    const params = {
        TableName: tableName,
        Key: key,
    };
    try {
        await dynamoDB.send(new lib_dynamodb_1.DeleteCommand(params));
        return true;
    }
    catch (error) {
        console.error("Error deleting record:", error);
        throw error;
    }
};
exports.deleteRecord = deleteRecord;
