import type { Category, Kind } from "./types";

/**
 * 費目名を検証する。
 * @param name 入力された名前（前後の空白は除いて扱う）
 * @param kind 費目の種別
 * @param categories すべての費目
 * @param selfId 名前を変える費目の id（追加なら null）
 * @returns {string | null} エラーの文言。問題なければ null
 */
export function validateCategoryName(
  name: string,
  kind: Kind,
  categories: Category[],
  selfId: string | null,
): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "費目名を入力してください";
  const isDuplicate = categories.some(
    (c) => c.kind === kind && c.id !== selfId && c.name === trimmed,
  );
  return isDuplicate ? "同じ名前の費目があります" : null;
}

/**
 * 新しい費目の表示順（同じ種別の最後）を返す。
 * @param kind 種別
 * @param categories すべての費目
 * @returns {number} order の値
 */
export function nextOrder(kind: Kind, categories: Category[]): number {
  return (
    Math.max(
      -1,
      ...categories.filter((c) => c.kind === kind).map((c) => c.order),
    ) + 1
  );
}
