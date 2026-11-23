import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Tabs } from "radix-ui";
import { useState } from "react";
import { BackupView } from "@/components/BackupView";
import { Button } from "@/components/Button";
import { CategoryList } from "@/components/CategoryList";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImportView } from "@/components/ImportView";
import { MonthView } from "@/components/MonthView";
import { SearchView } from "@/components/SearchView";
import { StoreRuleList } from "@/components/StoreRuleList";
import { TransactionDialog } from "@/components/TransactionDialog";
import type { TransactionActions } from "@/components/TransactionList";
import { useKakeibo } from "@/hooks/useKakeibo";
import { formatYen } from "@/lib/amount";
import { monthOf, todayString } from "@/lib/date";
import { duplicateDraft, editDraft, newDraft } from "@/lib/draft";
import type { TransactionDraft } from "@/lib/draft";
import { KINDS } from "@/lib/types";
import type { Transaction } from "@/lib/types";

/** タブの見た目 */
const TAB_CLASS =
  "h-9 rounded-full px-5 shadow-raised-sm data-[state=active]:font-bold data-[state=active]:text-blue data-[state=active]:shadow-inset-sm";

/**
 * 家計簿の画面全体。タブで月・検索・費目・取り込み・バックアップを切り替える。
 * @returns {JSX.Element} 画面
 */
export function App() {
  const kakeibo = useKakeibo();
  const [month, setMonth] = useState(() => monthOf(todayString()));
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const { state } = kakeibo;

  if (state.status === "loading") {
    return <p className="p-8 text-sub">読み込み中…</p>;
  }
  if (state.status === "failed") {
    return (
      <p role="alert" className="p-8 text-error">
        データを読み込めませんでした（{state.message}
        ）。プライベートブラウズでは保存できないことがあります。
      </p>
    );
  }
  const { data } = state;

  const actions: TransactionActions = {
    onEdit: (t) => setDraft(editDraft(t)),
    onDuplicate: (t) =>
      setDraft(duplicateDraft(t, data.categories, todayString())),
    onDelete: setDeleting,
  };

  /**
   * 確認後に取引を削除する。
   * @param t 削除する取引
   * @returns {Promise<void>} 削除の完了
   */
  async function remove(t: Transaction): Promise<void> {
    setDeleting(null);
    await kakeibo.removeTransaction(t.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">家計簿</h1>
        <Button
          variant="primary"
          onClick={() => setDraft(newDraft(todayString()))}
        >
          <PlusIcon className="size-4" aria-hidden />
          取引を追加
        </Button>
      </header>

      {kakeibo.error !== null && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between rounded-2xl px-5 py-3 text-error shadow-inset-sm"
        >
          {kakeibo.error}
          <Button
            variant="icon"
            aria-label="閉じる"
            onClick={kakeibo.clearError}
          >
            <XMarkIcon className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      <Tabs.Root defaultValue="month">
        <Tabs.List aria-label="画面" className="mb-6 flex gap-3">
          <Tabs.Trigger value="month" className={TAB_CLASS}>
            月
          </Tabs.Trigger>
          <Tabs.Trigger value="search" className={TAB_CLASS}>
            検索
          </Tabs.Trigger>
          <Tabs.Trigger value="categories" className={TAB_CLASS}>
            費目
          </Tabs.Trigger>
          <Tabs.Trigger value="import" className={TAB_CLASS}>
            取り込み
          </Tabs.Trigger>
          <Tabs.Trigger value="backup" className={TAB_CLASS}>
            バックアップ
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="month">
          <MonthView
            data={data}
            month={month}
            onMonthChange={setMonth}
            actions={actions}
          />
        </Tabs.Content>
        <Tabs.Content value="search">
          <SearchView data={data} actions={actions} />
        </Tabs.Content>
        <Tabs.Content value="categories" className="grid grid-cols-2 gap-8">
          {KINDS.map((k) => (
            <CategoryList
              key={k}
              kind={k}
              categories={data.categories}
              onSave={kakeibo.saveCategory}
            />
          ))}
        </Tabs.Content>
        <Tabs.Content value="import" className="grid gap-8">
          <ImportView data={data} onImport={kakeibo.addTransactions} />
          <StoreRuleList
            storeRules={data.storeRules}
            categories={data.categories}
            onSave={kakeibo.saveStoreRule}
            onRemove={kakeibo.removeStoreRule}
          />
        </Tabs.Content>
        <Tabs.Content value="backup">
          <BackupView data={data} onReplace={kakeibo.replaceData} />
        </Tabs.Content>
      </Tabs.Root>

      {draft !== null && (
        <TransactionDialog
          draft={draft}
          categories={data.categories}
          onSave={kakeibo.saveTransaction}
          onClose={() => setDraft(null)}
        />
      )}
      {deleting !== null && (
        <ConfirmDialog
          title="取引を削除しますか？"
          description={`${deleting.date.replaceAll("-", "/")} の ${formatYen(deleting.amount)} の取引を削除します。この操作は元に戻せません。`}
          confirmLabel="削除する"
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
