import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";

// jsdom には IndexedDB がないため fake-indexeddb を使い、テストごとに空のデータベースにする。
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

// globals: false のため、Testing Library の自動 cleanup が効かない。テストごとに DOM を片付ける。
afterEach(() => {
  cleanup();
});
