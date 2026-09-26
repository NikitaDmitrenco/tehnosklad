import { describe, expect, it } from "vitest";

import { isAllowedMutationOrigin } from "@/lib/request-origin-logic";

describe("mutation origin allowlist", () => {
  const production = { siteUrl: "https://tehnosklad.example" };

  it("accepts only the canonical origin when no Vercel deployment host exists", () => {
    expect(
      isAllowedMutationOrigin("https://tehnosklad.example", production),
    ).toBe(true);
    expect(
      isAllowedMutationOrigin("https://attacker.example", production),
    ).toBe(false);
  });

  it("accepts only the exact Vercel system host in preview and production", () => {
    const deployment = {
      ...production,
      vercelEnvironment: "preview",
      vercelUrl: "tehnosklad-git-main-boris-llc.vercel.app",
    };
    expect(
      isAllowedMutationOrigin(
        "https://tehnosklad-git-main-boris-llc.vercel.app",
        deployment,
      ),
    ).toBe(true);
    expect(
      isAllowedMutationOrigin(
        "https://tehnosklad-git-main-boris-llc.vercel.app",
        { ...deployment, vercelEnvironment: "production" },
      ),
    ).toBe(true);
    expect(
      isAllowedMutationOrigin("https://other.vercel.app", deployment),
    ).toBe(false);
  });
});
