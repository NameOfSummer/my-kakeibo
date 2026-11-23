import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** ボタンの見た目の種類 */
type Variant = "default" | "primary" | "danger" | "icon";

/** コンポーネントの props */
type Props = ComponentProps<"button"> & { variant?: Variant };

/** 種類ごとの追加クラス */
const VARIANT_CLASS: Record<Variant, string> = {
  default: "px-4",
  primary: "px-4 font-bold text-blue",
  danger: "px-4 font-bold text-error",
  icon: "w-8 h-8 justify-center text-sub hover:text-ink",
};

/**
 * 凸型の pill ボタン（DESIGN.md のニューモーフィックな影）。
 * @param props ボタンの属性と見た目の種類
 * @returns {JSX.Element} ボタン
 */
export function Button({
  variant = "default",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-bg shadow-raised-sm transition-shadow active:shadow-inset-sm disabled:opacity-50",
        VARIANT_CLASS[variant],
        variant === "icon" && "h-8",
        className,
      )}
      {...rest}
    />
  );
}
