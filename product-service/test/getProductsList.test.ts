import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { handler } from "../lambda-functions/getProductsList";
import { products } from "../lambda-functions/products";

describe("getProductsList", () => {
  it("should return status 200 and all products", async () => {
    const result = (await handler(
      {} as APIGatewayProxyEvent,
      {} as Context,
      () => {}
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(products));
  });
});
