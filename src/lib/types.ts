/** 取引と費目の種別（支出 / 収入） */
export type Kind = "expense" | "income";

/** 種別の表示名 */
export const KIND_LABEL: Record<Kind, string> = {
  expense: "支出",
  income: "収入",
};

/** 表示順に並べた種別 */
export const KINDS: readonly Kind[] = ["expense", "income"];

/** 費目。削除はせず hidden で非表示にする */
export type Category = {
  id: string;
  kind: Kind;
  name: string;
  hidden: boolean;
  /** 同じ種別の中での表示順（小さいほど先） */
  order: number;
};

/** 取引 */
export type Transaction = {
  id: string;
  kind: Kind;
  /** YYYY-MM-DD（時刻なし） */
  date: string;
  /** 0 以外の円の整数。マイナスは取り消し（返品による返金など） */
  amount: number;
  categoryId: string;
  memo: string;
  /** 同じ日付の取引を、入力の新しい順に並べるための作成時刻（ms） */
  createdAt: number;
};

/** 保存しているデータ全体 */
export type KakeiboData = {
  transactions: Transaction[];
  categories: Category[];
};
