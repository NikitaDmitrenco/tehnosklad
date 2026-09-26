import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function assistantSubjectHash(headers: Headers, secret: string): string {
  const candidate = headers
    .get("x-vercel-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  const raw = candidate && isIP(candidate) ? candidate : "unknown";
  return createHmac("sha256", secret)
    .update(`assistant-ip:${raw}`)
    .digest("hex");
}
