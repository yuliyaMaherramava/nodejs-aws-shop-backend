import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { handler as importProductsFile } from "../lambda-functions/importProductsFile";

describe("importProductsFile", () => {
  const s3Mock = mockClient(S3Client);
  process.env = {
    ...process.env,
    BUCKET: "mock",
    REGION: "mock",
  };

  beforeEach(() => {
    s3Mock.reset();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return status 200 and the signed url", async () => {
    const name = "TestFileName.csv";

    const result = await importProductsFile({
      queryStringParameters: { queryStringParameters: { name } },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain(`.amazonaws.com/uploaded/${name}`);
  });

  it("should return status 400 if a file name is empty", async () => {
    const result = await importProductsFile({
      queryStringParameters: { queryStringParameters: { name: null } },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify({ message: "Invalid file name" }));
  });
});
