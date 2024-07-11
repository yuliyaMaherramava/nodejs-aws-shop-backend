import { handler } from "../lambda-functions/catalogBatchProcess"; // Подставьте правильный путь к файлу с функцией
import { SNSClient } from "@aws-sdk/client-sns";
import { Context } from "aws-lambda";

const records = [
  {
    id: "1",
    title: "Product 1",
    description: "Description 1",
    price: 5,
    count: 10,
  },
  {
    id: "2",
    title: "Product 2",
    description: "Description 2",
    price: 15,
    count: 5,
  },
  { id: "", title: "", description: "", price: "invalid", count: "invalid" },
];

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockReturnValue({
    send: jest.fn(),
  }),
  PublishCommand: jest.fn(),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  TransactWriteCommand: jest.fn(),
}));

describe("catalogBatchProcess.test", () => {
  let snsMock: SNSClient;

  beforeEach(() => {
    snsMock = new SNSClient();
    jest.clearAllMocks();
  });

  it("should complete SNS message", async () => {
    await handler(
      {
        Records: [
          { body: JSON.stringify(records[0]) } as any,
          { body: JSON.stringify(records[1]) } as any,
        ],
      },
      {} as Context,
      () => {}
    );

    expect(snsMock.send).toHaveBeenCalledTimes(2);
  });
});
