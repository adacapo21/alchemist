// src/integrations/jira/middleware.ts
import {NextFunction, Request, Response} from "express";
import {jiraConfig} from "../../config/jira.config";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export function validateWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
  console.log("Environment in middleware:", {
    webhookSecret: process.env.JIRA_WEBHOOK_SECRET,
    configSecret: jiraConfig.webhookSecret,
  });

  const signature = req.headers["x-hub-signature"];
  const webhookSecret = process.env.JIRA_WEBHOOK_SECRET; // Use directly from env

  if (!signature || !webhookSecret) {
    res.status(401).json({message: "Unauthorized"});
    return;
  }

  const hmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

  const expectedSignature = `sha256=${hmac}`;

  console.log("Signature comparison:", {
    received: signature,
    expected: expectedSignature,
  });

  if (signature !== expectedSignature) {
    res.status(401).json({message: "Invalid signature"});
    return;
  }

  next();
}
