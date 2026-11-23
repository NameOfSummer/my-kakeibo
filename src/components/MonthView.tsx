import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  breakdownByCategory,
  inMonth,
  monthlyTrend,
  sortNewestFirst,
  sumTotals,
} from "@/lib/aggregate";
import { formatYen } from "@/lib/amount";
import { addMonths, formatMonth, monthOf, todayString } from "@/lib/date";
import {
  FIELD_CLASS,
  NUM_CLASS,
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
} from "@/lib/styles";
import { KIND_LABEL } from "@/lib/types";
import type { KakeiboData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { TotalsSummary } from "./TotalsSummary";
import { TransactionList } from "./TransactionList";
import type { TransactionActions } from "./TransactionList";

/** YYYY-MM の形 */
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

/** コンポーネントの props */
type Props = {
  data: KakeiboData;
  /** 開いている月（YYYY-MM） */
  month: string;
  onMonthChange: (month: string) => void;
  actions: TransactionActions;
};

/**
 * 月の画面。その月の合計・取引一覧・費目ごとの内訳と、直近 12 か月の推移を見せる。
 * @param props データ・開いている月・操作
 * @returns {JSX.Element} 月の画面
 */
export function MonthView({ data, month, onMonthChange, actions }: Props) {
  const transactions = inMonth(data.transactions, month);
  const totals = sumTotals(transactions);
  const breakdown = breakdownByCategory(transactions, data.categories);
  const trend = monthlyTrend(data.transactions, month);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="icon"
          aria-label="前の月"
          onClick={() => onMonthChange(addMonths(month, -1))}
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
        </Button>
        <h2 className="min-w-32 text-center font-heading text-xl font-bold">
          {formatMonth(month)}
        </h2>
        <Button
          variant="icon"
          aria-label="次の月"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRightIcon className="size-4" aria-hidden />
        </Button>
        <Button onClick={() => onMonthChange(monthOf(todayString()))}>
          今月
        </Button>
        <input
          type="month"
          aria-label="月を選ぶ"
          value={month}
          onChange={(e) => {
            if (MONTH_PATTERN.test(e.target.value))
              onMonthChange(e.target.value);
          }}
          className={FIELD_CLASS}
        />
      </div>

      <TotalsSummary
        items={[
          { label: "支出合計", value: formatYen(totals.expense) },
          { label: "収入合計", value: formatYen(totals.income) },
          { label: "収支差", value: formatYen(totals.balance) },
        ]}
      />

      <section className="rounded-3xl bg-bg p-6 shadow-card">
        <h3 className="mb-3 font-heading font-bold">取引</h3>
        <TransactionList
          transactions={sortNewestFirst(transactions)}
          categories={data.categories}
          actions={actions}
          emptyText="この月の取引はありません"
        />
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section className="rounded-3xl bg-bg p-6 shadow-card">
          <h3 className="mb-3 font-heading font-bold">費目ごとの内訳</h3>
          {breakdown.length === 0 ? (
            <p className="py-6 text-center text-sub">取引はありません</p>
          ) : (
            <table className={TABLE_CLASS}>
              <thead>
                <tr>
                  <th className={TH_CLASS}>種別</th>
                  <th className={TH_CLASS}>費目</th>
                  <th className={cn(TH_CLASS, NUM_CLASS)}>件数</th>
                  <th className={cn(TH_CLASS, NUM_CLASS)}>合計</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map(({ category, count, total }) => (
                  <tr key={category.id}>
                    <td className={TD_CLASS}>{KIND_LABEL[category.kind]}</td>
                    <td className={TD_CLASS}>
                      {category.name}
                      {category.hidden && (
                        <span className="ml-1 text-xs text-faint">
                          （非表示）
                        </span>
                      )}
                    </td>
                    <td className={cn(TD_CLASS, NUM_CLASS)}>{count}</td>
                    <td className={cn(TD_CLASS, NUM_CLASS)}>
                      {formatYen(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-3xl bg-bg p-6 shadow-card">
          <h3 className="mb-3 font-heading font-bold">直近 12 か月の推移</h3>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>月</th>
                <th className={cn(TH_CLASS, NUM_CLASS)}>支出合計</th>
                <th className={cn(TH_CLASS, NUM_CLASS)}>収入合計</th>
                <th className={cn(TH_CLASS, NUM_CLASS)}>収支差</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((row) => (
                <tr
                  key={row.month}
                  className={cn(row.month === month && "font-bold")}
                >
                  <td className={cn(TD_CLASS, "whitespace-nowrap")}>
                    {formatMonth(row.month)}
                  </td>
                  <td className={cn(TD_CLASS, NUM_CLASS)}>
                    {formatYen(row.expense)}
                  </td>
                  <td className={cn(TD_CLASS, NUM_CLASS)}>
                    {formatYen(row.income)}
                  </td>
                  <td className={cn(TD_CLASS, NUM_CLASS)}>
                    {formatYen(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
