import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import {
  deleteStoreRule,
  deleteTransaction,
  loadAll,
  openDb,
  putCategory,
  putStoreRule,
  putTransaction,
  putTransactions,
  replaceAll,
} from "./db";

describe("db", () => {
  it("初回は初期費目を登録し、二度目以降は保存した内容を読む", async () => {
    const db = await openDb();
    const first = await loadAll(db);
    expect(first.transactions).toEqual([]);
    expect(first.categories.filter((c) => c.kind === "expense")).toHaveLength(
      10,
    );
    expect(first.categories.filter((c) => c.kind === "income")).toHaveLength(3);

    const t = makeTransaction({ categoryId: first.categories[0].id });
    await putTransaction(db, t);
    await putCategory(db, { ...first.categories[0], hidden: true });
    const second = await loadAll(db);
    expect(second.transactions).toEqual([t]);
    expect(second.categories.find((c) => c.id === t.categoryId)?.hidden).toBe(
      true,
    );

    await deleteTransaction(db, t.id);
    expect((await loadAll(db)).transactions).toEqual([]);
    db.close();
  });

  it("置き換えは今のデータをすべて消してから入れる", async () => {
    const db = await openDb();
    await loadAll(db);
    const t = makeTransaction({});
    await replaceAll(db, {
      categories: TEST_CATEGORIES,
      transactions: [t],
      storeRules: [],
    });
    const loaded = await loadAll(db);
    expect(loaded.transactions).toEqual([t]);
    expect(loaded.categories.map((c) => c.id).sort()).toEqual([
      "food",
      "old",
      "salary",
    ]);
    db.close();
  });

  it("取引のまとめての追加と、店名ルールの保存・削除", async () => {
    const db = await openDb();
    await loadAll(db);
    const ts = [
      makeTransaction({ source: { card: "recruit", storeName: "ダイソ－" } }),
      makeTransaction({}),
    ];
    const rule = {
      id: "r",
      keyword: "ダイソ",
      categoryId: "food",
      createdAt: 0,
    };
    await putTransactions(db, ts);
    await putStoreRule(db, rule);
    const loaded = await loadAll(db);
    expect(loaded.transactions).toHaveLength(2);
    expect(loaded.transactions).toEqual(expect.arrayContaining(ts));
    expect(loaded.storeRules).toEqual([rule]);

    await deleteStoreRule(db, "r");
    expect((await loadAll(db)).storeRules).toEqual([]);
    db.close();
  });

  it("版 1 のデータベースは取引と費目を残したまま版 2 に上げる", async () => {
    const t = makeTransaction({});
    // 版 1 のスキーマ（取引と費目のストアだけ）を作って 1 件入れる
    const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-kakeibo", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("transactions", { keyPath: "id" });
        request.result.createObjectStore("categories", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = v1.transaction(["transactions", "categories"], "readwrite");
    tx.objectStore("transactions").put(t);
    for (const c of TEST_CATEGORIES) tx.objectStore("categories").put(c);
    await new Promise((resolve) => (tx.oncomplete = resolve));
    v1.close();

    const db = await openDb();
    const loaded = await loadAll(db);
    expect(loaded.transactions).toEqual([t]);
    expect(loaded.categories).toHaveLength(TEST_CATEGORIES.length);
    expect(loaded.storeRules).toEqual([]);
    db.close();
  });
});
