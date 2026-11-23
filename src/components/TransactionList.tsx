import {
  DocumentDuplicateIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { formatYen } from "@/lib/amount";
import { NUM_CLASS, TABLE_CLASS, TD_CLASS, TH_CLASS } from "@/lib/styles";
import { CARD_LABEL, KIND_LABEL } from "@/lib/types";
import type { Category, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/** 一覧の各行からできる操作 */
export type TransactionActions = {
  onEdit: (t: Transaction) => void;
  onDuplicate: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
};

/** コンポーネントの props */
type Props = {
  /** 表示する順に並べた取引 */
  transactions: Transaction[];
  categories: Category[];
  actions: TransactionActions;
  emptyText: string;
};

/**
 * 取引の一覧表。各行から編集・複製・削除ができる。
 * @param props 取引・費目・操作
 * @returns {JSX.Element} 一覧表
 */
export function TransactionList({
  transactions,
  categories,
  actions,
  emptyText,
}: Props) {
  if (transactions.length === 0) {
    return <p className="py-6 text-center text-sub">{emptyText}</p>;
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (
    <table className={TABLE_CLASS}>
      <thead>
        <tr>
          <th className={TH_CLASS}>日付</th>
          <th className={TH_CLASS}>種別</th>
          <th className={TH_CLASS}>費目</th>
          <th className={cn(TH_CLASS, NUM_CLASS)}>金額</th>
          <th className={TH_CLASS}>店名</th>
          <th className={TH_CLASS}>メモ</th>
          <th className={TH_CLASS}>
            <span className="sr-only">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => {
          const category = byId.get(t.categoryId);
          const label = `${t.date} ${category?.name ?? ""} ${formatYen(t.amount)}`;
          return (
            <tr key={t.id}>
              <td className={cn(TD_CLASS, "tabular-nums whitespace-nowrap")}>
                {t.date.replaceAll("-", "/")}
              </td>
              <td className={TD_CLASS}>{KIND_LABEL[t.kind]}</td>
              <td className={TD_CLASS}>
                {category?.name ?? "（不明）"}
                {category?.hidden && (
                  <span className="ml-1 text-xs text-faint">（非表示）</span>
                )}
              </td>
              <td
                className={cn(
                  TD_CLASS,
                  NUM_CLASS,
                  t.kind === "income" && "text-blue",
                )}
              >
                {formatYen(t.amount)}
              </td>
              <td className={cn(TD_CLASS, "max-w-48 truncate")}>
                {t.source !== undefined && (
                  <>
                    {t.source.storeName}
                    <span className="ml-1 text-xs text-faint">
                      （{CARD_LABEL[t.source.card]}）
                    </span>
                  </>
                )}
              </td>
              <td className={cn(TD_CLASS, "max-w-64 truncate")}>{t.memo}</td>
              <td className={cn(TD_CLASS, "whitespace-nowrap text-right")}>
                <span className="inline-flex gap-2">
                  <Button
                    variant="icon"
                    aria-label={`${label} を編集`}
                    title="編集"
                    onClick={() => actions.onEdit(t)}
                  >
                    <PencilSquareIcon className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="icon"
                    aria-label={`${label} を複製`}
                    title="複製"
                    onClick={() => actions.onDuplicate(t)}
                  >
                    <DocumentDuplicateIcon className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="icon"
                    aria-label={`${label} を削除`}
                    title="削除"
                    onClick={() => actions.onDelete(t)}
                  >
                    <TrashIcon className="size-4" aria-hidden />
                  </Button>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
