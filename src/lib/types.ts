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
  /** 取り込み元（カードと店名）。取り込んだ取引だけが持ち、編集できない */
  source?: TransactionSource;
};

/** 取り込み元になるカード。CSV の形式ごとに固定（ADR 0002） */
export type CardId = "rakuten" | "recruit" | "bic-suica";

/** カードの表示名 */
export const CARD_LABEL: Record<CardId, string> = {
  rakuten: "楽天カード",
  recruit: "リクルートカード",
  "bic-suica": "ビックカメラSuicaカード",
};

/** 取り込んだ取引の取り込み元 */
export type TransactionSource = {
  card: CardId;
  /** 利用明細に載っている店名（そのままの表記） */
  storeName: string;
};

/** 店名ルール。店名に keyword を含めば、取り込み時の費目を categoryId にする */
export type StoreRule = {
  id: string;
  keyword: string;
  /** 支出の費目 */
  categoryId: string;
  /** 同じ長さのキーワードが当たったときに、先に作ったほうを使うための作成時刻（ms） */
  createdAt: number;
};

/** 保存しているデータ全体 */
export type KakeiboData = {
  transactions: Transaction[];
  categories: Category[];
  storeRules: StoreRule[];
};
