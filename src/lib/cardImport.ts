import { parseAmount } from "./amount";
import { parseCsv } from "./csv";
import { isValidDateString } from "./date";
import { OTHER_EXPENSE_ID } from "./defaults";
import { normalizeText } from "./search";
import type { CardId, Category, StoreRule, Transaction } from "./types";

/** 利用明細の 1 件 */
export type StatementRow = {
  /** 利用日（YYYY-MM-DD） */
  date: string;
  storeName: string;
  amount: number;
};

/** 読み取った利用明細 */
export type Statement = {
  card: CardId;
  /** 確定した明細（ファイルの順） */
  rows: StatementRow[];
  /** 確定していないため飛ばした件数 */
  unconfirmedCount: number;
};

/** リクルートカードの利用明細 CSV の見出し（先頭から 6 列） */
const RECRUIT_HEADER = [
  "確定情報",
  "お支払日",
  "ご利用店名（海外ご利用店名／海外都市名）",
  "ご利用者",
  "ご利用日",
  "ご利用金額（円）",
];

/** リクルートカードの利用明細 CSV の列の位置 */
const RECRUIT_COLUMN = { status: 0, storeName: 2, date: 4, amount: 5 };

/** リクルートカードの明細で、確定した行の「確定情報」 */
const RECRUIT_CONFIRMED = "確定";

/** 「2025年8月16日」の形 */
const JAPANESE_DATE_PATTERN = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/;

/**
 * 「2025年8月16日」を YYYY-MM-DD にする。
 * @param text 日付の文字列
 * @returns {string | null} YYYY-MM-DD。実在しない日付や形が違えば null
 */
function parseJapaneseDate(text: string): string | null {
  const match = JAPANESE_DATE_PATTERN.exec(text.trim());
  if (match === null) return null;
  const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return isValidDateString(date) ? date : null;
}

/**
 * リクルートカードの明細行を読む。見出し・合計の行（「確定情報」が空）は飛ばす。
 * @param rows 見出しを除いた行
 * @returns {Statement} 読み取った利用明細
 */
function parseRecruit(rows: string[][]): Statement {
  const result: StatementRow[] = [];
  let unconfirmedCount = 0;
  rows.forEach((row, i) => {
    const status = row[RECRUIT_COLUMN.status].trim();
    if (status === "") return;
    if (status !== RECRUIT_CONFIRMED) {
      unconfirmedCount++;
      return;
    }
    const date = parseJapaneseDate(row[RECRUIT_COLUMN.date] ?? "");
    const amount = parseAmount(row[RECRUIT_COLUMN.amount] ?? "");
    const storeName = (row[RECRUIT_COLUMN.storeName] ?? "").trim();
    if (date === null || amount === null || storeName === "") {
      throw new Error(`${i + 2} 行目の利用日・店名・金額を読み取れません`);
    }
    // 取引の金額は 0 以外なので、0 円の明細は取り込まない
    if (amount !== 0) result.push({ date, storeName, amount });
  });
  return { card: "recruit", rows: result, unconfirmedCount };
}

/**
 * 利用明細 CSV を読む。見出しからカードを判定する。
 * @param text CSV の文字列
 * @returns {Statement} 読み取った利用明細
 */
export function parseStatement(text: string): Statement {
  const [header, ...rows] = parseCsv(text);
  if (header !== undefined && RECRUIT_HEADER.every((h, i) => header[i] === h)) {
    return parseRecruit(rows);
  }
  throw new Error("対応しているカードの利用明細 CSV ではありません");
}

/**
 * 重複の判定に使うキー。
 * @param card カード
 * @param row 利用日・店名・金額
 * @returns {string} キー
 */
function duplicateKey(card: CardId, row: StatementRow): string {
  return JSON.stringify([card, row.date, row.storeName, row.amount]);
}

/**
 * 取り込み済みの明細を除く。カード・利用日・店名・金額が同じ取引を持っている件数ぶんだけ除くので、
 * 同じ日に同じ店で同じ金額を 2 回使った明細も、2 件目は取り込める。
 * @param statement 利用明細
 * @param transactions すべての取引
 * @returns {{ rows: StatementRow[]; duplicateCount: number }} 取り込む明細と、除いた件数
 */
export function excludeImported(
  statement: Statement,
  transactions: Transaction[],
): { rows: StatementRow[]; duplicateCount: number } {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    if (t.source === undefined) continue;
    const key = duplicateKey(t.source.card, {
      date: t.date,
      storeName: t.source.storeName,
      amount: t.amount,
    });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows: StatementRow[] = [];
  for (const row of statement.rows) {
    const key = duplicateKey(statement.card, row);
    const count = counts.get(key) ?? 0;
    if (count > 0) counts.set(key, count - 1);
    else rows.push(row);
  }
  return { rows, duplicateCount: statement.rows.length - rows.length };
}

/**
 * 店名ルールから取り込み時の費目を決める。当たったルールのうちキーワードが最も長いものを使う。
 * 非表示の費目を指すルールは使わない。どれにも当たらなければ支出の「その他」（非表示なら空）。
 * @param storeName 店名
 * @param rules すべての店名ルール
 * @param categories すべての費目
 * @returns {string} 費目の id。決まらなければ空文字
 */
export function pickCategoryId(
  storeName: string,
  rules: StoreRule[],
  categories: Category[],
): string {
  const selectable = new Set(
    categories
      .filter((c) => c.kind === "expense" && !c.hidden)
      .map((c) => c.id),
  );
  const name = normalizeText(storeName);
  const [hit] = rules
    .map((r) => ({ rule: r, keyword: normalizeText(r.keyword) }))
    .filter(
      (x) => selectable.has(x.rule.categoryId) && name.includes(x.keyword),
    )
    .sort(
      (a, b) =>
        b.keyword.length - a.keyword.length ||
        a.rule.createdAt - b.rule.createdAt,
    );
  if (hit !== undefined) return hit.rule.categoryId;
  return selectable.has(OTHER_EXPENSE_ID) ? OTHER_EXPENSE_ID : "";
}

/**
 * 店名ルールのキーワードを検証する。全角と半角、大文字と小文字の違いだけのものも重複とみなす。
 * @param keyword 入力されたキーワード（前後の空白は除いて扱う）
 * @param rules すべての店名ルール
 * @returns {string | null} エラーの文言。問題なければ null
 */
export function validateStoreRuleKeyword(
  keyword: string,
  rules: StoreRule[],
): string | null {
  const normalized = normalizeText(keyword.trim());
  if (normalized === "") return "キーワードを入力してください";
  return rules.some((r) => normalizeText(r.keyword) === normalized)
    ? "同じキーワードの店名ルールがあります"
    : null;
}
