// src/config/jira.config.ts
export interface JiraConfig {
  baseUrl: string;
  webhookSecret: string;
  auth: {
    email: string;
    apiToken: string;
  };
  customFields: {
    testCommands: string;
  };
}

export const jiraConfig: JiraConfig = {
  baseUrl: process.env.JIRA_BASE_URL || "https://your-domain.atlassian.net",
  webhookSecret: process.env.JIRA_WEBHOOK_SECRET || "your-webhook-secret",
  auth: {
    email: process.env.JIRA_EMAIL || "",
    apiToken: process.env.JIRA_API_TOKEN || "",
  },
  customFields: {
    testCommands: "customfield_10748",
  },
};

export async function updateJiraTicket(
    issueKey: string,
    status: string,
    comment: string,
): Promise<void> {
  const url = `${jiraConfig.baseUrl}/rest/api/3/issue/${issueKey}`;
  const auth = Buffer.from(
      `${jiraConfig.auth.email}:${jiraConfig.auth.apiToken}`,
  ).toString("base64");

  try {
    // Add comment
    await fetch(`${url}/comment`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{type: "text", text: comment}],
            },
          ],
        },
      }),
    });

    // Update status if needed
    if (status) {
      await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            status: {
              name: status,
            },
          },
        }),
      });
    }
  } catch (error) {
    console.error("Error updating Jira ticket:", error);
  }
}
