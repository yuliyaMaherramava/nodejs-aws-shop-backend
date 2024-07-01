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

const testStream =
  "title,decsriptionCATAN,Family gameMonopoly,Money based game";

const s3Mock = mockClient(S3Client);
jest.mock("csv-parser", () => jest.fn(() => Readable.from([testStream])));

describe("importFileParser", () => {
  const parameters = {
    Bucket: process.env.BUCKET,
    Key: "uploaded/TestFileName.csv",
  };

  beforeEach(() => s3Mock.reset());

  it("should parse CSV file and delete it from uploaded and copy itr to parsed folder", async () => {
    const bodyStream = new Readable({
      read() {
        this.push(testStream);
      },
    }) as unknown as IncomingMessage & SdkStreamMixin;

    bodyStream.transformToByteArray = jest.fn();
    bodyStream.transformToString = jest.fn();
    bodyStream.transformToWebStream = jest.fn();

    s3Mock.on(GetObjectCommand).resolves({ Body: bodyStream });
    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    await importFileParser({
      Records: [
        {
          s3: {
            bucket: { name: parameters.Bucket },
            object: { key: parameters.Key },
          },
        },
      ],
    } as S3Event);

    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(CopyObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
  });
});
