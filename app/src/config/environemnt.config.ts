export interface EnvironmentConfig {
  baseUrl: string;
  credentials?: {
    username?: string;
    password?: string;
  };
}

const environments: Record<string, EnvironmentConfig> = {
  testdev1: {
    baseUrl: "https://testdev1.preventimmo.fr",
  },
  testdev2: {
    baseUrl: "https://testdev2.preventimmo.fr",
  },
};

export const getConfig = (): EnvironmentConfig => {
  const env = process.env.TEST_ENV || "testdev1";
  console.log(`Running tests in environment: ${env}`);
  console.log(`Base URL: ${environments[env]?.baseUrl}`);
  return environments[env] || environments.testdev1;
};
