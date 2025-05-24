import { Construct } from 'constructs';
import * as identitystore from 'aws-cdk-lib/aws-identitystore';
import * as cr from 'aws-cdk-lib/custom-resources'
import * as sso from 'aws-cdk-lib/aws-sso'

export class IamIdentityCenter extends Construct {
  constructor(scope: Construct, id: string, props: {identityStoreId: string, ssoInstanceArn: string, accountId: string}) {
    super(scope, id);

    const { identityStoreId, ssoInstanceArn, accountId } = props

    // Create a Group that will hold users. We will attach permissions here rather than to
    // Users directly
    const cfnGroup = new identitystore.CfnGroup(this, 'Friends', {
      displayName: 'MyFriends',
      identityStoreId: identityStoreId,
    });

    // Incredibly, I can't find a way to create users via Cloudformation!? WAT
    // For now, I've manually created one in the UI and this hack fetchs the UUID for it
    const getUserId = new cr.AwsCustomResource(this, 'GetUserId', {
      onUpdate: { // will also be called for a CREATE event
        service: 'IdentityStore',
        action: 'GetUserId',
        parameters: {
          AlternateIdentifier: { UniqueAttribute: { AttributePath: 'userName', AttributeValue: 'james@yob.id.au' } },
          IdentityStoreId: identityStoreId,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    // Add the manually crated user to the Groupd we created
    const cfnGroupMembership = new identitystore.CfnGroupMembership(this, 'JamesFriend', {
      groupId: cfnGroup.attrGroupId,
      identityStoreId: identityStoreId,
      memberId: {
        userId: getUserId.getResponseField('UserId'),
      },
    });

    // Create a permission set. This is kinda like a role for SSO land. We can have inline policies,
    // but to keep things simple in this experiment I'm using anAWS managed role
    const permissionSetReaders = new sso.CfnPermissionSet(this, 'PermissionSetReaders', {
      instanceArn: ssoInstanceArn,
      name: 'Readers',
      managedPolicies: ['arn:aws:iam::aws:policy/job-function/ViewOnlyAccess'],
      sessionDuration: 'PT8H', // 8 hours
    });

    // Now tie it all together. This links up the:
    // 
    // * Permissions Set
    // * Group
    // * An AWS account
    //
    // This allows users in the group to assume a role defined by the permission set in the target account
    const assignmentFriendsReaders = new sso.CfnAssignment(this, 'AssignmentFriendsReaders', {
      instanceArn: ssoInstanceArn,
      permissionSetArn: permissionSetReaders.attrPermissionSetArn,
      principalId: cfnGroup.attrGroupId,
      principalType: 'GROUP',
      targetId: accountId,
      targetType: 'AWS_ACCOUNT',
    });
  }
}
