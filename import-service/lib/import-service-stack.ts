import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  RestApi,
  LambdaIntegration,
  TokenAuthorizer,
  IdentitySource,
} from "aws-cdk-lib/aws-apigateway";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";

const BUCKET_NAME = process.env.BUCKET_NAME!;
const SQS_ARN = process.env.SQS_ARN!;
const SQS_URL = process.env.SQS_URL!;

const headers = {
  "Access-Control-Allow-Origin": "'*'",
  "Access-Control-Allow-Headers":
    "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
  "Access-Control-Allow-Methods": "'OPTIONS,GET,PUT'",
};

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = Bucket.fromBucketName(
      this,
      "ImportServiceBucket",
      BUCKET_NAME
    );

    const importProductsFileFunction = new lambda.Function(
      this,
      "ImportProductsFile",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "importProductsFile.handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    const importFileParserFunction = new lambda.Function(
      this,
      "ImportFileParser",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "importFileParser.handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SQS_URL,
        },
      }
    );

    const basicAuthorizerFunction = lambda.Function.fromFunctionArn(
      this,
      "BasicAuthorizerHandler",
      cdk.Fn.importValue("basicAuthorizerFunctionArn")
    );

    const authAssumeRole = new Role(this, "authRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });

    authAssumeRole.addToPolicy(
      new PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [basicAuthorizerFunction.functionArn],
      })
    );

    const authorizer = new TokenAuthorizer(this, "BasicAuthorizer", {
      handler: basicAuthorizerFunction,
      assumeRole: authAssumeRole,
      identitySource: IdentitySource.header("Authorization"),
    });

    bucket.grantReadWrite(importProductsFileFunction);
    bucket.grantReadWrite(importFileParserFunction);

    const api = new RestApi(this, "ImportApi", {
      restApiName: "Import Files Service",
      description: "For importing csv files",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["*"],
        allowHeaders: ["*"],
        allowCredentials: true,
      },
    });

    const importResource = api.root.addResource("import");

    importResource.addMethod(
      "GET",
      new LambdaIntegration(importProductsFileFunction),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
        authorizer,
      }
    );

    api.addGatewayResponse("GatewayResponseUnauthorized", {
      type: cdk.aws_apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: headers,
      statusCode: "401",
    });

    api.addGatewayResponse("GatewayResponseAccessDenied", {
      type: cdk.aws_apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: headers,
      statusCode: "403",
    });

    bucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(importFileParserFunction),
      { prefix: "uploaded/" }
    );

    const productServiceQueue = Queue.fromQueueArn(
      this,
      "ProductServiceQueue",
      SQS_ARN
    );

    productServiceQueue.grantSendMessages(importFileParserFunction);
  }
}
