import { describe, expect, it } from "vitest";
import { TEST_CATEGORIES } from "@/test/factories";
import { nextOrder, validateCategoryName } from "./category";

describe("validateCategoryName", () => {
  it("空と、同じ種別の中の重複を弾く", () => {
    expect(
      validateCategoryName("  ", "expense", TEST_CATEGORIES, null),
    ).not.toBeNull();
    expect(
      validateCategoryName(" 食費 ", "expense", TEST_CATEGORIES, null),
    ).not.toBeNull();
  });

  it("別の種別や自分自身との同名は許す", () => {
    expect(
      validateCategoryName("食費", "income", TEST_CATEGORIES, null),
    ).toBeNull();
    expect(
      validateCategoryName("食費", "expense", TEST_CATEGORIES, "food"),
    ).toBeNull();
  });
});

describe("nextOrder", () => {
  it("同じ種別の最後に置く", () => {
    expect(nextOrder("expense", TEST_CATEGORIES)).toBe(2);
    expect(nextOrder("income", [])).toBe(0);
  });
});
