import { useId } from "react";
import type { ReactNode } from "react";

/** 入力欄に付ける属性 */
type ControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/** コンポーネントの props */
type Props = {
  label: string;
  error?: string | null;
  className?: string;
  children: (control: ControlProps) => ReactNode;
};

/**
 * ラベルとエラーの文言を入力欄に関連付ける。
 * @param props ラベル・エラー・入力欄を描く関数
 * @returns {JSX.Element} 入力欄の枠
 */
export function Field({ label, error, className, children }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== null;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-sub">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": hasError,
        "aria-describedby": hasError ? errorId : undefined,
      })}
      {hasError && (
        <p id={errorId} className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
