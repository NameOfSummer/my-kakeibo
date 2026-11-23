import { useState } from "react";
import { validateCategoryName } from "@/lib/category";
import { FIELD_CLASS } from "@/lib/styles";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/** コンポーネントの props */
type Props = {
  category: Category;
  categories: Category[];
  onSave: (c: Category) => Promise<boolean>;
};

/**
 * 費目の 1 行。名前の変更と、非表示・再表示ができる。
 * @param props 費目・すべての費目・保存の処理
 * @returns {JSX.Element} 費目の行
 */
export function CategoryRow({ category, categories, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  /**
   * 名前を検証して保存する。
   * @returns {Promise<void>} 保存の完了
   */
  async function rename(): Promise<void> {
    const message = validateCategoryName(
      name,
      category.kind,
      categories,
      category.id,
    );
    setError(message);
    if (message !== null) return;
    if (await onSave({ ...category, name: name.trim() })) setIsEditing(false);
  }

  if (isEditing) {
    return (
      <li className="py-1.5">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
        >
          <input
            aria-label={`${category.name} の新しい名前`}
            aria-invalid={error !== null}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(FIELD_CLASS, "min-w-0 flex-1")}
            autoFocus
          />
          <Button type="submit" variant="primary">
            保存
          </Button>
          <Button
            onClick={() => {
              setName(category.name);
              setError(null);
              setIsEditing(false);
            }}
          >
            キャンセル
          </Button>
        </form>
        {error !== null && <p className="mt-1 text-xs text-error">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className={cn("flex-1", category.hidden && "text-faint")}>
        {category.name}
        {category.hidden && <span className="ml-1 text-xs">（非表示）</span>}
      </span>
      <Button
        aria-label={`${category.name} の名前を変更`}
        onClick={() => setIsEditing(true)}
      >
        名前を変更
      </Button>
      <Button
        aria-label={`${category.name} を${category.hidden ? "再表示" : "非表示に"}する`}
        onClick={() => void onSave({ ...category, hidden: !category.hidden })}
      >
        {category.hidden ? "再表示する" : "非表示にする"}
      </Button>
    </li>
  );
}
