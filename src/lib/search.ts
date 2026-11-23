import { sortNewestFirst } from "./aggregate";
import type { Category, Kind, Transaction } from "./types";

/** 検索条件。null の条件は使わない */
export type SearchCriteria = {
  keyword: string;
  minAmount: number | null;
  maxAmount: number | null;
  /** categoryId を指定したときは無視する（費目が種別を決めるため） */
  kind: Kind | null;
  categoryId: string | null;
  /** YYYY-MM-DD（その日を含む） */
  from: string | null;
  to: string | null;
};

/** 何も絞り込まない検索条件 */
export const EMPTY_CRITERIA: SearchCriteria = {
  keyword: "",
  minAmount: null,
  maxAmount: null,
  kind: null,
  categoryId: null,
  from: null,
  to: null,
};

/**
 * 全角と半角、大文字と小文字を区別せずに比べるための正規化。
 * @param text 元の文字列
 * @returns {string} 正規化した文字列
 */
export function normalizeText(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/**
 * 条件をすべて満たす取引を、日付の新しい順に返す。
 * @param transactions すべての取引
 * @param categories すべての費目（キーワードを費目名に当てるため）
 * @param criteria 検索条件
 * @returns {Transaction[]} 当てはまった取引
 */
export function searchTransactions(
  transactions: Transaction[],
  categories: Category[],
  criteria: SearchCriteria,
): Transaction[] {
  const keyword = normalizeText(criteria.keyword.trim());
  const names = new Map(categories.map((c) => [c.id, normalizeText(c.name)]));
  const { minAmount, maxAmount, kind, categoryId, from, to } = criteria;
  return sortNewestFirst(
    transactions.filter(
      (t) =>
        (keyword === "" ||
          normalizeText(t.memo).includes(keyword) ||
          normalizeText(t.source?.storeName ?? "").includes(keyword) ||
          (names.get(t.categoryId) ?? "").includes(keyword)) &&
        // 符号は無視せず、入力した値のまま比べる
        (minAmount === null || t.amount >= minAmount) &&
        (maxAmount === null || t.amount <= maxAmount) &&
        (categoryId !== null
          ? t.categoryId === categoryId
          : kind === null || t.kind === kind) &&
        (from === null || t.date >= from) &&
        (to === null || t.date <= to),
    ),
  );
}
