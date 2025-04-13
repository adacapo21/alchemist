#!/usr/bin/env node
import {calculateSignature} from "./utils/signature-calculator";
import dotenv from "dotenv";

dotenv.config();

const webhookSecret = process.env.JIRA_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.error("Error: JIRA_WEBHOOK_SECRET environment variable is not set");
  process.exit(1);
}

// Read payload from command line argument or use sample payload
const payload = process.argv[2]
    ? JSON.parse(process.argv[2])
    : {
      issue: {
        id: "10000",
        key: "PRVIQA-197",
        fields: {
          summary: "Test User Registration with Jira",
          description:
              "As a QA engineer\nI want to verify professional user registration\nSo that we ensure the registration flow works correctly",
          labels: ["automation", "registration"],
          customfield_10000: 'register as new user with ":default"',
          status: {
            name: "In Progress",
          },
        },
      },
    };

const signature = calculateSignature(payload, webhookSecret);

console.log("\nWebhook Test Information:");
console.log("------------------------");
console.log("\nHeader to add to request:");
console.log("x-hub-signature:", signature);
console.log("\nPayload:");
console.log(JSON.stringify(payload, null, 2));
console.log("\nCURL command:");
console.log(`curl -X POST \\
  https://41fb-134-231-150-222.ngrok-free.app/ \\
  -H 'Content-Type: application/json' \\
  -H 'x-hub-signature: ${signature}' \\
  -d '${JSON.stringify(payload)}'`);
