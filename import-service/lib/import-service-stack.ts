import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  RestApi,
  IdentitySource,
  LambdaIntegration,
  TokenAuthorizer,
  AuthorizationType,
} from "aws-cdk-lib/aws-apigateway";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";

const BUCKET_NAME = process.env.BUCKET_NAME!;
const SQS_ARN = process.env.SQS_ARN!;
const SQS_URL = process.env.SQS_URL!;

const CORS_HEADERS = {
  "method.response.header.Content-Type": true,
  "method.response.header.Access-Control-Allow-Origin": true,
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

    const authorizer = new TokenAuthorizer(this, "BasicAuthorizer", {
      handler: basicAuthorizerFunction,
      identitySource: IdentitySource.header("Authorization"),
      assumeRole: new Role(this, "ImportServiceAuthorizerRole", {
        assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      }),
      resultsCacheTtl: cdk.Duration.seconds(0),
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
        authorizationType: AuthorizationType.CUSTOM,
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: CORS_HEADERS,
          },
          {
            statusCode: "401",
            responseParameters: CORS_HEADERS,
          },
          {
            statusCode: "500",
            responseParameters: CORS_HEADERS,
          },
          {
            statusCode: "403",
            responseParameters: CORS_HEADERS,
          },
        ],
      }
    );

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
