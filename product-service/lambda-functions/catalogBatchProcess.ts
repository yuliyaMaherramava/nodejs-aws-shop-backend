import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSEvent, SQSHandler } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 } from "uuid";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log("Log event", JSON.stringify(event));

  for (const record of event.Records) {
    console.log("Record", JSON.stringify(record));

    try {
      const body = JSON.parse(record.body);
      const id = v4();
      const { title, description, price, count } = body;

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

      console.log(`Product saved successfully ${title} - ${id}`);

      await snsClient.send(
        new PublishCommand({
          Subject: "New product added",
          Message: JSON.stringify({ title, id }),
          TopicArn: SNS_TOPIC_ARN,
          MessageAttributes: {
            price: {
              DataType: "Number",
              StringValue: String(price),
            },
          },
        })
      );

      console.log("SNS message sent successfully");
    } catch (error) {
      console.error("Internal error", JSON.stringify(record), error);
    }
  }
};
