import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { S3Event } from "aws-lambda";
import { handler as importFileParser } from "../lambda-functions/importFileParser";
import { Readable } from "stream";
import { IncomingMessage } from "http";
import { SdkStreamMixin } from "@aws-sdk/types";

const s3Mock = mockClient(S3Client);

jest.mock("csv-parser", () =>
  jest.fn(() => Readable.from(["name,age\nJohn,30\nDoe,40"]))
);

const createS3Event = (bucket: string, key: string): S3Event =>
  ({
    Records: [
      {
        s3: {
          bucket: { name: bucket },
          object: { key: key },
        },
      },
    ],
  } as S3Event);

describe("importFileParser", () => {
  const parameters = {
    Bucket: process.env.BUCKET,
    Key: "uploaded/TestFileName.csv",
  };

  beforeEach(() => {
    s3Mock.reset();
  });

  it("should process the CSV file and move it to the parsed folder", async () => {
    const bodyStream = new Readable({
      read() {
        this.push("name,age\nJohn,30\nDoe,40");
        this.push(null);
      },
    }) as unknown as IncomingMessage & SdkStreamMixin;

    bodyStream.transformToByteArray = jest.fn();
    bodyStream.transformToString = jest.fn();
    bodyStream.transformToWebStream = jest.fn();

    s3Mock.on(GetObjectCommand).resolves({ Body: bodyStream });
    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    const event = createS3Event(parameters.Bucket as string, parameters.Key);
    await importFileParser(event);

    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(GetObjectCommand, parameters)).toHaveLength(1);

    expect(s3Mock.commandCalls(CopyObjectCommand)).toHaveLength(1);
    expect(
      s3Mock.commandCalls(CopyObjectCommand, {
        Bucket: parameters.Bucket,
        CopySource: `${parameters.Bucket}/${parameters.Key}`,
        Key: parameters.Key.replace("uploaded/", "parsed/"),
      })
    ).toHaveLength(1);

    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(DeleteObjectCommand, parameters)).toHaveLength(
      1
    );
  });
});
