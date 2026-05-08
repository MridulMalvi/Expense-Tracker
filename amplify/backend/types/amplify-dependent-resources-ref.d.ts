export type AmplifyDependentResourcesAttributes = {
  "auth": {
    "expensetracker222d1d7dce": {
      "AppClientID": "string",
      "AppClientIDWeb": "string",
      "IdentityPoolId": "string",
      "IdentityPoolName": "string",
      "UserPoolArn": "string",
      "UserPoolId": "string",
      "UserPoolName": "string"
    }
  },
  "function": {
    "S3Triggerbebbab94": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "processReceipt": {
      "Arn": "string",
      "ExpensesTableArn": "string",
      "ExpensesTableName": "string",
      "FunctionUrl": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    }
  },
  "storage": {
    "data": {
      "BucketName": "string",
      "Region": "string"
    }
  }
}