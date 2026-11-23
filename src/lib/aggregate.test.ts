import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import {
  breakdownByCategory,
  inMonth,
  monthlyTrend,
  sortNewestFirst,
  sumTotals,
} from "./aggregate";

describe("aggregate", () => {
  const txs = [
    makeTransaction({ id: "a", date: "2025-05-01", amount: 1000 }),
    // 返品による返金はマイナスの支出
    makeTransaction({ id: "b", date: "2025-05-31", amount: -300 }),
    makeTransaction({
      id: "c",
      date: "2025-05-20",
      amount: 500,
      categoryId: "old",
    }),
    makeTransaction({
      id: "d",
      kind: "income",
      date: "2025-05-25",
      amount: 200000,
      categoryId: "salary",
    }),
    makeTransaction({ id: "e", date: "2025-06-01", amount: 9999 }),
    makeTransaction({ id: "f", date: "2024-06-30", amount: 70 }),
    makeTransaction({ id: "g", date: "2024-05-31", amount: 80 }),
  ];

  it("暦月で区切って合計と収支差を出す", () => {
    expect(sumTotals(inMonth(txs, "2025-05"))).toEqual({
      expense: 1200,
      income: 200000,
      balance: 198800,
    });
  });

  it("日付の新しい順、同じ日付は入力の新しい順に並べる", () => {
    const sorted = sortNewestFirst([
      makeTransaction({ id: "x", date: "2025-05-01", createdAt: 1 }),
      makeTransaction({ id: "y", date: "2025-05-02", createdAt: 0 }),
      makeTransaction({ id: "z", date: "2025-05-01", createdAt: 2 }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["y", "z", "x"]);
  });

  it("内訳は非表示の費目も含め、取引のある費目だけを出す", () => {
    const rows = breakdownByCategory(inMonth(txs, "2025-05"), TEST_CATEGORIES);
    expect(rows.map((r) => [r.category.id, r.count, r.total])).toEqual([
      ["food", 2, 700],
      ["old", 1, 500],
      ["salary", 1, 200000],
    ]);
  });

  it("推移表は開いている月までの直近 12 か月", () => {
    const rows = monthlyTrend(txs, "2025-05");
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({
      month: "2024-06",
      expense: 70,
      income: 0,
      balance: -70,
    });
    expect(rows[11].month).toBe("2025-05");
    expect(rows[11].balance).toBe(198800);
  });
});
