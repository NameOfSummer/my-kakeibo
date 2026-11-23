import { useState } from "react";
import { sortCategories, sumTotals } from "@/lib/aggregate";
import { formatYen, parseAmount } from "@/lib/amount";
import { searchTransactions } from "@/lib/search";
import { FIELD_CLASS } from "@/lib/styles";
import { KIND_LABEL, KINDS } from "@/lib/types";
import type { KakeiboData, Kind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Field } from "./Field";
import { TotalsSummary } from "./TotalsSummary";
import { TransactionList } from "./TransactionList";
import type { TransactionActions } from "./TransactionList";

/** 種別だけで絞るときの選択肢の値の接頭辞 */
const KIND_PREFIX = "kind:";

/** 費目で絞るときの選択肢の値の接頭辞 */
const CATEGORY_PREFIX = "category:";

/** 金額の入力欄のエラーの文言 */
const AMOUNT_ERROR = "円の整数で入力してください";

/** コンポーネントの props */
type Props = {
  data: KakeiboData;
  actions: TransactionActions;
};

/**
 * 金額の入力欄を検索条件の値にする。
 * @param text 入力
 * @returns {{ value: number | null; error: string | null }} 条件の値（空なら null）とエラー
 */
function amountBound(text: string): {
  value: number | null;
  error: string | null;
} {
  if (text.trim() === "") return { value: null, error: null };
  const value = parseAmount(text);
  return value === null
    ? { value: null, error: AMOUNT_ERROR }
    : { value, error: null };
}

/**
 * 検索画面。条件を変えるとすぐに結果を出し直す。
 * @param props データと一覧の操作
 * @returns {JSX.Element} 検索画面
 */
export function SearchView({ data, actions }: Props) {
  const [keyword, setKeyword] = useState("");
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [filter, setFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const min = amountBound(minText);
  const max = amountBound(maxText);
  const kind = KINDS.find((k) => filter === `${KIND_PREFIX}${k}`) ?? null;
  const categoryId = filter.startsWith(CATEGORY_PREFIX)
    ? filter.slice(CATEGORY_PREFIX.length)
    : null;
  const results = searchTransactions(data.transactions, data.categories, {
    keyword,
    minAmount: min.value,
    maxAmount: max.value,
    kind,
    categoryId,
    from: from === "" ? null : from,
    to: to === "" ? null : to,
  });
  const totals = sumTotals(results);
  const categories = sortCategories(data.categories);

  /**
   * 条件をすべて消す。
   * @returns {void}
   */
  function reset(): void {
    for (const set of [
      setKeyword,
      setMinText,
      setMaxText,
      setFilter,
      setFrom,
      setTo,
    ]) {
      set("");
    }
  }

  return (
    <div className="grid gap-8">
      <section
        aria-label="検索条件"
        className="grid grid-cols-6 items-start gap-4 rounded-3xl bg-bg p-6 shadow-card"
      >
        <Field label="キーワード（メモ・費目名）" className="col-span-2">
          {(p) => (
            <input
              {...p}
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={cn(FIELD_CLASS, "w-full")}
            />
          )}
        </Field>
        <Field label="種別・費目" className="col-span-2">
          {(p) => (
            <select
              {...p}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={cn(FIELD_CLASS, "w-full")}
            >
              <option value="">すべて</option>
              {KINDS.map((k: Kind) => (
                <optgroup key={k} label={KIND_LABEL[k]}>
                  <option value={`${KIND_PREFIX}${k}`}>
                    {KIND_LABEL[k]}のすべて
                  </option>
                  {categories
                    .filter((c) => c.kind === k)
                    .map((c) => (
                      <option key={c.id} value={`${CATEGORY_PREFIX}${c.id}`}>
                        {c.hidden ? `${c.name}（非表示）` : c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        <div className="col-span-2 flex items-end justify-end self-end">
          <Button onClick={reset}>条件をクリア</Button>
        </div>
        <Field label="金額の下限（円）" error={min.error}>
          {(p) => (
            <input
              {...p}
              type="text"
              inputMode="numeric"
              value={minText}
              onChange={(e) => setMinText(e.target.value)}
              className={cn(FIELD_CLASS, "w-full text-right tabular-nums")}
            />
          )}
        </Field>
        <Field label="金額の上限（円）" error={max.error}>
          {(p) => (
            <input
              {...p}
              type="text"
              inputMode="numeric"
              value={maxText}
              onChange={(e) => setMaxText(e.target.value)}
              className={cn(FIELD_CLASS, "w-full text-right tabular-nums")}
            />
          )}
        </Field>
        <Field label="期間の開始" className="col-span-2">
          {(p) => (
            <input
              {...p}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={cn(FIELD_CLASS, "w-full")}
            />
          )}
        </Field>
        <Field label="期間の終了" className="col-span-2">
          {(p) => (
            <input
              {...p}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={cn(FIELD_CLASS, "w-full")}
            />
          )}
        </Field>
      </section>

      <TotalsSummary
        items={[
          { label: "件数", value: `${results.length}件` },
          { label: "支出合計", value: formatYen(totals.expense) },
          { label: "収入合計", value: formatYen(totals.income) },
        ]}
      />

      <section className="rounded-3xl bg-bg p-6 shadow-card">
        <h3 className="mb-3 font-heading font-bold">検索結果</h3>
        <TransactionList
          transactions={results}
          categories={data.categories}
          actions={actions}
          emptyText="条件に合う取引はありません"
        />
      </section>
    </div>
  );
}
