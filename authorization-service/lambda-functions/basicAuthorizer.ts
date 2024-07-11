import type {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  Callback,
  Context,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _ctx: Context,
  cb: Callback
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Log event", JSON.stringify(event));

  const { type, authorizationToken, methodArn } = event;

  if (type !== "TOKEN" || !authorizationToken) {
    console.log("Unauthorized: Missing token");
    throw new Error("Unauthorized");
  }

  try {
    console.log(`authorizationToken`, authorizationToken);
    const [, encodedCreds] = authorizationToken.split(" ");
    const buff = Buffer.from(encodedCreds, "base64");
    const [username, password] = buff.toString("utf-8").split(":");

    console.log(`Username: ${username}, Password: ${password}`);

    const storedUserPassword = process.env[username];

    if (!storedUserPassword || storedUserPassword != password) {
      console.log("Forbidden access");
      return generatePolicy(authorizationToken, methodArn, "Deny");
    }

    return generatePolicy(authorizationToken, methodArn, "Allow");
  } catch (error) {
    console.error("Error", error);
    throw new Error("Unauthorized");
  }
};

const generatePolicy = (
  principalId: string,
  resource: string,
  effect: "Allow" | "Deny"
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
