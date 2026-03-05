import { randomUUID } from "node:crypto";

export function resolveRequestId(headers: Record<string, unknown>): string {
  const headerValue = headers["x-request-id"];
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue;
  }
  return randomUUID();
}
