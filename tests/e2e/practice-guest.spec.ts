import { expect, test, type Page } from "@playwright/test";

/**
 * E2E luyện tập theo dạng ở chế độ khách (không đăng nhập, tiến độ lưu IndexedDB "topikly-guest").
 * Đáp án đề mẫu: R10 -> ③, L01 -> ③. Mỗi test dùng context mới nên IndexedDB luôn sạch.
 */

const READING_LIST = "/topik-ii/luyen-tap/doc";
const READING_R10 = "/topik-ii/luyen-tap/doc/R10";
const LISTENING_LIST = "/topik-ii/luyen-tap/nghe";
const LISTENING_L01 = "/topik-ii/luyen-tap/nghe/L01";

const runner = (page: Page) => page.getByRole("region", { name: "Trình làm bài" });
const choice = (page: Page, label: string) =>
  runner(page)
    .getByRole("radiogroup", { name: "Chọn đáp án" })
    .getByRole("radio", { name: new RegExp(`^${label}`) });
/** Bấm vào thẻ phương án như người dùng thật (radio thật được ẩn bằng sr-only nên không bấm trực tiếp). */
async function pick(page: Page, label: string) {
  const id = await choice(page, label).getAttribute("id");
  await page.locator(`label[for="${id}"]`).click();
}
const resultRegion = (page: Page) => page.getByRole("region", { name: "Kết quả câu hỏi" });
const verdict = (page: Page, name: "Đúng" | "Sai" | "Bỏ trống") =>
  resultRegion(page).getByRole("heading", { level: 2, name, exact: true });
const typeCard = (page: Page, code: string) => page.getByRole("link", { name: new RegExp(code) });

