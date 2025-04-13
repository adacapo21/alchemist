import crypto from "crypto";

export function calculateSignature(payload: any, secret: string): string {
  const stringifiedPayload = JSON.stringify(payload);
  const signature = crypto
      .createHmac("sha256", secret)
      .update(stringifiedPayload)
      .digest("hex");

  return `sha256=${signature}`;
}
