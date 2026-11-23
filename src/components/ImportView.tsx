import { useState } from "react";
import type { ChangeEvent } from "react";
import { sortCategories } from "@/lib/aggregate";
import { formatYen } from "@/lib/amount";
import {
  excludeImported,
  parseStatement,
  pickCategoryId,
} from "@/lib/cardImport";
import type { StatementRow } from "@/lib/cardImport";
import { decodeCsv } from "@/lib/csv";
import {
  FIELD_CLASS,
  NUM_CLASS,
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
} from "@/lib/styles";
import { CARD_LABEL } from "@/lib/types";
import type { CardId, KakeiboData, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/** 確認一覧の 1 行 */
type PreviewRow = StatementRow & {
  /** 取り込んだ取引の id にもする */
  id: string;
  /** 未選択なら空文字 */
  categoryId: string;
};

/** 取り込む前の確認一覧 */
type Preview = {
  card: CardId;
  rows: PreviewRow[];
  duplicateCount: number;
  unconfirmedCount: number;
};

/** コンポーネントの props */
type Props = {
  data: KakeiboData;
  /** 保存できたら true を返す */
  onImport: (transactions: Transaction[]) => Promise<boolean>;
};

/**
 * 飛ばす明細の件数を文にする。
 * @param duplicateCount 取り込み済みの件数
 * @param unconfirmedCount 未確定の件数
 * @param verb 文末（「飛ばします」など）
 * @returns {string} 文。飛ばすものがなければ空文字
 */
function skippedText(
  duplicateCount: number,
  unconfirmedCount: number,
  verb: string,
): string {
  const parts = [
    duplicateCount > 0 && `取り込み済みの ${duplicateCount} 件`,
    unconfirmedCount > 0 && `未確定の ${unconfirmedCount} 件`,
  ].filter((x) => x !== false);
  return parts.length === 0 ? "" : `${parts.join("と")}は${verb}。`;
}

/**
 * 取り込み画面。カードの利用明細 CSV を読み、確認一覧で費目を直してから支出の取引として保存する。
 * @param props 今のデータと保存の処理
 * @returns {JSX.Element} 取り込み画面
 */
export function ImportView({ data, onImport }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const options = sortCategories(data.categories).filter(
    (c) => c.kind === "expense" && !c.hidden,
  );

  /**
   * 選んだ CSV を読み、取り込み済みを除いて確認一覧を作る。
   * @param e ファイル選択のイベント
   * @returns {Promise<void>} 読み取りの完了
   */
  async function pick(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    // 同じファイルを選び直せるように空にしておく
    e.target.value = "";
    if (file === undefined) return;
    setPreview(null);
    try {
      const statement = parseStatement(decodeCsv(await file.arrayBuffer()));
      const { rows, duplicateCount } = excludeImported(
        statement,
        data.transactions,
      );
      if (rows.length === 0) {
        setMessage({
          text: `新しく取り込む明細はありません。${skippedText(duplicateCount, statement.unconfirmedCount, "飛ばしました")}`,
          isError: false,
        });
        return;
      }
      setPreview({
        card: statement.card,
        rows: rows.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          categoryId: pickCategoryId(
            r.storeName,
            data.storeRules,
            data.categories,
          ),
        })),
        duplicateCount,
        unconfirmedCount: statement.unconfirmedCount,
      });
      setMessage(null);
    } catch (err) {
      setMessage({
        text: `読み取れませんでした: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      });
    }
  }

  /**
   * 確認一覧の 1 行の費目を変える。
   * @param id 行の id
   * @param categoryId 新しい費目の id
   * @returns {void}
   */
  function changeCategory(id: string, categoryId: string): void {
    setPreview(
      (p) =>
        p && {
          ...p,
          rows: p.rows.map((r) => (r.id === id ? { ...r, categoryId } : r)),
        },
    );
  }

  /**
   * 確認一覧の明細を支出の取引として保存する。
   * @param p 確認一覧
   * @returns {Promise<void>} 保存の完了
   */
  async function save(p: Preview): Promise<void> {
    const selectable = new Set(options.map((c) => c.id));
    if (p.rows.some((r) => !selectable.has(r.categoryId))) {
      setMessage({ text: "費目を選んでいない明細があります", isError: true });
      return;
    }
    const now = Date.now();
    setIsSaving(true);
    const isSaved = await onImport(
      p.rows.map((r, i) => ({
        id: r.id,
        kind: "expense",
        date: r.date,
        amount: r.amount,
        categoryId: r.categoryId,
        memo: "",
        // 同じ日付の取引の並び順を決めるため、1 件ずつずらす
        createdAt: now + i,
        source: { card: p.card, storeName: r.storeName },
      })),
    );
    setIsSaving(false);
    if (!isSaved) return;
    setPreview(null);
    setMessage({ text: `${p.rows.length} 件取り込みました`, isError: false });
  }

  return (
    <section className="rounded-3xl bg-bg p-6 shadow-card">
      <h3 className="mb-2 font-heading font-bold">カードの利用明細</h3>
      <p className="mb-4 text-sub">
        カード会社のサイトから落とした利用明細の CSV
        から、支出の取引を作ります（対応: {CARD_LABEL.recruit}
        ）。取り込み済みの明細は飛ばします。
      </p>
      <label className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 font-bold text-blue shadow-raised-sm has-focus-visible:outline-2 has-focus-visible:outline-blue">
        CSV を選んで取り込む
        <input
          type="file"
          accept="text/csv,.csv"
          onChange={(e) => void pick(e)}
          className="sr-only"
        />
      </label>
      {message !== null && (
        <p
          role={message.isError ? "alert" : "status"}
          className={message.isError ? "mt-3 text-error" : "mt-3 text-sub"}
        >
          {message.text}
        </p>
      )}
      {preview !== null && (
        <div className="mt-6">
          <p className="mb-3">
            {CARD_LABEL[preview.card]}の明細 {preview.rows.length}{" "}
            件を取り込みます。
            {skippedText(
              preview.duplicateCount,
              preview.unconfirmedCount,
              "飛ばします",
            )}
          </p>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>利用日</th>
                <th className={TH_CLASS}>店名</th>
                <th className={cn(TH_CLASS, NUM_CLASS)}>金額</th>
                <th className={TH_CLASS}>費目</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.id}>
                  <td
                    className={cn(TD_CLASS, "tabular-nums whitespace-nowrap")}
                  >
                    {r.date.replaceAll("-", "/")}
                  </td>
                  <td className={TD_CLASS}>{r.storeName}</td>
                  <td className={cn(TD_CLASS, NUM_CLASS)}>
                    {formatYen(r.amount)}
                  </td>
                  <td className={TD_CLASS}>
                    <select
                      aria-label={`${r.date} ${r.storeName} ${formatYen(r.amount)} の費目`}
                      aria-invalid={r.categoryId === ""}
                      value={r.categoryId}
                      onChange={(e) => changeCategory(r.id, e.target.value)}
                      className={FIELD_CLASS}
                    >
                      <option value="">選んでください</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end gap-3">
            <Button onClick={() => setPreview(null)}>やめる</Button>
            <Button
              variant="primary"
              disabled={isSaving}
              onClick={() => void save(preview)}
            >
              取り込む
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
