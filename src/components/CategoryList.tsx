import { useState } from "react";
import { sortCategories } from "@/lib/aggregate";
import { nextOrder, validateCategoryName } from "@/lib/category";
import { FIELD_CLASS } from "@/lib/styles";
import { KIND_LABEL } from "@/lib/types";
import type { Category, Kind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { CategoryRow } from "./CategoryRow";

/** コンポーネントの props */
type Props = {
  kind: Kind;
  categories: Category[];
  onSave: (c: Category) => Promise<boolean>;
};

/**
 * 1 つの種別の費目一覧と、費目の追加欄。
 * @param props 種別・すべての費目・保存の処理
 * @returns {JSX.Element} 費目一覧
 */
export function CategoryList({ kind, categories, onSave }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const list = sortCategories(categories).filter((c) => c.kind === kind);

  /**
   * 名前を検証して費目を追加する。
   * @returns {Promise<void>} 保存の完了
   */
  async function add(): Promise<void> {
    const message = validateCategoryName(name, kind, categories, null);
    setError(message);
    if (message !== null) return;
    const isSaved = await onSave({
      id: crypto.randomUUID(),
      kind,
      name: name.trim(),
      hidden: false,
      order: nextOrder(kind, categories),
    });
    if (isSaved) setName("");
  }

  return (
    <section className="rounded-3xl bg-bg p-6 shadow-card">
      <h3 className="mb-3 font-heading font-bold">{KIND_LABEL[kind]}の費目</h3>
      <ul className="divide-y divide-faint/20">
        {list.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            categories={categories}
            onSave={onSave}
          />
        ))}
      </ul>
      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          aria-label={`${KIND_LABEL[kind]}の費目の名前`}
          aria-invalid={error !== null}
          placeholder="新しい費目"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(FIELD_CLASS, "min-w-0 flex-1")}
        />
        <Button type="submit" variant="primary">
          追加
        </Button>
      </form>
      {error !== null && <p className="mt-1 text-xs text-error">{error}</p>}
    </section>
  );
}
