import * as AWS from "aws-sdk";
import { products, stocks } from "./products";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

AWS.config.update({ region: process.env.CDK_REGION });

const client = new DynamoDBClient({ region: process.env.CDK_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const seedProductTable = async (): Promise<void> => {
  try {
    for (const product of products) {
      await ddbDocClient.send(
        new PutCommand({
          TableName: "products",
          Item: product,
        })
      );
    }
    console.log("Product table populated successfully");
  } catch (error: any) {
    console.error(error.message);
  }
};

const seedStockTable = async (): Promise<void> => {
  try {
    for (const stock of stocks) {
      await ddbDocClient.send(
        new PutCommand({
          TableName: "stocks",
          Item: stock,
        })
      );
    }
    console.log("Stock table populated successfully");
  } catch (error: any) {
    console.error(error.message);
  }
};

seedProductTable();
seedStockTable();
