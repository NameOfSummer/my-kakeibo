import { createDefaultCategories } from "./defaults";
import type { Category, KakeiboData, StoreRule, Transaction } from "./types";

/** IndexedDB のデータベース名 */
const DB_NAME = "my-kakeibo";

/** スキーマの版。ストアや index を変えたら上げて onupgradeneeded で移行する */
const DB_VERSION = 2;

/** 取引のストア名 */
const TRANSACTIONS = "transactions";

/** 費目のストア名 */
const CATEGORIES = "categories";

/** 店名ルールのストア名（版 2 で追加） */
const STORE_RULES = "storeRules";

/** ストア名 */
type StoreName = typeof TRANSACTIONS | typeof CATEGORIES | typeof STORE_RULES;

/**
 * IDBRequest の完了を Promise で待つ。
 * @param request リクエスト
 * @returns {Promise<T>} リクエストの結果
 */
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * トランザクションの確定を Promise で待つ。
 * @param tx トランザクション
 * @returns {Promise<void>} 確定したら解決する
 */
function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

/**
 * データベースを開く（なければ作る）。
 * @returns {Promise<IDBDatabase>} 開いたデータベース
 */
export function openDb(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = (e) => {
    const db = request.result;
    // 版 1 → 2 は店名ルールのストアを足すだけ。取り込み元（source）は任意の項目なので既存の取引は変えない
    if (e.oldVersion < 1) {
      db.createObjectStore(TRANSACTIONS, { keyPath: "id" });
      db.createObjectStore(CATEGORIES, { keyPath: "id" });
    }
    if (e.oldVersion < 2) db.createObjectStore(STORE_RULES, { keyPath: "id" });
  };
  return result(request);
}

/**
 * すべての取引と費目を読み込む。費目が 1 件もなければ初期費目を登録する。
 * @param db データベース
 * @returns {Promise<KakeiboData>} データ全体
 */
export async function loadAll(db: IDBDatabase): Promise<KakeiboData> {
  const tx = db.transaction(
    [TRANSACTIONS, CATEGORIES, STORE_RULES],
    "readonly",
  );
  const [transactions, categories, storeRules] = await Promise.all([
    result<Transaction[]>(tx.objectStore(TRANSACTIONS).getAll()),
    result<Category[]>(tx.objectStore(CATEGORIES).getAll()),
    result<StoreRule[]>(tx.objectStore(STORE_RULES).getAll()),
  ]);
  if (categories.length > 0) return { transactions, categories, storeRules };

  const defaults = createDefaultCategories();
  const write = db.transaction(CATEGORIES, "readwrite");
  for (const c of defaults) write.objectStore(CATEGORIES).put(c);
  await committed(write);
  return { transactions, categories: defaults, storeRules };
}

/**
 * 1 件を追加または上書きする。
 * @param db データベース
 * @param store ストア名
 * @param value 保存する値
 * @returns {Promise<void>} 保存が確定したら解決する
 */
async function put(
  db: IDBDatabase,
  store: StoreName,
  value: Transaction | Category | StoreRule,
): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value);
  await committed(tx);
}

/**
 * 取引を追加または上書きする。
 * @param db データベース
 * @param transaction 取引
 * @returns {Promise<void>} 保存が確定したら解決する
 */
export function putTransaction(
  db: IDBDatabase,
  transaction: Transaction,
): Promise<void> {
  return put(db, TRANSACTIONS, transaction);
}

/**
 * 費目を追加または上書きする。
 * @param db データベース
 * @param category 費目
 * @returns {Promise<void>} 保存が確定したら解決する
 */
export function putCategory(
  db: IDBDatabase,
  category: Category,
): Promise<void> {
  return put(db, CATEGORIES, category);
}

/**
 * 複数の取引をまとめて追加する。1 つのトランザクションで行うので、途中で失敗したら 1 件も入らない。
 * @param db データベース
 * @param transactions 取引
 * @returns {Promise<void>} 保存が確定したら解決する
 */
export async function putTransactions(
  db: IDBDatabase,
  transactions: Transaction[],
): Promise<void> {
  const tx = db.transaction(TRANSACTIONS, "readwrite");
  for (const t of transactions) tx.objectStore(TRANSACTIONS).put(t);
  await committed(tx);
}

/**
 * 店名ルールを追加または上書きする。
 * @param db データベース
 * @param rule 店名ルール
 * @returns {Promise<void>} 保存が確定したら解決する
 */
export function putStoreRule(db: IDBDatabase, rule: StoreRule): Promise<void> {
  return put(db, STORE_RULES, rule);
}

/**
 * 取引を削除する。
 * @param db データベース
 * @param id 取引の id
 * @returns {Promise<void>} 削除が確定したら解決する
 */
export async function deleteTransaction(
  db: IDBDatabase,
  id: string,
): Promise<void> {
  const tx = db.transaction(TRANSACTIONS, "readwrite");
  tx.objectStore(TRANSACTIONS).delete(id);
  await committed(tx);
}

/**
 * 店名ルールを削除する。
 * @param db データベース
 * @param id 店名ルールの id
 * @returns {Promise<void>} 削除が確定したら解決する
 */
export async function deleteStoreRule(
  db: IDBDatabase,
  id: string,
): Promise<void> {
  const tx = db.transaction(STORE_RULES, "readwrite");
  tx.objectStore(STORE_RULES).delete(id);
  await committed(tx);
}

/**
 * 取引・費目・店名ルールをすべて置き換える。1 つのトランザクションで行うので、途中で失敗したら元のまま残る。
 * @param db データベース
 * @param data 新しいデータ全体
 * @returns {Promise<void>} 置き換えが確定したら解決する
 */
export async function replaceAll(
  db: IDBDatabase,
  data: KakeiboData,
): Promise<void> {
  const tx = db.transaction(
    [TRANSACTIONS, CATEGORIES, STORE_RULES],
    "readwrite",
  );
  const transactions = tx.objectStore(TRANSACTIONS);
  const categories = tx.objectStore(CATEGORIES);
  const storeRules = tx.objectStore(STORE_RULES);
  transactions.clear();
  categories.clear();
  storeRules.clear();
  for (const c of data.categories) categories.put(c);
  for (const t of data.transactions) transactions.put(t);
  for (const r of data.storeRules) storeRules.put(r);
  await committed(tx);
}
