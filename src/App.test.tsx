import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { createBackup } from "@/lib/backup";
import { todayString } from "@/lib/date";
import { TEST_CATEGORIES, makeTransaction } from "@/test/factories";

/**
 * アプリを描画し、読み込みが終わるまで待つ。
 * @returns {Promise<ReturnType<typeof userEvent.setup>>} 操作用の user
 */
async function setup(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "家計簿" });
  return user;
}

/**
 * 入力ダイアログで取引を追加する。
 * @param user 操作用の user
 * @param input 入力する金額・費目・メモ
 * @param input.amount 金額
 * @param input.category 費目名
 * @param input.memo メモ
 * @returns {Promise<void>} 追加の完了
 */
async function addTransaction(
  user: ReturnType<typeof userEvent.setup>,
  input: { amount: string; category: string; memo?: string },
): Promise<void> {
  await user.click(screen.getByRole("button", { name: "取引を追加" }));
  const dialog = await screen.findByRole("dialog", { name: "取引を追加" });
  await user.type(within(dialog).getByLabelText("金額（円）"), input.amount);
  await user.selectOptions(
    within(dialog).getByLabelText("費目"),
    input.category,
  );
  if (input.memo !== undefined) {
    await user.type(within(dialog).getByLabelText("メモ（任意）"), input.memo);
  }
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  // 保存は非同期なので、ダイアログが閉じるまで待つ
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

/**
 * 合計の表示から値を読む。
 * @param label 見出し
 * @returns {string | null} 値の文字列
 */
function summary(label: string): string | null {
  return (
    screen.getByText(label, { selector: "dt" }).nextElementSibling
      ?.textContent ?? null
  );
}

describe("App", () => {
  it("取引を追加すると、今月の一覧と合計に入る", async () => {
    const user = await setup();
    await addTransaction(user, {
      amount: "1,200",
      category: "食費",
      memo: "ランチ",
    });
    await addTransaction(user, {
      amount: "-200",
      category: "食費",
      memo: "返品",
    });

    expect(await screen.findByText("ランチ")).toBeInTheDocument();
    expect(summary("支出合計")).toBe("1,000円");
    expect(summary("収支差")).toBe("-1,000円");
  });

  it("金額 0 と費目の未選択は保存しない", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "取引を追加" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("金額（円）"), "0");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(
      within(dialog).getByText("0 以外の金額を入力してください"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("費目を選んでください"),
    ).toBeInTheDocument();
  });

  it("編集・複製・確認つきの削除ができる", async () => {
    const user = await setup();
    await addTransaction(user, {
      amount: "500",
      category: "食費",
      memo: "パン",
    });

    await user.click(await screen.findByRole("button", { name: /を編集$/ }));
    const edit = await screen.findByRole("dialog", { name: "取引を編集" });
    await user.clear(within(edit).getByLabelText("金額（円）"));
    await user.type(within(edit).getByLabelText("金額（円）"), "800");
    await user.click(within(edit).getByRole("button", { name: "保存" }));
    expect(
      await waitFor(() =>
        within(screen.getByRole("row", { name: /パン/ })).getByText("800円"),
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /を複製$/ }));
    const dup = await screen.findByRole("dialog", { name: "取引を追加" });
    expect(within(dup).getByLabelText("日付")).toHaveValue(todayString());
    expect(within(dup).getByLabelText("メモ（任意）")).toHaveValue("パン");
    await user.click(within(dup).getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.getAllByText("パン")).toHaveLength(2));

    await user.click(screen.getAllByRole("button", { name: /を削除$/ })[0]);
    await user.click(await screen.findByRole("button", { name: "キャンセル" }));
    expect(screen.getAllByText("パン")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: /を削除$/ })[0]);
    await user.click(await screen.findByRole("button", { name: "削除する" }));
    await waitFor(() => expect(screen.getAllByText("パン")).toHaveLength(1));
  });

  it("非表示の費目は新しい取引では選べないが、内訳には残る", async () => {
    const user = await setup();
    await addTransaction(user, { amount: "300", category: "趣味" });

    await user.click(screen.getByRole("tab", { name: "費目" }));
    await user.click(
      screen.getByRole("button", { name: "趣味 を非表示にする" }),
    );
    expect(
      await screen.findByRole("button", { name: "趣味 を再表示する" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "取引を追加" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("option", { name: /趣味/ })).toBeNull();
    await user.click(
      within(dialog).getByRole("button", { name: "キャンセル" }),
    );

    await user.click(screen.getByRole("tab", { name: "月" }));
    const breakdown = screen
      .getByRole("heading", { name: "費目ごとの内訳" })
      .closest("section");
    if (breakdown === null) throw new Error("内訳の表が見つからない");
    expect(within(breakdown).getByText("（非表示）")).toBeInTheDocument();
  });

  it("費目名は同じ種別の中で重複できない", async () => {
    const user = await setup();
    await user.click(screen.getByRole("tab", { name: "費目" }));
    await user.type(screen.getByLabelText("支出の費目の名前"), "食費");
    await user.click(screen.getAllByRole("button", { name: "追加" })[0]);
    expect(screen.getByText("同じ名前の費目があります")).toBeInTheDocument();
  });

  it("検索は金額を符号つきのまま比べる", async () => {
    const user = await setup();
    await addTransaction(user, {
      amount: "-3000",
      category: "食費",
      memo: "返品",
    });
    await addTransaction(user, {
      amount: "2000",
      category: "食費",
      memo: "外食",
    });

    await user.click(screen.getByRole("tab", { name: "検索" }));
    await user.type(screen.getByLabelText("金額の下限（円）"), "1000");
    await user.type(screen.getByLabelText("金額の上限（円）"), "5000");
    expect(screen.getByText("外食")).toBeInTheDocument();
    expect(screen.queryByText("返品")).toBeNull();
    expect(summary("件数")).toBe("1件");
  });

  it("バックアップの読み込みは確認のうえで全件を置き換える", async () => {
    const user = await setup();
    await addTransaction(user, {
      amount: "100",
      category: "食費",
      memo: "消える",
    });

    const backup = createBackup(
      {
        categories: TEST_CATEGORIES,
        storeRules: [],
        transactions: [
          makeTransaction({ date: todayString(), memo: "読み込んだ" }),
        ],
      },
      new Date(),
    );
    await user.click(screen.getByRole("tab", { name: "バックアップ" }));
    await user.upload(
      screen.getByLabelText("JSON を選んで読み込む"),
      new File([backup], "backup.json", { type: "application/json" }),
    );
    await user.click(await screen.findByRole("button", { name: "置き換える" }));
    expect(
      await screen.findByText("バックアップを読み込みました"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "月" }));
    expect(screen.getByText("読み込んだ")).toBeInTheDocument();
    expect(screen.queryByText("消える")).toBeNull();
  });

  it("壊れたバックアップは読み込まない", async () => {
    const user = await setup();
    await user.click(screen.getByRole("tab", { name: "バックアップ" }));
    await user.upload(
      screen.getByLabelText("JSON を選んで読み込む"),
      new File(["{}"], "x.json", { type: "application/json" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "バックアップファイルではありません",
    );
  });

  it("カードの利用明細は店名ルールの費目で取り込み、取り込み済みは飛ばす", async () => {
    const user = await setup();
    await user.click(screen.getByRole("tab", { name: "取り込み" }));
    await user.type(screen.getByLabelText("店名ルールのキーワード"), "amazon");
    await user.selectOptions(
      screen.getByLabelText("店名ルールの費目"),
      "日用品",
    );
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(await screen.findByLabelText("amazon の費目")).toBeInTheDocument();

    const csv = [
      '"確定情報","お支払日","ご利用店名（海外ご利用店名／海外都市名）","ご利用者","ご利用日","ご利用金額（円）","現地通貨額・通貨名称・換算レート"',
      '"確定","2025年10月10日","ＡＭＡＺＯＮ．ＣＯ．ＪＰ","1050","2025年8月16日","5,962",',
      '"確定","2025年10月10日","ニトリネツト","1050","2025年9月15日","15,380",',
    ].join("\r\n");
    const upload = (): Promise<void> =>
      user.upload(
        screen.getByLabelText("CSV を選んで取り込む"),
        new File([csv], "meisai.csv", { type: "text/csv" }),
      );
    await upload();
    expect(
      await screen.findByLabelText(
        "2025-08-16 ＡＭＡＺＯＮ．ＣＯ．ＪＰ 5,962円 の費目",
      ),
    ).toHaveDisplayValue("日用品");
    expect(
      screen.getByLabelText("2025-09-15 ニトリネツト 15,380円 の費目"),
    ).toHaveDisplayValue("その他");
    await user.click(screen.getByRole("button", { name: "取り込む" }));
    expect(await screen.findByText("2 件取り込みました")).toBeInTheDocument();

    await upload();
    expect(
      await screen.findByText(/新しく取り込む明細はありません/),
    ).toHaveTextContent("取り込み済みの 2 件は飛ばしました");

    await user.click(screen.getByRole("tab", { name: "検索" }));
    await user.type(
      screen.getByLabelText("キーワード（メモ・店名・費目名）"),
      "ニトリ",
    );
    expect(summary("件数")).toBe("1件");
    expect(screen.getByText("ニトリネツト")).toBeInTheDocument();
  });
});
