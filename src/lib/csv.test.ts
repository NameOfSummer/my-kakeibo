import { describe, expect, it } from "vitest";
import { decodeCsv, parseCsv } from "./csv";

describe("decodeCsv", () => {
  it("UTF-8 はそのまま、読めなければ Shift_JIS として読む", () => {
    expect(decodeCsv(new TextEncoder().encode("確定"))).toBe("確定");
    // 「確定」の Shift_JIS
    expect(decodeCsv(new Uint8Array([0x8a, 0x6d, 0x92, 0xe8]))).toBe("確定");
  });
});

describe("parseCsv", () => {
  it("引用符の中のカンマ・改行・二重引用符と、CRLF・空の値を扱う", () => {
    expect(parseCsv('"a","2,314",\r\n,"x\ny","say ""hi"""\r\n\r\n')).toEqual([
      ["a", "2,314", ""],
      ["", "x\ny", 'say "hi"'],
    ]);
  });
});
