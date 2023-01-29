#!/usr/bin/env node
import 'source-map-support/register';
import { App, StackProps } from 'aws-cdk-lib';
import { YtGoldenAmisImageBuilderStack } from '../lib/yt-golden-amis-image-builder-stack';

import { ITags } from '../shared/types';

import { getContext } from '../shared/utils';

// Create Stacks
const createStacks = async () => {
  try {
    const app = new App();
    const context = await getContext(app);

    if (!context) throw new Error('Unable to fetch CDK Context');

    const stackProps: StackProps = {
      env: {
        region: context.region,
        account: context.accountNumber,
      },
    };

    // Add Tags from context
    const tags: ITags = {
      ApplicationName: context.appName,
      Environment: context.environment,
    };

    // IAM Stack
    new YtGoldenAmisImageBuilderStack(
      app,
      `${context.appName}-${context.environment}-stack`,
      {
        ...stackProps,
        ...{ stackName: `${context.appName}-${context.environment}-stack`, tags },
      },
      context
    );
  } catch (error) {
    console.error(error);
  }
};

createStacks();
