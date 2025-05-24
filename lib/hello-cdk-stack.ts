import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { IamIdentityCenter } from './iam-identity-center';

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // This isn't used, I was just experimenting
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

    new IamIdentityCenter(this, 'IamIdentityCenter', {
      identityStoreId: 'd-9767bf2f78',
      ssoInstanceArn: 'arn:aws:sso:::instance/ssoins-82594607fd49dc37',
      accountId: '949194823831',
    })

    cdk.Tags.of(this).add('repository', 'yob/foo');
  }
}
