import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createLeadSecurityHashes,
  extractClientAddress,
} from "@/features/leads/security";
import { PRIVACY_NOTICE } from "@/config/privacy";

const submission = {
  locale: "ro" as const,
  source: "contacts_page" as const,
  sourcePath: "/ro/contacts",
  name: "Ana Maria",
  phone: "+37369123456",
  telegramUsername: null,
  comment: null,
  productId: null,
  privacyNoticeVersion: PRIVACY_NOTICE.storageVersion,
};

describe("lead abuse protection", () => {
  it("uses only a validated proxy address and falls back deterministically", () => {
    expect(
      extractClientAddress(
        new Headers({ "x-vercel-forwarded-for": "203.0.113.7" }),
      ),
    ).toBe("203.0.113.7");
    expect(
      extractClientAddress(new Headers({ "x-forwarded-for": "spoofed" })),
    ).toBe("unknown");
  });

  it("creates stable keyed hashes without retaining raw PII", () => {
    const hashes = createLeadSecurityHashes(
      submission,
      "203.0.113.7",
      "a-secure-test-secret-that-is-at-least-32-characters",
    );
    expect(
      Object.values(hashes).every((value) => /^[0-9a-f]{64}$/.test(value)),
    ).toBe(true);
    expect(JSON.stringify(hashes)).not.toContain(submission.phone);
    expect(JSON.stringify(hashes)).not.toContain("203.0.113.7");
    expect(
      createLeadSecurityHashes(
        submission,
        "203.0.113.7",
        "a-secure-test-secret-that-is-at-least-32-characters",
      ),
    ).toEqual(hashes);
  });
});
