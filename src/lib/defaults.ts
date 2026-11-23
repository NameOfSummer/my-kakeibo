import type { Category, Kind } from "./types";

/** 初期費目の名前（handoff.md の「初期費目」） */
const DEFAULT_NAMES: Record<Kind, readonly string[]> = {
  expense: [
    "食費",
    "日用品",
    "住居費",
    "水道光熱費",
    "通信費",
    "交通費",
    "交際費",
    "趣味",
    "医療費",
    "その他",
  ],
  income: ["給与", "賞与", "その他"],
};

/**
 * 初期費目の id を作る。
 * @param kind 種別
 * @param order 種別の中での順番
 * @returns {string} id
 */
function defaultId(kind: Kind, order: number): string {
  return `default-${kind}-${order}`;
}

/** 支出の初期費目「その他」の id。店名ルールに当たらない取り込みに使う */
export const OTHER_EXPENSE_ID = defaultId(
  "expense",
  DEFAULT_NAMES.expense.indexOf("その他"),
);

/**
 * 初期費目を作る。id は固定にして、二重に登録しても同じ費目に上書きされるようにする。
 * @returns {Category[]} 初期費目
 */
export function createDefaultCategories(): Category[] {
  return (["expense", "income"] as const).flatMap((kind) =>
    DEFAULT_NAMES[kind].map((name, order) => ({
      id: defaultId(kind, order),
      kind,
      name,
      hidden: false,
      order,
    })),
  );
}
