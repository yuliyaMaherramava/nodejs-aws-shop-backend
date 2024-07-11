import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME;

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Log event", JSON.stringify(event));

    const allProducts = await ddbDocClient.send(
      new ScanCommand({ TableName: PRODUCTS_TABLE_NAME })
    );

    const allStocks = await ddbDocClient.send(
      new ScanCommand({ TableName: STOCKS_TABLE_NAME })
    );

    const products = allProducts.Items || [];
    const stocks = allStocks.Items || [];

    if (!products.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([]),
      };
    }

    const productsWithStocks = products.map((product) => ({
      ...product,
      count:
        stocks.find((stock) => stock.product_id === product.id)?.count ?? 0,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(productsWithStocks),
      headers,
    };
  } catch (error: any) {
    console.error("server error while getting list of products", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
