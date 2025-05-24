import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'

export class AwsWhatsNew extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const awsWhatsNewBucket = new s3.Bucket(this, `AwsWhatsNewBucket`, {
      bucketName: `aws-whats-new.yob.id.au`,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
    })

    // Grant public read access via bucket policy
    awsWhatsNewBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${awsWhatsNewBucket.bucketArn}/*`],
        principals: [new iam.AnyPrincipal()],
        effect: iam.Effect.ALLOW,
      })
    );

    const lambdaRole = new iam.Role(this, 'WhatsNewFetcherRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    })

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [`${awsWhatsNewBucket.bucketArn}/index.xml`],
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject'],
      })
    )

    const theFunc = new NodejsFunction(this, 'AwsWhatsNewFunction',
      {
        runtime: Runtime.NODEJS_20_X,
        functionName: 'aws-whats-new-fetcher',
        handler: 'handler',
        timeout: cdk.Duration.seconds(30),
        entry: 'lib/lambdas/fetch-aws-whats-new.ts',
        role: lambdaRole,
        environment: {
          FEED_URL: "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
          BUCKET_NAME: awsWhatsNewBucket.bucketName,
          OBJECT_KEY: "index.xml"
        },
      }
    )

    // trigger the lambda regularly, to look for updates to the feed
    const rule = new events.Rule(this, 'AwsFeedRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(30)),
    });

    rule.addTarget(new targets.LambdaFunction(theFunc));
  }
}
