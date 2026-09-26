import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import type { LeadSubmission } from "@/features/leads/types";

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function extractClientAddress(headers: Headers): string {
  // Vercel supplies this header after removing untrusted client forwarding
  // headers. Do not trust generic X-Forwarded-For from arbitrary proxies.
  const candidate = headers
    .get("x-vercel-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  if (candidate && isIP(candidate)) return candidate;
  return "unknown";
}

export function createLeadSecurityHashes(
  submission: LeadSubmission,
  clientAddress: string,
  secret: string,
) {
  const canonicalPayload = JSON.stringify({
    locale: submission.locale,
    source: submission.source,
    sourcePath: submission.sourcePath,
    name: submission.name,
    phone: submission.phone,
    telegramUsername: submission.telegramUsername,
    comment: submission.comment,
    productId: submission.productId,
    privacyNoticeVersion: submission.privacyNoticeVersion,
  });
  return {
    requestHash: hmac(secret, `request:${canonicalPayload}`),
    clientFingerprintHash: hmac(secret, `ip:${clientAddress}`),
    phoneHash: hmac(secret, `phone:${submission.phone}`),
  };
}
