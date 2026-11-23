/** YYYY-MM-DD の形 */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * ローカル時刻での日付を YYYY-MM-DD で返す。
 * @param now 基準の時刻
 * @returns {string} YYYY-MM-DD
 */
export function toDateString(now: Date): string {
  const y = String(now.getFullYear()).padStart(4, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 今日の日付を YYYY-MM-DD で返す。
 * @returns {string} YYYY-MM-DD
 */
export function todayString(): string {
  return toDateString(new Date());
}

/**
 * 実在する日付の YYYY-MM-DD かを判定する。
 * @param value 判定する文字列
 * @returns {boolean} 実在する日付なら true
 */
export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/**
 * 日付が属する月（YYYY-MM）を返す。
 * @param date YYYY-MM-DD
 * @returns {string} YYYY-MM
 */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * 月を diff か月ずらす。
 * @param month YYYY-MM
 * @param diff ずらす月数（負なら過去）
 * @returns {string} YYYY-MM
 */
export function addMonths(month: string, diff: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + diff;
  const year = Math.floor(index / 12);
  const mon = index - year * 12 + 1;
  return `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}`;
}

/**
 * 月を「2025年5月」の形で表示する。
 * @param month YYYY-MM
 * @returns {string} 表示用の文字列
 */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}
