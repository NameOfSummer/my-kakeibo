import { createDefaultCategories } from "./defaults";
import type { Category, KakeiboData, Transaction } from "./types";

/** IndexedDB のデータベース名 */
const DB_NAME = "my-kakeibo";

/** スキーマの版。ストアや index を変えたら上げて onupgradeneeded で移行する */
const DB_VERSION = 1;

/** 取引のストア名 */
const TRANSACTIONS = "transactions";

/** 費目のストア名 */
const CATEGORIES = "categories";

/** ストア名 */
type StoreName = typeof TRANSACTIONS | typeof CATEGORIES;

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
  request.onupgradeneeded = () => {
    const db = request.result;
    db.createObjectStore(TRANSACTIONS, { keyPath: "id" });
    db.createObjectStore(CATEGORIES, { keyPath: "id" });
  };
  return result(request);
}

/**
 * すべての取引と費目を読み込む。費目が 1 件もなければ初期費目を登録する。
 * @param db データベース
 * @returns {Promise<KakeiboData>} データ全体
 */
export async function loadAll(db: IDBDatabase): Promise<KakeiboData> {
  const tx = db.transaction([TRANSACTIONS, CATEGORIES], "readonly");
  const [transactions, categories] = await Promise.all([
    result<Transaction[]>(tx.objectStore(TRANSACTIONS).getAll()),
    result<Category[]>(tx.objectStore(CATEGORIES).getAll()),
  ]);
  if (categories.length > 0) return { transactions, categories };

  const defaults = createDefaultCategories();
  const write = db.transaction(CATEGORIES, "readwrite");
  for (const c of defaults) write.objectStore(CATEGORIES).put(c);
  await committed(write);
  return { transactions, categories: defaults };
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
  value: Transaction | Category,
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
 * 取引と費目をすべて置き換える。1 つのトランザクションで行うので、途中で失敗したら元のまま残る。
 * @param db データベース
 * @param data 新しいデータ全体
 * @returns {Promise<void>} 置き換えが確定したら解決する
 */
export async function replaceAll(
  db: IDBDatabase,
  data: KakeiboData,
): Promise<void> {
  const tx = db.transaction([TRANSACTIONS, CATEGORIES], "readwrite");
  const transactions = tx.objectStore(TRANSACTIONS);
  const categories = tx.objectStore(CATEGORIES);
  transactions.clear();
  categories.clear();
  for (const c of data.categories) categories.put(c);
  for (const t of data.transactions) transactions.put(t);
  await committed(tx);
}
