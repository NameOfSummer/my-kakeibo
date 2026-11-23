import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import {
  excludeImported,
  parseStatement,
  pickCategoryId,
  validateStoreRuleKeyword,
} from "./cardImport";
import { createDefaultCategories, OTHER_EXPENSE_ID } from "./defaults";
import type { Category, StoreRule } from "./types";

/** リクルートカードの利用明細 CSV（実際のファイルと同じ形。中身は架空） */
const RECRUIT_CSV = [
  '"確定情報","お支払日","ご利用店名（海外ご利用店名／海外都市名）","ご利用者","ご利用日","ご利用金額（円）","現地通貨額・通貨名称・換算レート"',
  ',,"　＊＊＊　　　　　通常払いご利用明細　　　　　＊＊＊",,,,',
  '"確定","2025年10月10日","ダイソ－","1050","2025年8月16日","2,314",',
  '"確定","2025年10月10日","ＡＭＡＺＯＮ．ＣＯ．ＪＰ","1050","2025年8月16日","5,962",',
  '"確定","2025年10月10日","ＡＭＡＺＯＮ．ＣＯ．ＪＰ","1050","2025年8月16日","5,962",',
  '"確定","2025年10月10日","ＡＭＡＺＯＮ．ＣＯ．ＪＰ","1050","2025年9月1日","-1,000",',
  '"未確定","2025年11月10日","ニトリネツト","1050","2025年9月15日","15,380",',
  ',,"　＊＊＊　　　　　通常払いご利用合計",,,"27,618","　＊＊＊"',
  "",
].join("\r\n");

describe("parseStatement", () => {
  it("リクルートカードの確定した明細だけを読み、見出しと合計の行は飛ばす", () => {
    const s = parseStatement(RECRUIT_CSV);
    expect(s.card).toBe("recruit");
    expect(s.unconfirmedCount).toBe(1);
    expect(s.rows).toEqual([
      { date: "2025-08-16", storeName: "ダイソ－", amount: 2314 },
      {
        date: "2025-08-16",
        storeName: "ＡＭＡＺＯＮ．ＣＯ．ＪＰ",
        amount: 5962,
      },
      {
        date: "2025-08-16",
        storeName: "ＡＭＡＺＯＮ．ＣＯ．ＪＰ",
        amount: 5962,
      },
      // マイナスは取り消しとして符号を残す
      {
        date: "2025-09-01",
        storeName: "ＡＭＡＺＯＮ．ＣＯ．ＪＰ",
        amount: -1000,
      },
    ]);
  });

  it("対応していない形式や、読めない明細行はエラーにする", () => {
    expect(() => parseStatement('"日付","金額"\n"2025/1/1","100"')).toThrow(
      "対応しているカード",
    );
    expect(() =>
      parseStatement(RECRUIT_CSV.replace("2025年8月16日", "2025年2月30日")),
    ).toThrow("3 行目");
  });
});

describe("excludeImported", () => {
  it("カード・利用日・店名・金額が同じ取引の件数ぶんだけ除く", () => {
    const amazon = {
      card: "recruit",
      storeName: "ＡＭＡＺＯＮ．ＣＯ．ＪＰ",
    } as const;
    const transactions = [
      makeTransaction({ date: "2025-08-16", amount: 5962, source: amazon }),
      // 店名がメモにあるだけの手入力の取引は、取り込み済みとみなさない
      makeTransaction({ date: "2025-08-16", amount: 2314, memo: "ダイソ－" }),
      // 別のカードの取引は別物
      makeTransaction({
        date: "2025-08-16",
        amount: 2314,
        source: { card: "rakuten", storeName: "ダイソ－" },
      }),
    ];
    const { rows, duplicateCount } = excludeImported(
      parseStatement(RECRUIT_CSV),
      transactions,
    );
    expect(duplicateCount).toBe(1);
    expect(rows.map((r) => r.amount)).toEqual([2314, 5962, -1000]);
  });
});

describe("pickCategoryId", () => {
  const categories: Category[] = [
    ...createDefaultCategories(),
    ...TEST_CATEGORIES.filter((c) => c.id !== "food"),
    { id: "food", kind: "expense", name: "食費2", hidden: false, order: 20 },
  ];
  const rule = (
    keyword: string,
    categoryId: string,
    createdAt = 0,
  ): StoreRule => ({ id: keyword, keyword, categoryId, createdAt });

  it("全角半角・大小を区別せずに当て、長いキーワードを優先する", () => {
    const rules = [
      rule("amazon", "default-expense-1"),
      rule("AMAZON.CO.JP", "food"),
    ];
    expect(pickCategoryId("ＡＭＡＺＯＮ．ＣＯ．ＪＰ", rules, categories)).toBe(
      "food",
    );
  });

  it("同じ長さなら先に作ったルール、当たらなければ「その他」", () => {
    const rules = [
      rule("ダイ", "food", 2),
      rule("ソ－", "default-expense-1", 1),
    ];
    expect(pickCategoryId("ダイソ－", rules, categories)).toBe(
      "default-expense-1",
    );
    expect(pickCategoryId("ニトリ", rules, categories)).toBe(OTHER_EXPENSE_ID);
  });

  it("非表示の費目を指すルールは使わず、「その他」も非表示なら空", () => {
    const hidden = categories.map((c) =>
      c.id === "old" || c.id === OTHER_EXPENSE_ID ? { ...c, hidden: true } : c,
    );
    expect(pickCategoryId("ダイソ－", [rule("ダイソ", "old")], hidden)).toBe(
      "",
    );
  });
});

describe("validateStoreRuleKeyword", () => {
  it("空と、全角半角・大小の違いだけの重複を拒む", () => {
    const rules: StoreRule[] = [
      { id: "a", keyword: "Amazon", categoryId: "food", createdAt: 0 },
    ];
    expect(validateStoreRuleKeyword("  ", rules)).not.toBeNull();
    expect(validateStoreRuleKeyword("ＡＭＡＺＯＮ", rules)).not.toBeNull();
    expect(validateStoreRuleKeyword("ニトリ", rules)).toBeNull();
  });
});
