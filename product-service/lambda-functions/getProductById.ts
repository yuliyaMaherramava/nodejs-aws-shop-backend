import {
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE_NAME = "products";
const STOCKS_TABLE_NAME = "stocks";

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Log event", JSON.stringify(event));

    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    const productResponse = await ddbDocClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE_NAME,
        Key: { id },
      })
    );

    const product = productResponse.Item;

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    const stockResponse = await ddbDocClient.send(
      new GetCommand({
        TableName: STOCKS_TABLE_NAME,
        Key: { product_id: id },
      })
    );

    const stock = stockResponse.Item;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id,
        count: stock?.count,
        price: product.price,
        title: product.title,
        description: product.description,
      }),
    };
  } catch (error: any) {
    console.error("Server error while getting product by id", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
