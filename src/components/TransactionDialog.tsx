import { Dialog } from "radix-ui";
import { useState } from "react";
import type { FormEvent } from "react";
import { sortCategories } from "@/lib/aggregate";
import { parseAmount } from "@/lib/amount";
import { isValidDateString } from "@/lib/date";
import type { TransactionDraft } from "@/lib/draft";
import { FIELD_CLASS } from "@/lib/styles";
import { CARD_LABEL, KIND_LABEL, KINDS } from "@/lib/types";
import type { Category, Kind, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Field } from "./Field";

/** 項目ごとのエラーの文言 */
type Errors = Partial<Record<"date" | "amount" | "category", string>>;

/** コンポーネントの props */
type Props = {
  draft: TransactionDraft;
  categories: Category[];
  /** 保存できたら true を返す */
  onSave: (t: Transaction) => Promise<boolean>;
  onClose: () => void;
};

/**
 * 取引の入力・編集画面。表示している間だけ描画し、開くたびに draft から初期化する。
 * @param props 初期値・費目・保存と閉じる処理
 * @returns {JSX.Element} 入力ダイアログ
 */
export function TransactionDialog({
  draft,
  categories,
  onSave,
  onClose,
}: Props) {
  const [kind, setKind] = useState<Kind>(draft.kind);
  const [date, setDate] = useState(draft.date);
  const [amountText, setAmountText] = useState(draft.amountText);
  const [categoryId, setCategoryId] = useState(draft.categoryId);
  const [memo, setMemo] = useState(draft.memo);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  // 非表示の費目は選べない。ただし編集中の取引がすでに使っている費目は残す。
  const options = sortCategories(categories).filter(
    (c) => c.kind === kind && (!c.hidden || c.id === draft.categoryId),
  );

  /**
   * 種別を切り替え、合わなくなった費目を空欄に戻す。
   * @param next 新しい種別
   * @returns {void}
   */
  function changeKind(next: Kind): void {
    setKind(next);
    if (categories.find((c) => c.id === categoryId)?.kind !== next) {
      setCategoryId("");
    }
  }

  /**
   * 入力を検証して保存する。
   * @param e フォームの送信イベント
   * @returns {Promise<void>} 保存の完了
   */
  async function submit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const amount = parseAmount(amountText);
    const next: Errors = {};
    if (!isValidDateString(date)) next.date = "日付を入力してください";
    if (amount === null) next.amount = "金額は円の整数で入力してください";
    else if (amount === 0) next.amount = "0 以外の金額を入力してください";
    if (!options.some((c) => c.id === categoryId)) {
      next.category = "費目を選んでください";
    }
    setErrors(next);
    if (amount === null || Object.keys(next).length > 0) return;

    setIsSaving(true);
    const isSaved = await onSave({
      id: draft.id ?? crypto.randomUUID(),
      createdAt: draft.createdAt ?? Date.now(),
      kind,
      date,
      amount,
      categoryId,
      memo: memo.trim(),
      ...(draft.source !== null && { source: draft.source }),
    });
    if (isSaved) onClose();
    else setIsSaving(false);
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg p-6 shadow-popover"
        >
          <Dialog.Title className="font-heading text-base font-bold">
            {draft.id === null ? "取引を追加" : "取引を編集"}
          </Dialog.Title>
          {draft.source !== null && (
            <p className="mt-2 text-xs text-sub">
              {CARD_LABEL[draft.source.card]}から取り込んだ取引（店名:{" "}
              {draft.source.storeName}）
            </p>
          )}
          <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
            <fieldset className="flex gap-2">
              <legend className="mb-1 text-xs text-sub">種別</legend>
              {KINDS.map((k) => (
                <label
                  key={k}
                  className={cn(
                    "flex h-9 cursor-pointer items-center rounded-full px-5 shadow-raised-sm has-checked:font-bold has-checked:text-blue has-checked:shadow-inset-sm has-focus-visible:outline-2 has-focus-visible:outline-blue",
                  )}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => changeKind(k)}
                    className="sr-only"
                  />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </fieldset>
            <div className="grid grid-cols-2 gap-4">
              <Field label="日付" error={errors.date}>
                {(p) => (
                  <input
                    {...p}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={cn(FIELD_CLASS, "w-full")}
                  />
                )}
              </Field>
              <Field label="金額（円）" error={errors.amount}>
                {(p) => (
                  <input
                    {...p}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="例: 1200 / 返金は -1200"
                    value={amountText}
                    onChange={(e) => setAmountText(e.target.value)}
                    className={cn(
                      FIELD_CLASS,
                      "w-full text-right tabular-nums",
                    )}
                  />
                )}
              </Field>
            </div>
            <Field label="費目" error={errors.category}>
              {(p) => (
                <select
                  {...p}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={cn(FIELD_CLASS, "w-full")}
                >
                  <option value="">選んでください</option>
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.hidden ? `${c.name}（非表示）` : c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="メモ（任意）">
              {(p) => (
                <input
                  {...p}
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className={cn(FIELD_CLASS, "w-full")}
                />
              )}
            </Field>
            <div className="mt-2 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button>キャンセル</Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" disabled={isSaving}>
                保存
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
