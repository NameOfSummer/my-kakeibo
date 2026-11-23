# CLAUDE.md

自分ひとり用の家計簿。データは IndexedDB にだけ保存し、サーバー・認証・同期はない。pages-web-app の構成（`../pages-web-app/CLAUDE.md`）に従う。リポジトリが `pages-web-app/` の外にあるのは、作成時の配置のまま。

- 用語の正: [GLOSSARY.md](GLOSSARY.md)（取引・費目・収支差などの言葉はここに合わせる）
- 保存先の決定: [docs/adr/0001-browser-only-storage.md](docs/adr/0001-browser-only-storage.md)
- デザインの正: `DESIGN.md`（dentsu。トークンは `src/index.css`）

## コマンド

`npm run dev` / `build` / `typecheck` / `lint` / `format` / `test`

## アーキテクチャ

- 起動時に `useKakeibo`（`src/hooks/`）が IndexedDB から全件をメモリに読み込む。変更は IndexedDB に書けてから state に反映する。
- 集計・検索・バックアップの検証などの純粋なロジックは `src/lib/`。画面は集計結果を表示するだけにする。
- `src/lib/db.ts` のスキーマを変えたら `DB_VERSION` を上げ、`onupgradeneeded` で移行する。バックアップの形を変えたら `backup.ts` の `BACKUP_VERSION` を上げる。

## 守ること（仕様から）

- 金額は 0 以外の円の整数。マイナスは取り消しで、符号は無視しない（集計も検索も）。
- 費目は削除しない（非表示にするだけ）。非表示の費目は集計・内訳・検索の絞り込みには含める。
- 初期費目の id は固定（`src/lib/defaults.ts`）。二重登録されても上書きになるようにするため。
- 作らないもの: 予算、定期取引、グラフ、CSV、支払方法、同期、複数利用者、費目の階層、外貨。

## 規約

- 1 ファイルにつき 1 コンポーネントとし、ファイル名は export 名と同じにする。
- アイコンは Heroicons（`@heroicons/react/24/outline`）。
- テストでは `fake-indexeddb` を使い、`src/test/setup.ts` でテストごとに空のデータベースにする。
