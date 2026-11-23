import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import { EMPTY_CRITERIA, searchTransactions } from "./search";
import type { SearchCriteria } from "./search";

/** テスト用の取引 */
const txs = [
  makeTransaction({ id: "lunch", memo: "ランチ ABC", amount: 1200 }),
  makeTransaction({
    id: "refund",
    memo: "返品",
    amount: -3000,
    date: "2025-04-01",
  }),
  makeTransaction({
    id: "sub",
    categoryId: "old",
    source: { card: "recruit", storeName: "ＮＥＴＦＬＩＸ．ＣＯＭ" },
    amount: 980,
    date: "2025-06-01",
  }),
  makeTransaction({
    id: "pay",
    kind: "income",
    categoryId: "salary",
    amount: 250000,
    date: "2025-05-25",
  }),
];

/**
 * 条件を指定して検索し、id の配列を返す。
 * @param criteria 上書きする条件
 * @returns {string[]} 当てはまった取引の id
 */
function ids(criteria: Partial<SearchCriteria>): string[] {
  return searchTransactions(txs, TEST_CATEGORIES, {
    ...EMPTY_CRITERIA,
    ...criteria,
  }).map((t) => t.id);
}

describe("searchTransactions", () => {
  it("条件なしなら全件を日付の新しい順で返す", () => {
    expect(ids({})).toEqual(["sub", "pay", "lunch", "refund"]);
  });

  it("キーワードは全角半角・大文字小文字を区別せず、メモ・店名・費目名に当てる", () => {
    expect(ids({ keyword: "ａｂｃ" })).toEqual(["lunch"]);
    expect(ids({ keyword: "ｾｷﾞｮｳ" })).toEqual([]);
    expect(ids({ keyword: "subsc" })).toEqual(["sub"]);
    expect(ids({ keyword: "給与" })).toEqual(["pay"]);
    expect(ids({ keyword: "netflix" })).toEqual(["sub"]);
  });

  it("金額は符号を無視せずに比べ、片側だけでも指定できる", () => {
    expect(ids({ minAmount: 1000, maxAmount: 5000 })).toEqual(["lunch"]);
    expect(ids({ minAmount: -5000, maxAmount: -1000 })).toEqual(["refund"]);
    expect(ids({ minAmount: 100000 })).toEqual(["pay"]);
    expect(ids({ maxAmount: 0 })).toEqual(["refund"]);
  });

  it("種別・費目（非表示も可）・期間で絞り、すべて AND で当てる", () => {
    expect(ids({ kind: "income" })).toEqual(["pay"]);
    expect(ids({ categoryId: "old" })).toEqual(["sub"]);
    expect(ids({ from: "2025-05-01", to: "2025-05-31" })).toEqual([
      "pay",
      "lunch",
    ]);
    expect(
      ids({ from: "2025-05-01", kind: "expense", keyword: "ランチ" }),
    ).toEqual(["lunch"]);
  });
});
