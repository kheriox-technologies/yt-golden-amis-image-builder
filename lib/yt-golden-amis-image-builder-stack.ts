import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICDKContext } from '../shared/types';
import { AccountPrincipal, CfnInstanceProfile, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  CfnComponent,
  CfnDistributionConfiguration,
  CfnImagePipeline,
  CfnImageRecipe,
  CfnInfrastructureConfiguration,
} from 'aws-cdk-lib/aws-imagebuilder';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';

export class YtGoldenAmisImageBuilderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps, context: ICDKContext) {
    super(scope, id, props);

    // Create resources in Shared Account
    if (context.environment === 'demo-shared') {
      // EC2 image builder role
      const ec2ImageBuilderRole = new Role(this, 'ec2ImageBuilderRole', {
        roleName: `${context.appName}-${context.environment}-ec2-role`,
        description: 'Role assumed by EC2 Image Builder to build and validate components',
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceProfileForImageBuilder'),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ],
      });

      // EC2 image builder instance profile
      new CfnInstanceProfile(this, 'ec2ImageBuilderInstanceProfile', {
        instanceProfileName: `${context.appName}-${context.environment}-ec2-instance-profile`,
        roles: [ec2ImageBuilderRole.roleName],
      });

      // Apache Custom Component
      const apache2Component = new CfnComponent(this, 'apache2Component', {
        name: `${context.appName}-apache2`,
        description: 'Install Apache2 on Ubuntu',
        platform: 'Linux',
        supportedOsVersions: ['Ubuntu'],
        version: '1.0.0',
        changeDescription: 'Initial version of the component',
        uri: `s3://kheriox-demo-shared-youtube/image-builder/components/apache.yaml`,
      });

      // NodeJS Custom Component
      const nodeJsComponent = new CfnComponent(this, 'nodeJsComponent', {
        name: `${context.appName}-nodejs`,
        description: 'Install NodeJs on Ubuntu',
        platform: 'Linux',
        supportedOsVersions: ['Ubuntu'],
        version: '1.0.0',
        changeDescription: 'Initial version of the component',
        uri: `s3://kheriox-demo-shared-youtube/image-builder/components/nodejs.yaml`,
      });

      // Image Recipe
      const myImageRecipe = new CfnImageRecipe(this, 'myImageRecipe', {
        name: `${context.appName}-image-recipe`,
        version: '1.0.0',
        parentImage: context.baseAmiId,
        additionalInstanceConfiguration: {
          systemsManagerAgent: {
            uninstallAfterBuild: false,
          },
        },
        components: [
          { componentArn: apache2Component.attrArn },
          { componentArn: nodeJsComponent.attrArn, parameters: [{ name: 'NodeJSVersion', value: ['16.x'] }] },
          { componentArn: 'arn:aws:imagebuilder:ap-southeast-2:aws:component/aws-cli-version-2-linux/1.0.4' },
          { componentArn: 'arn:aws:imagebuilder:ap-southeast-2:aws:component/amazon-cloudwatch-agent-linux/1.0.1' },
        ],
      });

      // Import VPC
      const vpc = Vpc.fromLookup(this, 'vpc', {
        vpcId: context.vpcId
      });

      //  Security Group for Image Builder EC2 instance
      const imageBuilderSg = new SecurityGroup(this, 'imageBuilderSg', {
        securityGroupName: `${context.appName}-sg`,
        vpc: vpc,
        description: 'Image Builder SG',
        allowAllOutbound: true,
      });

      // Infrastructure Config
      const infraConfig = new CfnInfrastructureConfiguration(this, 'infraConfig', {
        name: `${context.appName}-infra-config`,
        description: 'infrastructure config for image builder',
        instanceProfileName: `${context.appName}-${context.environment}-ec2-instance-profile`,
        subnetId: vpc.publicSubnets[0].subnetId,
        securityGroupIds: [imageBuilderSg.securityGroupId],
      });

      // Distribution Config
      const distConfig = new CfnDistributionConfiguration(this, 'distConfig', {
        name: `${context.appName}-distribution-config`,
        description: 'Distribution config for image builder',
        distributions: [
          {
            region: context.region,
            amiDistributionConfiguration: {
              targetAccountIds: ['612659717478', '845234222766'],
              name: `${context.appName}-image-{{imagebuilder:buildVersion}}-{{imagebuilder:buildDate}}`,
              description: 'AMI {{imagebuilder:buildVersion}} built on {{imagebuilder:buildDate}}',
            },
          },
        ],
      });

      // Image Pipeline
      new CfnImagePipeline(this, 'imagePipeline', {
        name: `${context.appName}-image-pipeline`,
        description: 'Image Builder pipeline',
        imageRecipeArn: myImageRecipe.attrArn,
        infrastructureConfigurationArn: infraConfig.attrArn,
        distributionConfigurationArn: distConfig.attrArn,
        schedule: { pipelineExecutionStartCondition: 'EXPRESSION_MATCH_ONLY', scheduleExpression: 'cron(0 0 1 * ? *)' },
        status: 'ENABLED',
      });
    }

    if (context.environment === 'demo-dev' || context.environment === 'demo-prod') {
      // EC2 Image Builder Cross Account Distribution role.
      // This role is used by Image Builder in Shared Account to copy AMIs
      new Role(this, 'ec2ImageBuilderCrossAccountRole', {
        roleName: 'EC2ImageBuilderDistributionCrossAccountRole',
        description: 'Role assumed by EC2 Image Builder to copy AMIs',
        assumedBy: new AccountPrincipal('296125780825'),
        managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('Ec2ImageBuilderCrossAccountDistributionAccess')],
      });
    }
  }
}
