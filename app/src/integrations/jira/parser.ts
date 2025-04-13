// src/integrations/jira/parser.ts
import {TestCommand} from "./types";

export function parseCommands(commandText: string): TestCommand[] {
  if (!commandText) return [];

  const lines = commandText.split("\n").filter((line) => line.trim());
  return lines.map(parseCommand);
}

function parseCommand(line: string): TestCommand {
  // Handle registration commands
  if (line.includes("register")) {
    const params: Record<string, string | boolean> = {};

    if (line.includes("with")) {
      const paramStr = line.split("with ")[1].replace(/['"]/g, "");

      if (paramStr === ":default") {
        return {
          type: "registration",
          command: line,
          parameters: {
            isDefault: true,
          },
        };
      }

      // Parse professional/true into proper parameters
      const pairs = paramStr.split("/");
      for (let i = 0; i < pairs.length - 1; i += 2) {
        const key = pairs[i];
        const value = pairs[i + 1];
        params[key] =
            value === "true" ? true : value === "false" ? false : value;
      }
    }

    return {
      type: "registration",
      command: line,
      parameters: params,
    };
  }

  // Handle login commands
  if (line.startsWith("login")) {
    // Add login command parsing logic here
    return {
      type: "login",
      command: line,
      parameters: {},
    };
  }

  if (line.includes("enregistrer")) {
    const params: Record<string, string | boolean> = {};

    if (line.includes("avec")) {
      const paramStr = line.split("avec ")[1].replace(/['"]/g, "");

      if (paramStr === ":default") {
        return {
          type: "registration_french",
          command: line,
          parameters: {
            isDefault: true,
          },
        };
      }

      // Parse additional parameters
      const pairs = paramStr.split("/");
      for (let i = 0; i < pairs.length - 1; i += 2) {
        const key = pairs[i];
        const value = pairs[i + 1];
        params[key] =
            value === "true" ? true : value === "false" ? false : value;
      }
    }

    return {
      type: "registration_french",
      command: line,
      parameters: params,
    };
  }

  // Default case for unknown commands
  return {
    type: "unknown",
    command: line,
    parameters: {},
  };
}

export function validateCommands(commands: TestCommand[]): boolean {
  return commands.every((cmd) => {
    if (cmd.type === "unknown") return false;

    // Validate registration commands
    if (cmd.type === "registration") {
      // Allow :default or valid parameters
      if (cmd.parameters.isDefault) return true;

      // Validate parameter names
      const validParams = [
        "step1_professional",
        "step1_is_notary_type",
        "step2_societe",
      ];

      return Object.keys(cmd.parameters).every((param) =>
          validParams.includes(param),
      );
    }

    return true;
  });
}
