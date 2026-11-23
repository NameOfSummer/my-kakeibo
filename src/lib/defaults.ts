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
 * 初期費目を作る。id は固定にして、二重に登録しても同じ費目に上書きされるようにする。
 * @returns {Category[]} 初期費目
 */
export function createDefaultCategories(): Category[] {
  return (["expense", "income"] as const).flatMap((kind) =>
    DEFAULT_NAMES[kind].map((name, order) => ({
      id: `default-${kind}-${order}`,
      kind,
      name,
      hidden: false,
      order,
    })),
  );
}
