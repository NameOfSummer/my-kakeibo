import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import { createBackup, parseBackup } from "./backup";

/** テスト用のデータ */
const data = {
  categories: TEST_CATEGORIES,
  storeRules: [
    { id: "r", keyword: "AMAZON", categoryId: "food", createdAt: 1 },
  ],
  transactions: [
    makeTransaction({ id: "a", amount: -300, memo: "返品" }),
    makeTransaction({ id: "b", kind: "income", categoryId: "salary" }),
    makeTransaction({
      id: "c",
      source: { card: "recruit", storeName: "ＡＭＡＺＯＮ．ＣＯ．ＪＰ" },
    }),
  ],
};

/**
 * バックアップの JSON を書き換えて文字列に戻す。
 * @param edit 書き換える処理
 * @returns {string} JSON 文字列
 */
function tampered(
  edit: (json: Record<string, Record<string, unknown>[]>) => void,
): string {
  const json = JSON.parse(createBackup(data, new Date(0)));
  edit(json);
  return JSON.stringify(json);
}

describe("backup", () => {
  it("書き出したものをそのまま読み込める", () => {
    expect(parseBackup(createBackup(data, new Date(0)))).toEqual(data);
  });

  it("店名ルールがない版 1 のバックアップも読み込める", () => {
    const v1 = tampered((j) => {
      Object.assign(j, { version: 1, storeRules: undefined });
    });
    expect(parseBackup(v1).storeRules).toEqual([]);
  });

  it.each([
    ["JSON でない", "{"],
    ["形式が違う", JSON.stringify({ format: "other" })],
    [
      "金額が 0",
      tampered((j) => Object.assign(j.transactions[0], { amount: 0 })),
    ],
    [
      "金額が小数",
      tampered((j) => Object.assign(j.transactions[0], { amount: 1.5 })),
    ],
    [
      "日付が不正",
      tampered((j) => Object.assign(j.transactions[0], { date: "2025-02-30" })),
    ],
    [
      "費目がない",
      tampered((j) => Object.assign(j.transactions[0], { categoryId: "none" })),
    ],
    [
      "種別と費目が合わない",
      tampered((j) => Object.assign(j.transactions[0], { kind: "income" })),
    ],
    [
      "費目名が重複",
      tampered((j) => Object.assign(j.categories[1], { name: "食費" })),
    ],
    [
      "カードが不明",
      tampered((j) =>
        Object.assign(j.transactions[2], {
          source: { card: "unknown", storeName: "x" },
        }),
      ),
    ],
    [
      "店名ルールの費目が収入",
      tampered((j) => Object.assign(j.storeRules[0], { categoryId: "salary" })),
    ],
    [
      "版 2 なのに店名ルールの一覧がない",
      tampered((j) => Object.assign(j, { storeRules: undefined })),
    ],
    [
      "取引の id が重複",
      tampered((j) => Object.assign(j.transactions[1], { id: "a" })),
    ],
  ])("%s なら読み込まない", (_, text) => {
    expect(() => parseBackup(text)).toThrow();
  });
});
