import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SubscriptionFilter, Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || "products";
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME || "stocks";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListFunction = new lambda.Function(
      this,
      "GetProductsListHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "getProductsList.handler",
        environment: { PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME },
      }
    );

    const getProductByIdFunction = new lambda.Function(
      this,
      "GetProductByIdHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "getProductById.handler",
        environment: { PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME },
      }
    );

    const createProductFunction = new lambda.Function(
      this,
      "CreateProductHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "createProduct.handler",
        environment: { PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME },
      }
    );

    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      "products"
    );

    const stocksTable = dynamodb.Table.fromTableName(
      this,
      "StocksTable",
      "stocks"
    );

    productsTable.grantWriteData(createProductFunction);
    stocksTable.grantWriteData(createProductFunction);

    productsTable.grantReadData(getProductsListFunction);
    stocksTable.grantReadData(getProductsListFunction);

    productsTable.grantReadData(getProductByIdFunction);
    stocksTable.grantReadData(getProductByIdFunction);

    const productServiceQueue = new Queue(this, "ProductServiceQueue", {});

    const productServiceTopic = new Topic(this, "ProductServiceTopic", {});

    productServiceTopic.addSubscription(
      new EmailSubscription(process.env.EMAIL || "")
    );

    productServiceTopic.addSubscription(
      new EmailSubscription(process.env.FILTER_EMAIL || "", {
        filterPolicy: {
          price: SubscriptionFilter.numericFilter({
            greaterThan: 50,
          }),
        },
      })
    );

    const catalogBatchProcessFunction = new lambda.Function(
      this,
      "CatalogBatchProcessHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda-functions"),
        handler: "catalogBatchProcess.handler",
        environment: {
          PRODUCTS_TABLE_NAME,
          STOCKS_TABLE_NAME,
          SNS_TOPIC_ARN: productServiceTopic.topicArn,
        },
      }
    );

    productsTable.grantWriteData(catalogBatchProcessFunction);
    stocksTable.grantWriteData(catalogBatchProcessFunction);

    productServiceQueue.grantConsumeMessages(catalogBatchProcessFunction);
    productServiceTopic.grantPublish(catalogBatchProcessFunction);

    catalogBatchProcessFunction.addEventSource(
      new SqsEventSource(productServiceQueue, { batchSize: 5 })
    );

    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      description: "For managing products",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsListFunction)
    );
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProductFunction)
    );

    const productResource = productsResource.addResource("{id}");
    productResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductByIdFunction)
    );

    new cdk.CfnOutput(this, "ProductServiceQueueArn", {
      value: productServiceQueue.queueArn,
      exportName: "ProductServiceQueueArn",
    });

    new cdk.CfnOutput(this, "ProductServiceQueueUrl", {
      value: productServiceQueue.queueUrl,
      exportName: "ProductServiceQueueUrl",
    });
  }
}
