import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 } from "uuid";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || "products";
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || "stocks";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Log event", JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || "{}");
    const id = v4();
    const { title, description, price, count } = body;

    const isInvalidInputData = !title || !description || !count || !price;

    if (isInvalidInputData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid input data" }),
      };
    }

    const params = {
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS_TABLE_NAME,
            Item: { id, title, description, price },
          },
        },
        {
          Put: {
            TableName: STOCKS_TABLE_NAME,
            Item: { product_id: id, count },
          },
        },
      ],
    };

    await ddbDocClient.send(new TransactWriteCommand(params));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Product created successfully" }),
    };
  } catch (error: any) {
    console.error("Sever error while creating a new product:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
