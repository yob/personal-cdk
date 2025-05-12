import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      const bucket = new s3.Bucket(this, `test-bucket-949194823831`, {
        bucketName: `test-bucket-949194823831`,
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
        blockPublicAccess: {
          blockPublicPolicy: true,
          blockPublicAcls: true,
          ignorePublicAcls: true,
          restrictPublicBuckets: true,
        },
      })

    cdk.Tags.of(this).add('repository', 'yob/foo');
  }
}
