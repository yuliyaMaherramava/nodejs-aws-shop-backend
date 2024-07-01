import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";

const BUCKET_NAME = process.env.BUCKET_NAME!;

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(
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
        },
      }
    );

    bucket.grantReadWrite(importProductsFileFunction);
    bucket.grantReadWrite(importFileParserFunction);

    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Files Service",
      description: "For importing csv files",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    const importResource = api.root.addResource("import");

    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileFunction),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
      }
    );

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new LambdaDestination(importFileParserFunction),
      { prefix: "uploaded/" }
    );
  }
}
