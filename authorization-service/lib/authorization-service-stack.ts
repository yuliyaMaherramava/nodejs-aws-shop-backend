import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import "dotenv/config";

const AUTH_GITHUB_DEFAULT_PASSWORD =
  process.env.yuliyaMaherramava || "TEST_PASSWORD";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerFunction = new lambda.Function(
      this,
      "BasicAuthorizerHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "basicAuthorizer.handler",
        environment: {
          yuliyaMaherramava: AUTH_GITHUB_DEFAULT_PASSWORD,
        },
      }
    );

    new cdk.CfnOutput(this, "basicAuthorizerFunctionArn", {
      value: basicAuthorizerFunction.functionArn,
      exportName: "basicAuthorizerFunctionArn",
    });
  }
}
