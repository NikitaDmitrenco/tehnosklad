import { describe, expect, it } from "vitest";

import {
  AdminValidationError,
  minorToMoney,
  moneyToMinor,
  optionalMoneyToMinor,
} from "@/features/admin/validation";

describe("admin money conversion", () => {
  it.each([
    ["8999", "899900"],
    ["8999.5", "899950"],
    ["8999,50", "899950"],
    ["0.01", "1"],
  ])("converts %s MDL to integer minor units", (input, expected) => {
    expect(moneyToMinor(input)).toBe(expected);
  });

  it.each(["-1", "1.001", "1e3", "NaN", "01", "", "99999999999999"])(
    "rejects unsafe amount %s",
    (input) => expect(() => moneyToMinor(input)).toThrow(AdminValidationError),
  );

  it("maps minor units without float arithmetic", () => {
    expect(minorToMoney("899950")).toBe("8999.50");
    expect(minorToMoney("899900")).toBe("8999");
    expect(optionalMoneyToMinor("")).toBeNull();
  });
});
