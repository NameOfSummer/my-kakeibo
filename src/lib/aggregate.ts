import { addMonths, monthOf } from "./date";
import type { Category, Transaction } from "./types";

/** 推移表に並べる月数 */
export const TREND_MONTHS = 12;

/** 支出合計・収入合計・収支差 */
export type Totals = {
  expense: number;
  income: number;
  /** 収入合計 − 支出合計 */
  balance: number;
};

/**
 * 取引の支出合計・収入合計・収支差を出す。
 * @param transactions 対象の取引
 * @returns {Totals} 合計
 */
export function sumTotals(transactions: Transaction[]): Totals {
  let expense = 0;
  let income = 0;
  for (const t of transactions) {
    if (t.kind === "expense") expense += t.amount;
    else income += t.amount;
  }
  return { expense, income, balance: income - expense };
}

/**
 * 日付が指定の月に属する取引だけを返す。
 * @param transactions 取引
 * @param month YYYY-MM
 * @returns {Transaction[]} その月の取引
 */
export function inMonth(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactions.filter((t) => monthOf(t.date) === month);
}

/**
 * 取引を日付の新しい順に並べる。同じ日付は入力の新しい順。
 * @param transactions 取引
 * @returns {Transaction[]} 並べ替えた新しい配列
 */
export function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
}

/**
 * 費目を表示順（支出 → 収入、同じ種別の中は order 順）に並べる。
 * @param categories 費目
 * @returns {Category[]} 並べ替えた新しい配列
 */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === "expense" ? -1 : 1) ||
      a.order - b.order,
  );
}

/** 費目ごとの内訳の 1 行 */
export type BreakdownRow = {
  category: Category;
  count: number;
  total: number;
};

/**
 * 費目ごとの件数と合計を出す。取引のある費目だけを、非表示の費目も含めて表示順に返す。
 * @param transactions 対象の取引
 * @param categories すべての費目
 * @returns {BreakdownRow[]} 内訳
 */
export function breakdownByCategory(
  transactions: Transaction[],
  categories: Category[],
): BreakdownRow[] {
  const sums = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    const s = sums.get(t.categoryId) ?? { count: 0, total: 0 };
    sums.set(t.categoryId, { count: s.count + 1, total: s.total + t.amount });
  }
  return sortCategories(categories).flatMap((category) => {
    const s = sums.get(category.id);
    return s === undefined ? [] : [{ category, ...s }];
  });
}

/** 推移表の 1 行 */
export type TrendRow = Totals & { month: string };

/**
 * 指定の月までの直近 12 か月について、月ごとの合計を古い順に出す。
 * @param transactions すべての取引
 * @param month 最後の月（YYYY-MM）
 * @returns {TrendRow[]} 12 行
 */
export function monthlyTrend(
  transactions: Transaction[],
  month: string,
): TrendRow[] {
  return Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = addMonths(month, i - (TREND_MONTHS - 1));
    return { month: m, ...sumTotals(inMonth(transactions, m)) };
  });
}
