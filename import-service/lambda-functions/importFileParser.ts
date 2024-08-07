import type { APIGatewayProxyResult, S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Readable } from "stream";
import * as csvParser from "csv-parser";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const BUCKET_NAME = process.env.BUCKET_NAME;
const SQS_URL = process.env.SQS_URL;

const s3Client = new S3Client();
const sqsClient = new SQSClient({ region: process.env.CDK_REGION });

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
      const result = await s3Client.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
      );

      if (!result.Body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Invalid body of request" }),
        };
      }

      const productRows = await parseFile(result.Body as Readable);
      try {
        let sqsPromises = productRows.map((product: Product) =>
          sqsClient.send(
            new SendMessageCommand({
              QueueUrl: SQS_URL,
              MessageBody: JSON.stringify(product),
            })
          )
        );

        await Promise.all(sqsPromises);
        console.log(
          "SQS messages of parsed products sent successfully",
          productRows
        );
      } catch (error) {
        console.error("Error sending SQS message", error);
      }

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${key}`,
          Key: key.replace("uploaded", "parsed"),
        })
      );

      console.log("A csv file has been copied to the folder parsed");

      await s3Client.send(
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

async function parseFile(readableStream: Readable): Promise<any> {
  return new Promise((resolve, reject) => {
    const products: Product[] = [];
    readableStream
      .pipe(csvParser({ separator: ";" }))
      .on("data", (row) => {
        products.push(row);
      })
      .on("end", () => resolve(products))
      .on("error", (error) => reject(error));
  });
}
