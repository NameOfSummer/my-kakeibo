import { describe, expect, it } from "vitest";
import { makeTransaction, TEST_CATEGORIES } from "@/test/factories";
import {
  deleteTransaction,
  loadAll,
  openDb,
  putCategory,
  putTransaction,
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
    await replaceAll(db, { categories: TEST_CATEGORIES, transactions: [t] });
    const loaded = await loadAll(db);
    expect(loaded.transactions).toEqual([t]);
    expect(loaded.categories.map((c) => c.id).sort()).toEqual([
      "food",
      "old",
      "salary",
    ]);
    db.close();
  });
});
