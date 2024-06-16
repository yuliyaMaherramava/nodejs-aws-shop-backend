import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { handler } from "../lambda-functions/getProductById";
import { Product, products } from "../lambda-functions/products";

describe("getProductById", () => {
  it("should return status 200 and the found product", async () => {
    const result = (await handler(
      {
        pathParameters: { id: "1" },
      } as any,
      {} as Context,
      () => {}
    )) as APIGatewayProxyResult;

    const expectedProduct: Product = products[0];

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(expectedProduct));
  });

  it("should return status 404 if a product is not found", async () => {
    const result = (await handler(
      {
        pathParameters: { id: "-11" },
      } as any,
      {} as Context,
      () => {}
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ message: "Product not found" }));
  });

  it("should return status 400 if product id is not provided", async () => {
    const result = (await handler(
      {} as APIGatewayProxyEvent,
      {} as Context,
      () => {}
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({ message: "Product ID is required" })
    );
  });
});
