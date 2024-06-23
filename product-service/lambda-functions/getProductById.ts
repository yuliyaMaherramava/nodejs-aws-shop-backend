import {
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
} from "aws-lambda";
import { products } from "./products";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler: APIGatewayProxyHandler = async ({
  pathParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Product ID is required" }),
    };
  }

  const product = products.find((product) => product.id === id);

  if (!product) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: "Product not found" }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(product),
  };
};
