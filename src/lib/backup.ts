import { isValidDateString } from "./date";
import { CARD_LABEL, KINDS } from "./types";
import type {
  CardId,
  Category,
  KakeiboData,
  Kind,
  StoreRule,
  Transaction,
  TransactionSource,
} from "./types";

/** バックアップファイルの識別子 */
const BACKUP_FORMAT = "my-kakeibo-backup";

/** バックアップファイルの形式の版。形を変えたら上げる */
const BACKUP_VERSION = 2;

/** 店名ルールと取り込み元がない、読み込みだけ対応する古い版 */
const BACKUP_VERSION_WITHOUT_RULES = 1;

/**
 * 取引と費目をバックアップ用の JSON 文字列にする。
 * @param data 保存しているデータ全体
 * @param exportedAt 書き出した時刻
 * @returns {string} JSON 文字列
 */
export function createBackup(data: KakeiboData, exportedAt: Date): string {
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: exportedAt.toISOString(),
      categories: data.categories,
      transactions: data.transactions,
      storeRules: data.storeRules,
    },
    null,
    2,
  );
}

/**
 * 値がオブジェクト（配列と null を除く）かを判定する。
 * @param value 判定する値
 * @returns {boolean} オブジェクトなら true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 値が種別かを判定する。
 * @param value 判定する値
 * @returns {boolean} 種別なら true
 */
function isKind(value: unknown): value is Kind {
  return KINDS.some((k) => k === value);
}

/**
 * 値がカードかを判定する。
 * @param value 判定する値
 * @returns {boolean} カードなら true
 */
function isCardId(value: unknown): value is CardId {
  return typeof value === "string" && Object.hasOwn(CARD_LABEL, value);
}

/**
 * 1 件の費目を検証する。
 * @param value 読み込んだ値
 * @param index 何件目か（エラーの文言用）
 * @returns {Category} 検証済みの費目
 */
function parseCategory(value: unknown, index: number): Category {
  if (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id !== "" &&
    isKind(value.kind) &&
    typeof value.name === "string" &&
    value.name.trim() !== "" &&
    typeof value.hidden === "boolean" &&
    typeof value.order === "number" &&
    Number.isFinite(value.order)
  ) {
    return {
      id: value.id,
      kind: value.kind,
      name: value.name.trim(),
      hidden: value.hidden,
      order: value.order,
    };
  }
  throw new Error(`費目の ${index + 1} 件目の形が正しくありません`);
}

/**
 * 取引の取り込み元を検証する。
 * @param value 読み込んだ値
 * @param label エラーの文言に使う取引の名前
 * @returns {TransactionSource | undefined} 検証済みの取り込み元。手入力の取引なら undefined
 */
function parseSource(
  value: unknown,
  label: string,
): TransactionSource | undefined {
  if (value === undefined) return undefined;
  if (
    isRecord(value) &&
    isCardId(value.card) &&
    typeof value.storeName === "string" &&
    value.storeName.trim() !== ""
  ) {
    return { card: value.card, storeName: value.storeName };
  }
  throw new Error(`${label}の取り込み元の形が正しくありません`);
}

/**
 * 1 件の取引を検証する。
 * @param value 読み込んだ値
 * @param index 何件目か（エラーの文言用）
 * @param categories 検証済みの費目（id → 費目）
 * @returns {Transaction} 検証済みの取引
 */
function parseTransaction(
  value: unknown,
  index: number,
  categories: Map<string, Category>,
): Transaction {
  const label = `取引の ${index + 1} 件目`;
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id === "" ||
    !isKind(value.kind) ||
    typeof value.date !== "string" ||
    !isValidDateString(value.date) ||
    typeof value.amount !== "number" ||
    !Number.isSafeInteger(value.amount) ||
    value.amount === 0 ||
    typeof value.categoryId !== "string" ||
    typeof value.memo !== "string" ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt)
  ) {
    throw new Error(`${label}の形が正しくありません`);
  }
  if (categories.get(value.categoryId)?.kind !== value.kind) {
    throw new Error(`${label}の費目が見つからないか、種別が合いません`);
  }
  const source = parseSource(value.source, label);
  return {
    id: value.id,
    kind: value.kind,
    date: value.date,
    amount: value.amount,
    categoryId: value.categoryId,
    // メモは 1 行で扱う
    memo: value.memo.replace(/[\r\n]+/g, " "),
    createdAt: value.createdAt,
    ...(source !== undefined && { source }),
  };
}

/**
 * 1 件の店名ルールを検証する。
 * @param value 読み込んだ値
 * @param index 何件目か（エラーの文言用）
 * @param categories 検証済みの費目（id → 費目）
 * @returns {StoreRule} 検証済みの店名ルール
 */
function parseStoreRule(
  value: unknown,
  index: number,
  categories: Map<string, Category>,
): StoreRule {
  const label = `店名ルールの ${index + 1} 件目`;
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id === "" ||
    typeof value.keyword !== "string" ||
    value.keyword.trim() === "" ||
    typeof value.categoryId !== "string" ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt)
  ) {
    throw new Error(`${label}の形が正しくありません`);
  }
  if (categories.get(value.categoryId)?.kind !== "expense") {
    throw new Error(`${label}の費目が見つからないか、支出の費目ではありません`);
  }
  return {
    id: value.id,
    keyword: value.keyword.trim(),
    categoryId: value.categoryId,
    createdAt: value.createdAt,
  };
}

/**
 * id の重複がないことを確かめる。
 * @param items 検証する要素
 * @param label エラーの文言に使う名前
 * @returns {void}
 */
function assertUniqueIds(items: { id: string }[], label: string): void {
  if (new Set(items.map((x) => x.id)).size !== items.length) {
    throw new Error(`${label}の id が重複しています`);
  }
}

/**
 * バックアップファイルの中身を検証して、データ全体を返す。
 * @param text ファイルの中身
 * @returns {KakeiboData} 検証済みのデータ
 */
export function parseBackup(text: string): KakeiboData {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("JSON として読み込めません");
  }
  if (!isRecord(json) || json.format !== BACKUP_FORMAT) {
    throw new Error("家計簿のバックアップファイルではありません");
  }
  if (
    json.version !== BACKUP_VERSION &&
    json.version !== BACKUP_VERSION_WITHOUT_RULES
  ) {
    throw new Error("対応していない版のバックアップファイルです");
  }
  const rawRules =
    json.version === BACKUP_VERSION_WITHOUT_RULES ? [] : json.storeRules;
  if (
    !Array.isArray(json.categories) ||
    !Array.isArray(json.transactions) ||
    !Array.isArray(rawRules)
  ) {
    throw new Error("費目・取引・店名ルールの一覧がありません");
  }
  const categories = json.categories.map(parseCategory);
  assertUniqueIds(categories, "費目");
  const names = categories.map((c) => `${c.kind}:${c.name}`);
  if (new Set(names).size !== names.length) {
    throw new Error("同じ種別の中に同じ名前の費目があります");
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  const transactions = json.transactions.map((t, i) =>
    parseTransaction(t, i, byId),
  );
  assertUniqueIds(transactions, "取引");
  const storeRules = rawRules.map((r, i) => parseStoreRule(r, i, byId));
  assertUniqueIds(storeRules, "店名ルール");
  return { categories, transactions, storeRules };
}
