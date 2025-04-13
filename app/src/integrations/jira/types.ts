export interface JiraWebhookPayload {
  issue: {
    id: string;
    key: string;
    fields: {
      summary: string;
      description: string;
      labels: string[];
      customfield_10748?: string; // Test Commands field
      status: {
        name: string;
      };
      components?: Array<{
        name: string;
      }>;
    };
  };
}

export interface TestCommand {
  type: "registration" | "registration_french" | "login" | "unknown";
  command: string;
  parameters: Record<string, string | boolean>;
}

export interface FeatureFileData {
  title: string;
  description: string;
  commands: TestCommand[];
  jiraKey: string;
  labels: string[];
}

export interface TestResult {
  status: "passed" | "failed";
  message: string;
  artifacts: {
    logs?: string;
    screenshots?: string[];
    video?: string;
    reportPath: string;
  };
}

// Add type for express middleware
export interface WebhookRequest extends Express.Request {
  body: JiraWebhookPayload;
}

export interface WebhookResponse extends Express.Response {
  json: (body: any) => WebhookResponse;
}
