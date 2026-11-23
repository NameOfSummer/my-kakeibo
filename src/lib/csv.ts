/**
 * CSV ファイルのバイト列を文字列にする。UTF-8 として読めなければ Shift_JIS として読む。
 * @param bytes ファイルの中身
 * @returns {string} 文字列（UTF-8 の BOM は除く）
 */
export function decodeCsv(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // カード会社の CSV は Shift_JIS（Windows-31J）のことが多い
    return new TextDecoder("shift_jis").decode(bytes);
  }
}

/**
 * CSV を行と列に分ける。ダブルクォートで囲んだ値の中のカンマ・改行・"" に対応する。
 * @param text CSV の文字列
 * @returns {string[][]} 行ごとの値。空行は除く
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let isQuoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (isQuoted) {
      if (ch !== '"') value += ch;
      else if (text[i + 1] === '"') {
        value += '"';
        i++;
      } else isQuoted = false;
    } else if (ch === '"') isQuoted = true;
    else if (ch === ",") {
      row.push(value);
      value = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += ch;
  }
  row.push(value);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v !== ""));
}
