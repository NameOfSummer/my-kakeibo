import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import { duplicateDraft, editDraft } from "./draft";

describe("editDraft", () => {
  it("取り込み元を残す", () => {
    const source = { card: "recruit", storeName: "ダイソ－" } as const;
    expect(editDraft(makeTransaction({ source })).source).toEqual(source);
  });
});

describe("duplicateDraft", () => {
  it("同じ内容で日付を今日にし、新しい取引として扱う。取り込み元は引き継がない", () => {
    const t = makeTransaction({
      amount: -50,
      memo: "メモ",
      date: "2020-01-01",
      source: { card: "recruit", storeName: "ダイソ－" },
    });
    expect(duplicateDraft(t, TEST_CATEGORIES, "2025-11-23")).toEqual({
      id: null,
      createdAt: null,
      kind: "expense",
      date: "2025-11-23",
      amountText: "-50",
      categoryId: "food",
      memo: "メモ",
      source: null,
    });
  });

  it("元の費目が非表示なら費目を空欄にする", () => {
    const t = makeTransaction({ categoryId: "old" });
    expect(duplicateDraft(t, TEST_CATEGORIES, "2025-11-23").categoryId).toBe(
      "",
    );
  });
});
