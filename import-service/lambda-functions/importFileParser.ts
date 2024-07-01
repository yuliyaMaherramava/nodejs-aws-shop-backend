import type { APIGatewayProxyResult, S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as csvParser from "csv-parser";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const BUCKET_NAME = process.env.BUCKET_NAME;

const client = new S3Client();

interface Product {
  title: string;
  description: string;
  price: number;
  count: number;
}

export const handler = async (
  event: S3Event
): Promise<APIGatewayProxyResult> => {
  console.log("Log: ", JSON.stringify(event));

  for (const record of event.Records) {
    const key = record.s3.object.key;

    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
      );

      if (!result.Body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Invalid body of request" }),
        };
      }

      const readableStream = result.Body as Readable;

      const csvData = await new Promise((resolve, reject): void => {
        const products: Product[] = [];
        readableStream
          .pipe(csvParser({ separator: ";" }))
          .on("data", (data) => {
            products.push(data);
            console.log(data);
          })
          .on("end", () => resolve(products))
          .on("error", reject);
      });

      console.log("csvData"), csvData;

      const newKey = key.replace("uploaded", "parsed");

      await client.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${key}`,
          Key: newKey,
        })
      );

      console.log("A csv file has been copied to the folder parsed");

      await client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );

      console.log("A csv file has been deleted from the folder uploaded");
    } catch (error) {
      console.error("Internal server error:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: "Internal server error" }),
      };
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: "Parsing file has been successfull" }),
  };
};
