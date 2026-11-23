import { useState } from "react";
import type { ChangeEvent } from "react";
import { createBackup, parseBackup } from "@/lib/backup";
import { todayString } from "@/lib/date";
import type { KakeiboData } from "@/lib/types";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";

/** コンポーネントの props */
type Props = {
  data: KakeiboData;
  /** 置き換えられたら true を返す */
  onReplace: (data: KakeiboData) => Promise<boolean>;
};

/**
 * バックアップ画面。JSON への書き出しと、確認したうえでの全件置き換えの読み込み。
 * @param props 今のデータと置き換えの処理
 * @returns {JSX.Element} バックアップ画面
 */
export function BackupView({ data, onReplace }: Props) {
  const [pending, setPending] = useState<KakeiboData | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  /**
   * JSON ファイルを作ってダウンロードさせる。
   * @returns {void}
   */
  function download(): void {
    const blob = new Blob([createBackup(data, new Date())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kakeibo-backup-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 選んだファイルを検証し、問題なければ確認を出す。
   * @param e ファイル選択のイベント
   * @returns {Promise<void>} 読み込みの完了
   */
  async function pick(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    // 同じファイルを選び直せるように空にしておく
    e.target.value = "";
    if (file === undefined) return;
    try {
      setPending(parseBackup(await file.text()));
      setMessage(null);
    } catch (err) {
      setMessage({
        text: `読み込めませんでした: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      });
    }
  }

  /**
   * 確認後に今のデータを置き換える。
   * @param next 読み込んだデータ
   * @returns {Promise<void>} 置き換えの完了
   */
  async function replace(next: KakeiboData): Promise<void> {
    setPending(null);
    if (await onReplace(next)) {
      setMessage({ text: "バックアップを読み込みました", isError: false });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-8">
      <section className="rounded-3xl bg-bg p-6 shadow-card">
        <h3 className="mb-2 font-heading font-bold">書き出し</h3>
        <p className="mb-4 text-sub">
          取引 {data.transactions.length} 件と費目 {data.categories.length} 件を
          JSON ファイルに保存します。
        </p>
        <Button variant="primary" onClick={download}>
          JSON を書き出す
        </Button>
      </section>
      <section className="rounded-3xl bg-bg p-6 shadow-card">
        <h3 className="mb-2 font-heading font-bold">読み込み</h3>
        <p className="mb-4 text-sub">
          今のデータをすべて消して、ファイルの内容に置き換えます（追加はしません）。
        </p>
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 font-bold text-error shadow-raised-sm has-focus-visible:outline-2 has-focus-visible:outline-blue">
          JSON を選んで読み込む
          <input
            type="file"
            accept="application/json,.json"
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
      </section>
      {pending !== null && (
        <ConfirmDialog
          title="データを置き換えますか？"
          description={`今の取引 ${data.transactions.length} 件と費目 ${data.categories.length} 件はすべて消え、ファイルの取引 ${pending.transactions.length} 件と費目 ${pending.categories.length} 件に置き換わります。\nこの操作は元に戻せません。`}
          confirmLabel="置き換える"
          onConfirm={() => void replace(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
