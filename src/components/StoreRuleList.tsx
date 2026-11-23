import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { sortCategories } from "@/lib/aggregate";
import { validateStoreRuleKeyword } from "@/lib/cardImport";
import { FIELD_CLASS } from "@/lib/styles";
import type { Category, StoreRule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/** コンポーネントの props */
type Props = {
  storeRules: StoreRule[];
  categories: Category[];
  /** 以下は保存・削除できたら true を返す */
  onSave: (r: StoreRule) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
};

/**
 * 店名ルールの一覧と追加欄。費目の変更と削除ができる。
 * @param props 店名ルール・すべての費目・保存と削除の処理
 * @returns {JSX.Element} 店名ルールの一覧
 */
export function StoreRuleList({
  storeRules,
  categories,
  onSave,
  onRemove,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const expense = sortCategories(categories).filter(
    (c) => c.kind === "expense",
  );
  const options = expense.filter((c) => !c.hidden);
  const rules = [...storeRules].sort((a, b) => a.createdAt - b.createdAt);

  /**
   * 入力を検証して店名ルールを追加する。
   * @returns {Promise<void>} 保存の完了
   */
  async function add(): Promise<void> {
    const message =
      validateStoreRuleKeyword(keyword, storeRules) ??
      (options.some((c) => c.id === categoryId)
        ? null
        : "費目を選んでください");
    setError(message);
    if (message !== null) return;
    const isSaved = await onSave({
      id: crypto.randomUUID(),
      keyword: keyword.trim(),
      categoryId,
      createdAt: Date.now(),
    });
    if (isSaved) {
      setKeyword("");
      setCategoryId("");
    }
  }

  return (
    <section className="rounded-3xl bg-bg p-6 shadow-card">
      <h3 className="mb-2 font-heading font-bold">店名ルール</h3>
      <p className="mb-4 text-sub">
        店名にキーワードを含む明細は、その費目で取り込みます（全角と半角、大文字と小文字は区別しません）。複数当たるときは長いキーワードを使い、どれにも当たらなければ「その他」にします。非表示の費目を指すルールは使いません。
      </p>
      {rules.length === 0 ? (
        <p className="py-3 text-sub">店名ルールはまだありません</p>
      ) : (
        <ul className="divide-y divide-faint/20">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate">{r.keyword}</span>
              <select
                aria-label={`${r.keyword} の費目`}
                value={r.categoryId}
                onChange={(e) =>
                  void onSave({ ...r, categoryId: e.target.value })
                }
                className={FIELD_CLASS}
              >
                {/* 非表示の費目は選べないが、今指している費目は残す */}
                {expense
                  .filter((c) => !c.hidden || c.id === r.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.hidden ? `${c.name}（非表示）` : c.name}
                    </option>
                  ))}
              </select>
              <Button
                variant="icon"
                aria-label={`${r.keyword} の店名ルールを削除`}
                title="削除"
                onClick={() => void onRemove(r.id)}
              >
                <TrashIcon className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          aria-label="店名ルールのキーワード"
          aria-invalid={error !== null}
          placeholder="例: AMAZON"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={cn(FIELD_CLASS, "min-w-0 flex-1")}
        />
        <select
          aria-label="店名ルールの費目"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">費目を選ぶ</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary">
          追加
        </Button>
      </form>
      {error !== null && <p className="mt-1 text-xs text-error">{error}</p>}
    </section>
  );
}
