// src/integrations/jira/generator.ts
import {unlink, writeFile} from "fs/promises";
import path from "path";
import {FeatureFileData, TestCommand} from "./types";
import * as fs from "node:fs";

// src/integrations/jira/generator.ts
function generateSteps(commands: TestCommand[]): string {
  return commands
      .map((cmd) => {
        switch (cmd.type) {
          case "registration":
            return `    When I register as new user with "${cmd.parameters.isDefault ? ":default" : cmd.command.split("with ")[1]}"`;
          default:
            return `    When I ${cmd.command}`;
        }
      })
      .join("\n");
}

export async function generateFeatureFile(
    data: FeatureFileData,
): Promise<string> {
  const {title, description, commands, jiraKey, labels} = data;

  const featureDir = path.join(
      process.cwd(),
      "src",
      "features",
      "jira-generated",
  );
  await fs.promises.mkdir(featureDir, {recursive: true});

  const isFrench =
      labels.includes("registration_french") ||
      commands.some((cmd) => cmd.type === "registration_french");

  const content = isFrench
      ? `@jira-${jiraKey} @registration_french
# Language: fr
Feature: ${title}
  Afin d'accéder aux services Preventimmo
  En tant que nouvel utilisateur
  Je dois pouvoir créer un compte

  Scenario: ${formatScenarioTitle(title)}
    Given que je suis sur la page "/espace-client/visitor.php?action=register"
    And que je mets en plein écran
    When je m'inscris en tant que nouvel utilisateur avec ":default"
    Then je devrais voir "Un email de confirmation vient de vous être envoyé"`
      : `@jira-${jiraKey} @registration
Feature: ${title}
  In order to access Preventimmo services
  As a new user
  I need to be able to register an account

  Scenario: ${formatScenarioTitle(title)}
    Given I am on page "/espace-client/visitor.php?action=register"
    And I set fullscreen
    When I register as new user with ":default"
    Then I should see "Un email de confirmation vient de vous être envoyé"`;

  const filePath = path.join(featureDir, `${jiraKey.toLowerCase()}.feature`);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function formatScenarioTitle(title: string): string {
  return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");
}

export async function cleanupFeature(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
    console.log(`Cleaned up feature file: ${filePath}`);
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    if (fsError.code !== "ENOENT") {
      // Ignore if file doesn't exist
      console.error("Error cleaning up feature file:", {
        message: fsError.message,
        code: fsError.code,
      });
    }
  }
}
