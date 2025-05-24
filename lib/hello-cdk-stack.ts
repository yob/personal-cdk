import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IamIdentityCenter } from './iam-identity-center';
import { AwsWhatsNew } from './aws-whats-new'; 

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new IamIdentityCenter(this, 'IamIdentityCenter', {
      identityStoreId: 'd-9767bf2f78',
      ssoInstanceArn: 'arn:aws:sso:::instance/ssoins-82594607fd49dc37',
      accountId: '949194823831',
    })

    new AwsWhatsNew(this, 'AwsWhatsNew')

    cdk.Tags.of(this).add('repository', 'yob/foo');
  }
}
