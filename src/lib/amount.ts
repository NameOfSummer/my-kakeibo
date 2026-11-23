/** 符号付きの整数（カンマなし） */
const INTEGER_PATTERN = /^-?\d+$/;

/**
 * 入力された金額を整数に変換する。全角数字・カンマ・全角や数学記号のマイナスも受け付ける。
 * @param input 入力文字列
 * @returns {number | null} 整数。空・整数でない・安全な整数の範囲外なら null
 */
export function parseAmount(input: string): number | null {
  const text = input
    .normalize("NFKC")
    .replace(/[−‒–]/g, "-")
    .replace(/[,\s]/g, "");
  if (!INTEGER_PATTERN.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

/** 円の表示に使う書式 */
const YEN_FORMAT = new Intl.NumberFormat("ja-JP");

/**
 * 金額を「-3,000円」の形で表示する。
 * @param amount 円の整数
 * @returns {string} 表示用の文字列
 */
export function formatYen(amount: number): string {
  return `${YEN_FORMAT.format(amount)}円`;
}
