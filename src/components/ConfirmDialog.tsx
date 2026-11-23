import { AlertDialog } from "radix-ui";
import { Button } from "./Button";

/** コンポーネントの props */
type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 元に戻せない操作の前に出す確認。表示している間だけ描画する。
 * @param props 文言と、確定・取り消しの処理
 * @returns {JSX.Element} 確認ダイアログ
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AlertDialog.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/30" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg p-6 shadow-popover">
          <AlertDialog.Title className="font-heading text-base font-bold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 whitespace-pre-line text-sub">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button>キャンセル</Button>
            </AlertDialog.Cancel>
            <Button variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