test.describe("Luyện tập theo dạng — chế độ khách", () => {
  test("Đọc R10: làm bài, xem lời giải, tiến độ hiện ở trang kỹ năng", async ({ page }) => {
    await page.goto(READING_LIST);
    const card = typeCard(page, "R10");
    await expect(card).toContainText("Chưa làm");

    await card.click();
    await expect(page).toHaveURL(/\/luyen-tap\/doc\/R10$/);
    await expect(page.getByRole("heading", { level: 1, name: /^R10 · / })).toBeVisible();
    await expect(runner(page)).toBeVisible();

    // Biểu đồ + bảng số liệu (bảng cho trình đọc màn hình vẫn nằm trong cây truy cập).
    await expect(runner(page).getByRole("figure")).toBeVisible();
    await expect(runner(page).getByRole("img", { name: /Biểu đồ cột/ })).toBeVisible();
    await expect(
      runner(page).getByRole("table", { name: /퇴근 후 가장 많이 하는 활동/ }),
    ).toHaveCount(1);

    await pick(page, "③");
    await expect(choice(page, "③")).toBeChecked();
    await page.getByRole("button", { name: "Nộp bài" }).click();

    // Kết quả: nhận focus, đúng, có lời giải và ghi chú cho phương án nhiễu.
    const result = resultRegion(page);
    await expect(verdict(page, "Đúng")).toBeVisible();
    await expect(result).toBeFocused();
    await expect(result.getByRole("heading", { level: 3, name: "Lời giải" })).toBeVisible();
    await expect(result.getByRole("heading", { level: 3, name: "Bản dịch lời thoại" })).toHaveCount(
      0,
    );

    for (const wrong of ["①", "②", "④"]) {
      const radio = choice(page, wrong);
      await expect(radio).toBeDisabled();
      const noteId = await radio.getAttribute("aria-describedby");
      expect(noteId, `phương án nhiễu ${wrong} phải có ghi chú`).toBeTruthy();
      await expect(page.locator(`[id="${noteId}"]`)).not.toBeEmpty();
    }
    await expect(runner(page).getByText("Kết quả được lưu tạm trên thiết bị này")).toBeVisible();

    // Về trang kỹ năng (tải mới): thống kê đọc từ IndexedDB.
    await page.goto(READING_LIST);
    await expect(typeCard(page, "R10")).toContainText("Đúng 1/1 câu · 100%");
    await expect(typeCard(page, "R10")).not.toContainText("Chưa làm");
    // Dạng khác không bị ảnh hưởng.
    await expect(typeCard(page, "R40")).toContainText("Chưa làm");
  });

  test("Nghe L01: lời thoại tiếng Hàn, chọn sai bằng phím số, tải lại vẫn còn trạng thái", async ({
    page,
  }) => {
    await page.goto(LISTENING_L01);
    await expect(page.getByRole("heading", { level: 1, name: /^L01 · / })).toBeVisible();

    // Chưa có audio: hiển thị lời thoại tiếng Hàn (lang="ko").
    const transcript = runner(page).getByRole("region", { name: "Lời thoại" });
    await expect(transcript).toBeVisible();
    await expect(transcript.locator('[lang="ko"]').first()).toContainText(/[가-힣]/);
    await expect(page.getByText("chưa có audio")).toBeVisible();
    await expect(page.locator("audio")).toHaveCount(0);

    // Phím số 1 chọn ①; focus nhảy theo.
    await page.keyboard.press("1");
    await expect(choice(page, "①")).toBeChecked();
    await expect(choice(page, "①")).toBeFocused();
    await page.getByRole("button", { name: "Nộp bài" }).click();

    const result = resultRegion(page);
    await expect(verdict(page, "Sai")).toBeVisible();
    await expect(result.getByRole("heading", { level: 3, name: "Lời giải" })).toBeVisible();
    await expect(
      result.getByRole("heading", { level: 3, name: "Bản dịch lời thoại" }),
    ).toBeVisible();
    await expect(choice(page, "①")).toBeDisabled();

    // Tải lại: lựa chọn cũ còn, bị khóa, có "Xem lời giải" (chưa có kết quả đầy đủ).
    await page.reload();
    await expect(choice(page, "①")).toBeChecked();
    await expect(choice(page, "①")).toBeDisabled();
    await expect(page.getByText("Bạn đã làm câu này và trả lời sai.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Làm lại" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nộp bài" })).toHaveCount(0);

    await page.getByRole("button", { name: "Xem lời giải" }).click();
    await expect(verdict(page, "Sai")).toBeVisible();
    await expect(
      resultRegion(page).getByRole("heading", { level: 3, name: "Bản dịch lời thoại" }),
    ).toBeVisible();

    // Xem lại lời giải không ghi thêm lượt làm: trang kỹ năng vẫn 0/1.
    await page.goto(LISTENING_LIST);
    await expect(typeCard(page, "L01")).toContainText("Đúng 0/1 câu · 0%");
  });

  test("Nộp trống: hiện cảnh báo xác nhận, có thể quay lại hoặc vẫn nộp", async ({ page }) => {
    await page.goto(READING_R10);
    await page.getByRole("button", { name: "Nộp bài" }).click();

    // Bỏ qua route announcer của Next (cũng có role="alert").
    const alert = runner(page).getByRole("alert");
    await expect(alert).toContainText("Bạn chưa chọn đáp án.");
    const back = alert.getByRole("button", { name: "Quay lại chọn" });
    await expect(back).toBeFocused();

    await back.click();
    await expect(alert).toHaveCount(0);
    await expect(resultRegion(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Nộp bài" }).click();
    await alert.getByRole("button", { name: "Vẫn nộp" }).click();
    await expect(verdict(page, "Bỏ trống")).toBeVisible();
  });

  test("Bàn phím và ARIA: mũi tên, phím 1-4, Đánh dấu, Tạm dừng", async ({ page }) => {
    await page.goto(READING_R10);
    await choice(page, "①").focus();
    await page.keyboard.press("ArrowRight");
    await expect(choice(page, "②")).toBeChecked();
    await page.keyboard.press("4");
    await expect(choice(page, "④")).toBeChecked();

    const mark = page.getByRole("button", { name: "Đánh dấu" });
    await expect(mark).toHaveAttribute("aria-pressed", "false");
    await mark.click();
    await expect(mark).toHaveAttribute("aria-pressed", "true");

    const pause = page.getByRole("button", { name: "Tạm dừng đồng hồ" });
    await expect(pause).toHaveAttribute("aria-pressed", "false");
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("timer")).toBeVisible();
  });

  test("Bố cục: không tràn ngang; chữ Hàn dùng word-break keep-all", async ({ page }) => {
    for (const url of [READING_LIST, READING_R10, LISTENING_L01]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${url} tràn ngang (${scrollWidth} > ${innerWidth})`).toBeLessThanOrEqual(
        innerWidth,
      );
    }

    await page.goto(READING_R10);
    const stem = runner(page).locator('p[lang="ko"]').first();
    await expect(stem).toBeVisible();
    await expect(stem).toHaveCSS("word-break", "keep-all");
    await expect(runner(page).locator('label [lang="ko"]').first()).toHaveCSS(
      "word-break",
      "keep-all",
    );
  });

  test("Payload đề (HTML và dữ liệu tải xuống) không chứa đáp án hay lời giải trước khi nộp", async ({
    page,
  }) => {
    const bodies: string[] = [];
    page.on("response", async (response) => {
      const type = response.request().resourceType();
      if (type === "document" || type === "fetch" || type === "xhr") {
        bodies.push(await response.text().catch(() => ""));
      }
    });
    await page.goto(READING_R10);
    await expect(runner(page)).toBeVisible();
    const all = [...bodies, await page.content()].join("\n");
    expect(all).not.toMatch(/correctLabel|correct_label|is_correct/);
    expect(all).not.toContain("Chữ 모두 làm phương án sai");
  });
});
