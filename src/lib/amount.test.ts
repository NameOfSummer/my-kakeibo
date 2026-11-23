import { describe, expect, it } from "vitest";
import { formatYen, parseAmount } from "./amount";

describe("parseAmount", () => {
  it.each([
    ["3000", 3000],
    ["-3,000", -3000],
    ["３０００", 3000],
    ["－５００", -500],
    ["−500", -500],
    [" 12 ", 12],
  ])("%s を %d にする", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "1.5", "1e3", "--1", "99999999999999999"])(
    "%s は null",
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );

  it("0 は数としては読める（0 の可否は入力画面で判定する）", () => {
    expect(parseAmount("0")).toBe(0);
  });
});

describe("formatYen", () => {
  it("カンマと円を付ける", () => {
    expect(formatYen(-3000)).toBe("-3,000円");
  });
});
