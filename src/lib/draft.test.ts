import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import { duplicateDraft } from "./draft";

describe("duplicateDraft", () => {
  it("同じ内容で日付を今日にし、新しい取引として扱う", () => {
    const t = makeTransaction({
      amount: -50,
      memo: "メモ",
      date: "2020-01-01",
    });
    expect(duplicateDraft(t, TEST_CATEGORIES, "2025-11-23")).toEqual({
      id: null,
      createdAt: null,
      kind: "expense",
      date: "2025-11-23",
      amountText: "-50",
      categoryId: "food",
      memo: "メモ",
    });
  });

  it("元の費目が非表示なら費目を空欄にする", () => {
    const t = makeTransaction({ categoryId: "old" });
    expect(duplicateDraft(t, TEST_CATEGORIES, "2025-11-23").categoryId).toBe(
      "",
    );
  });
});
