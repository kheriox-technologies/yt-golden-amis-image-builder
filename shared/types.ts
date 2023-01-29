export interface ICDKContext {
  appName: string;
  region: string;
  baseAmiName: string;
  baseAmiId: string;
  environment: string;
  accountNumber: string;
  vpcId: string;
}

export interface ITags {
  ApplicationName: string;
  Environment: string;
  [key: string]: string;
}

export interface CDKConfig {
  context: {
    globals: {
      appName: string;
      region: string;
      baseAmiName: string;
      baseAmiId: string;
    };
    environments: {
      environment: string;
      accountNumber: string;
      vpcId: string;
    }[];
  };
}
