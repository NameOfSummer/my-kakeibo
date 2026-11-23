import type { Category, Kind, Transaction } from "./types";

/** 入力画面に渡す、編集中の取引 */
export type TransactionDraft = {
  /** 新しい取引なら null */
  id: string | null;
  createdAt: number | null;
  kind: Kind;
  date: string;
  amountText: string;
  /** 未選択なら空文字 */
  categoryId: string;
  memo: string;
};

/**
 * 新しい取引の入力画面の初期値を作る。
 * @param today 今日（YYYY-MM-DD）
 * @returns {TransactionDraft} 初期値
 */
export function newDraft(today: string): TransactionDraft {
  return {
    id: null,
    createdAt: null,
    kind: "expense",
    date: today,
    amountText: "",
    categoryId: "",
    memo: "",
  };
}

/**
 * 既存の取引を編集する入力画面の初期値を作る。
 * @param t 取引
 * @returns {TransactionDraft} 初期値
 */
export function editDraft(t: Transaction): TransactionDraft {
  return {
    id: t.id,
    createdAt: t.createdAt,
    kind: t.kind,
    date: t.date,
    amountText: String(t.amount),
    categoryId: t.categoryId,
    memo: t.memo,
  };
}

/**
 * 複製の入力画面の初期値を作る。日付は今日にし、元の費目が非表示なら空欄にする。
 * @param t 元の取引
 * @param categories すべての費目
 * @param today 今日（YYYY-MM-DD）
 * @returns {TransactionDraft} 初期値
 */
export function duplicateDraft(
  t: Transaction,
  categories: Category[],
  today: string,
): TransactionDraft {
  const category = categories.find((c) => c.id === t.categoryId);
  return {
    ...editDraft(t),
    id: null,
    createdAt: null,
    date: today,
    categoryId: category === undefined || category.hidden ? "" : t.categoryId,
  };
}
