import { describe, expect, it } from "vitest";

import { getCategoryTone } from "@/features/catalog/presentation";

describe("category presentation", () => {
  it("uses database presentation keys rather than demo identifiers", () => {
    expect(getCategoryTone("fridge")).toBe("blue");
    expect(getCategoryTone("stove")).toBe("coral");
    expect(getCategoryTone("vacuum")).toBe("mint");
    expect(getCategoryTone("generic")).toBe("yellow");
  });
});
