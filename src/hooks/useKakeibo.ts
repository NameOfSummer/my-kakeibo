import { useCallback, useEffect, useRef, useState } from "react";
import { upsertById } from "@/lib/collection";
import * as store from "@/lib/db";
import type { Category, KakeiboData, Transaction } from "@/lib/types";

/** 読み込みの状態 */
type LoadState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "ready"; data: KakeiboData };

/** useKakeibo の戻り値 */
export type Kakeibo = {
  state: LoadState;
  /** 直近の保存の失敗。なければ null */
  error: string | null;
  clearError: () => void;
  /** 以下の操作は保存できたら true、失敗したら error を設定して false を返す */
  saveTransaction: (t: Transaction) => Promise<boolean>;
  removeTransaction: (id: string) => Promise<boolean>;
  saveCategory: (c: Category) => Promise<boolean>;
  replaceData: (data: KakeiboData) => Promise<boolean>;
};

/**
 * 例外を表示用の文言にする。
 * @param e 例外
 * @returns {string} 文言
 */
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * IndexedDB のデータを読み込み、保存してから画面の状態に反映する操作を提供する。
 * @returns {Kakeibo} データと操作
 */
export function useKakeibo(): Kakeibo {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let opened: IDBDatabase | null = null;
    (async () => {
      try {
        const db = await store.openDb();
        // StrictMode などで先に片付けられていたら、開いた接続をすぐ閉じる
        if (isCancelled) {
          db.close();
          return;
        }
        opened = db;
        const data = await store.loadAll(db);
        if (isCancelled) return;
        dbRef.current = db;
        setState({ status: "ready", data });
      } catch (e) {
        if (!isCancelled) setState({ status: "failed", message: messageOf(e) });
      }
    })();
    return () => {
      isCancelled = true;
      opened?.close();
      dbRef.current = null;
    };
  }, []);

  const write = useCallback(
    async (
      save: (db: IDBDatabase) => Promise<void>,
      apply: (data: KakeiboData) => KakeiboData,
    ): Promise<boolean> => {
      const db = dbRef.current;
      if (db === null) return false;
      try {
        await save(db);
      } catch (e) {
        setError(`保存できませんでした: ${messageOf(e)}`);
        return false;
      }
      setState((s) =>
        s.status === "ready" ? { ...s, data: apply(s.data) } : s,
      );
      return true;
    },
    [],
  );

  return {
    state,
    error,
    clearError: useCallback(() => setError(null), []),
    saveTransaction: useCallback(
      (t) =>
        write(
          (db) => store.putTransaction(db, t),
          (d) => ({ ...d, transactions: upsertById(d.transactions, t) }),
        ),
      [write],
    ),
    removeTransaction: useCallback(
      (id) =>
        write(
          (db) => store.deleteTransaction(db, id),
          (d) => ({
            ...d,
            transactions: d.transactions.filter((t) => t.id !== id),
          }),
        ),
      [write],
    ),
    saveCategory: useCallback(
      (c) =>
        write(
          (db) => store.putCategory(db, c),
          (d) => ({ ...d, categories: upsertById(d.categories, c) }),
        ),
      [write],
    ),
    replaceData: useCallback(
      (data) =>
        write(
          (db) => store.replaceAll(db, data),
          () => data,
        ),
      [write],
    ),
  };
}
