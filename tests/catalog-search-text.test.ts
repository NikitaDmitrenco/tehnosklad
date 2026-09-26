import { describe, expect, it } from "vitest";

import {
  matchesSearchQuery,
  searchTokenPrefix,
  searchTokens,
} from "@/features/catalog/search-text";

const fridge =
  "Samsung RB34T602FSA Samsung RB34T602FSA TS-REF-0001 Холодильники";
const washer = "Beko WRE6511BWW Beko WRE6511BWW TS-WAS-0002 Стиральные машины";
const romanianWasher =
  "Beko WRE6511BWW Beko WRE6511BWW TS-WAS-0002 Mașini de spălat rufe";

describe("catalog search text", () => {
  it("matches inflected category wording the product name does not contain", () => {
    expect(matchesSearchQuery(fridge, "холодильник")).toBe(true);
    expect(matchesSearchQuery(fridge, "холодильники")).toBe(true);
    expect(matchesSearchQuery(washer, "стиральную машину")).toBe(true);
    expect(matchesSearchQuery(romanianWasher, "masina de spalat")).toBe(true);
    expect(matchesSearchQuery(romanianWasher, "mașini")).toBe(true);
  });

  it("requires every usable token, so unrelated products stay out", () => {
    expect(matchesSearchQuery(fridge, "холодильник Samsung")).toBe(true);
    expect(matchesSearchQuery(fridge, "холодильник Bosch")).toBe(false);
    expect(matchesSearchQuery(washer, "холодильник")).toBe(false);
  });

  it("keeps whole-phrase matching for queries without usable tokens", () => {
    expect(matchesSearchQuery(fridge, "")).toBe(true);
    expect(matchesSearchQuery("Samsung TV", "TV")).toBe(true);
    expect(matchesSearchQuery(fridge, "ts")).toBe(true);
    expect(matchesSearchQuery(fridge, "zx")).toBe(false);
  });

  it("derives bounded, deduplicated tokens and stems", () => {
    expect(searchTokens("Стиральная стиральная машина, 12 000 лей!")).toEqual([
      "стиральная",
      "машина",
      "000",
      "лей",
    ]);
    expect(searchTokenPrefix("плиты")).toBe("плит");
    expect(searchTokenPrefix("холодильники")).toBe("холодиль");
    expect(searchTokenPrefix("ga")).toBe("ga");
  });
});
