// NPM Imports
import { App } from 'aws-cdk-lib';

import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { readJSONSync } from 'fs-extra';

// Type definitions
import { CDKConfig, ICDKContext } from './types';

// Get CDK Context
export const getContext = async (app: App): Promise<ICDKContext | undefined> => {
  try {
    const currentEnvironment = process.env.ENV;

    // Fetch environment specific context based on the branch name
    const currentContext = (await app.node.tryGetContext('environments')).find(
      (environment: ICDKContext) => environment.environment === currentEnvironment
    ) as ICDKContext;

    const stsClient = new STSClient({ region: currentContext.region });
    const getCallerIdentityCommand = new GetCallerIdentityCommand({});
    const stsRes = await stsClient.send(getCallerIdentityCommand);

    if (stsRes.Account !== currentContext.accountNumber) {
      console.warn('Credentials does not match with the environment');
      return undefined;
    }
    return { ...app.node.tryGetContext('globals'), ...currentContext };
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

// Get CDK Config
export const getCDKConfig = async (): Promise<CDKConfig | undefined> => {
  try {
    const cdkConfig: CDKConfig = readJSONSync('cdk.json');

    return cdkConfig;
  } catch (error) {
    console.error(error);
    return undefined;
  }
};
