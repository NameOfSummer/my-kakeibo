import { describe, expect, it } from "vitest";
import { addMonths, isValidDateString, toDateString } from "./date";

describe("date", () => {
  it("年をまたいで月をずらせる", () => {
    expect(addMonths("2025-05", -11)).toBe("2024-06");
    expect(addMonths("2024-12", 1)).toBe("2025-01");
    expect(addMonths("2025-01", -1)).toBe("2024-12");
  });

  it("実在しない日付を弾く", () => {
    expect(isValidDateString("2024-02-29")).toBe(true);
    expect(isValidDateString("2025-02-29")).toBe(false);
    expect(isValidDateString("2025-5-1")).toBe(false);
  });

  it("ローカル時刻で日付を作る", () => {
    expect(toDateString(new Date(2025, 0, 5, 23, 59))).toBe("2025-01-05");
  });
});
