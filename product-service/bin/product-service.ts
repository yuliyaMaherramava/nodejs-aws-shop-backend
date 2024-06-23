#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductServiceStack } from "../lib/product-service-stack";

const app = new cdk.App();
new ProductServiceStack(app, "ProductServiceStack", {
  env: {
    account: process.env.CDK_ACCOUNT_ID,
    region: process.env.CDK_REGION,
  },
});
