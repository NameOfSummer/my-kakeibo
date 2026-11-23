/**
 * id が同じ要素を置き換え、なければ末尾に足す。
 * @param list 元の配列
 * @param item 入れる要素
 * @returns {T[]} 新しい配列
 */
export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}
