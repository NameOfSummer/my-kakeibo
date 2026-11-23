import type { Category, Transaction } from "@/lib/types";

/**
 * テスト用の取引を作る。
 * @param overrides 上書きする項目
 * @returns {Transaction} 取引
 */
export function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    kind: "expense",
    date: "2025-05-10",
    amount: 1000,
    categoryId: "food",
    memo: "",
    createdAt: 0,
    ...overrides,
  };
}

/** テスト用の費目 */
export const TEST_CATEGORIES: Category[] = [
  { id: "food", kind: "expense", name: "食費", hidden: false, order: 0 },
  { id: "old", kind: "expense", name: "Ｓｕｂｓｃ", hidden: true, order: 1 },
  { id: "salary", kind: "income", name: "給与", hidden: false, order: 0 },
];
