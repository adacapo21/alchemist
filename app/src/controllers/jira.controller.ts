import {Request, Response} from "express";
import {JiraWebhookPayload, TestResult} from "../integrations/jira/types";
import {parseCommands, validateCommands} from "../integrations/jira/parser";
import {cleanupFeature, generateFeatureFile,} from "../integrations/jira/generator";
import {updateJiraTicket} from "../config/jira.config";
import {ChildProcess, spawn} from "child_process";
import * as fs from "node:fs";

async function runTest(
    featureFile: string,
    jiraKey: string,
): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    let cleanProcess: ChildProcess | null = null;
    let testProcess: ChildProcess | null = null;
    let allureProcess: ChildProcess | null = null;
    let timeout: NodeJS.Timeout;
    let isResolved = false;

    const cleanup = () => {
      console.log("Starting cleanup process...");
      clearTimeout(timeout);
      [cleanProcess, testProcess, allureProcess].forEach((proc, index) => {
        if (proc && !proc.killed) {
          try {
            console.log(`Killing process ${index}...`);
            proc.kill("SIGKILL"); // Ensure forceful termination
            console.log(`Process ${index} terminated`);
          } catch (error) {
            console.error(`Failed to kill process ${index}:`, error);
          }
        }
      });
      console.log("Cleanup completed");
    };

    const debugProcessState = () => {
      console.log("Process State:", {
        cleanProcess: cleanProcess?.killed ? "Killed" : "Running",
        testProcess: testProcess?.killed ? "Killed" : "Running",
        allureProcess: allureProcess?.killed ? "Killed" : "Running",
        isResolved,
      });
    };

    timeout = setTimeout(() => {
      console.error("Test execution timeout reached");
      debugProcessState();
      cleanup();
      reject(new Error("Test execution timeout after 5 minutes"));
    }, 300000); // 5 minutes timeout

    try {
      console.log("Setting up test environment...");
      const env = {
        ...process.env,
        TEST_ENV: "testdev1",
        RECORD_VIDEO: "true",
        JIRA_KEY: jiraKey,
        HEADLESS: "false",
        BROWSER: "chromium",
      };

      fs.mkdir("test-results", {recursive: true}, (err) => {
        if (err) {
          console.error("Failed to create test-results directory:", err);
          cleanup();
          reject(new Error("Failed to create test-results directory"));
          return;
        }

        console.log("Starting clean process...");
        cleanProcess = spawn("npm", ["run", "allure:clean"], {
          env,
          shell: true,
          stdio: "pipe",
        });

        cleanProcess.on("close", () => {
          console.log("Clean process completed");
          startTestProcess(env, jiraKey);
        });
      });

      const startTestProcess = (env: NodeJS.ProcessEnv, jiraKey: string) => {
        console.log("Starting test process...");
        const tag = jiraKey.includes("registration_french")
            ? "@registration_french"
            : `@jira-${jiraKey}`;
        testProcess = spawn(
            "cucumber-js",
            ["--tags", tag, "--profile", "allure", "--exit"],
            {
              env,
              shell: true,
              stdio: "pipe",
            },
        );

        let output = "";
        testProcess.stdout?.on("data", (data) => {
          const chunk = data.toString();
          output += chunk;
          console.log("[Test]:", chunk);
        });

        testProcess.stderr?.on("data", (data) => {
          const chunk = data.toString();
          output += chunk;
          console.error("[Test Error]:", chunk);
        });

        testProcess.on("close", (code) => {
          console.log(`Test process closed with code ${code}`);
          if (code !== 0) {
            cleanup();
            reject(new Error(`Test process failed with code ${code}`));
            return;
          }
          startAllureProcess(env, output, code);
        });
      };

      const startAllureProcess = (
          env: NodeJS.ProcessEnv,
          output: string,
          testCode: number,
      ) => {
        console.log("Starting Allure report generation...");
        allureProcess = spawn("npm", ["run", "allure:generate"], {
          env,
          shell: true,
          stdio: "pipe",
        });

        allureProcess.stdout?.on("data", (data) => {
          console.log("[Allure]:", data.toString());
        });

        allureProcess.stderr?.on("data", (data) => {
          console.error("[Allure Error]:", data.toString());
        });

        allureProcess.on("close", () => {
          console.log("Allure process completed");
          cleanup();
          isResolved = true;
          debugProcessState();
          resolve({
            status: testCode === 0 ? "passed" : "failed",
            message: output,
            artifacts: {
              logs: output,
              ...(testCode !== 0 && {
                screenshots: [`test-results/screenshots/${jiraKey}.png`],
                video: `test-results/videos/${jiraKey}.webm`,
              }),
              reportPath: "test-results/allure-report",
            },
          });
        });
      };
    } catch (error) {
      console.error("Unexpected error in runTest:", error);
      debugProcessState();
      cleanup();
      reject(error);
    }
  });
}

export const webhookHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
  let featureFilePath: string | undefined;

  try {
    // Validate payload
    const payload = req.body as JiraWebhookPayload;
    if (!payload?.issue) {
      res.status(400).json({message: "Invalid webhook payload"});
      return;
    }

    const {issue} = payload;
    const testCommands = issue.fields.customfield_10748;

    // Validate test commands
    if (!testCommands) {
      res
          .status(400)
          .json({message: "No test commands found in the Jira ticket"});
      return;
    }

    // Parse commands
    const commands = parseCommands(testCommands);
    if (!validateCommands(commands)) {
      // Add this validation
      res.status(400).json({message: "Invalid test commands detected"});
      return;
    }
    // Generate feature file
    featureFilePath = await generateFeatureFile({
      title: issue.fields.summary,
      description: issue.fields.description,
      commands,
      jiraKey: issue.key,
      labels: issue.fields.labels,
    });

    console.log(`Generated feature file at: ${featureFilePath}`);

    // Run test
    const testResult = await runTest(featureFilePath, issue.key);

    // Send immediate response
    res.status(200).json({
      message: "Test execution completed",
      jiraKey: issue.key,
      result: testResult,
    });

    // Handle post-test actions asynchronously
    try {
      await Promise.all([
        cleanupFeature(featureFilePath),
        updateJiraTicket(
            issue.key,
            testResult.status === "passed" ? "Done" : "Failed",
            `Test execution ${testResult.status}\n${testResult.message}`,
        ),
      ]);

      console.log("Post-test cleanup and Jira update completed");
    } catch (postError) {
      console.error("Error in post-test operations:", postError);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Cleanup on error if feature file was created
    if (featureFilePath) {
      try {
        await cleanupFeature(featureFilePath);
      } catch (cleanupError) {
        console.error("Error cleaning up feature file:", cleanupError);
      }
    }

    // Only send error response if one hasn't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
