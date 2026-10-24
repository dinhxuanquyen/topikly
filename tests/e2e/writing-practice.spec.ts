import { expect, test, type Page } from "@playwright/test";

/**
 * E2E Luyện tập Viết (W53, W54) ở chế độ khách: ô viết có bộ đếm ký tự, nháp lưu localStorage,
 * "Xem bài mẫu & tự so sánh" gọi GET /api/practice/writing/reveal (bài mẫu KHÔNG nằm sẵn trong
 * trang). Phần Viết chưa chấm tự động nên test này không có bước chấm.
 *
 * Mỗi test chạy trong browser context mới => localStorage luôn sạch (không cần dọn thủ công).
 * Đề hiện có: w53-0002 (khung 200–300, bài mẫu cấp 4/5) và w54-0002 (khung 600–700, cấp 5/6);
 * W51/W52 chưa có đề nên phải là 404.
 */

const PROGRAM = "topik-ii";
const LIST = `/${PROGRAM}/luyen-tap/viet`;
const W53 = `${LIST}/W53`;
const W54 = `${LIST}/W54`;
const REVEAL_API = "/api/practice/writing/reveal";
const DRAFT_KEY = (id: string) => `topikly:writing-draft:v1:${PROGRAM}:${id}`;

const runner = (page: Page) => page.getByRole("region", { name: "Trình luyện Viết" });
const essayBox = (page: Page) => page.getByRole("textbox", { name: "Bài viết của bạn" });
const counter = (page: Page) => page.locator("[data-status]");
/** Dòng trạng thái bộ đếm cho trình đọc màn hình (sr-only), chỉ đổi khi dưới/đạt/vượt khung. */
const counterStatus = (page: Page) => page.locator("p[role=status]");
const revealButton = (page: Page) => page.getByRole("button", { name: "Xem bài mẫu & tự so sánh" });
const revealRegion = (page: Page) => page.getByRole("region", { name: "Bài mẫu và tự so sánh" });
/** Bỏ qua route announcer của Next (cũng có role="alert"): lọc theo nội dung. */
const alertWith = (page: Page, text: string | RegExp) =>
  page.getByRole("alert").filter({ hasText: text });

/** Đoạn tiếng Hàn đúng n ký tự (mỗi "가" = 1 ký tự). */
const korean = (n: number) => "가".repeat(n);

/**
 * Gõ vào ô viết rồi chờ bộ đếm phản ánh đúng. Dùng toPass vì ngay sau goto, React có thể chưa
 * hydrate xong và sự kiện onChange bị bỏ qua (lúc đó giá trị chỉ nằm trong DOM).
 */
async function writeEssay(page: Page, text: string, expectedCount: number) {
  await expect(async () => {
    await essayBox(page).fill(text);
    await expect(counter(page)).toContainText(`${expectedCount} ký tự`, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

/** Đếm ký tự độc lập với app, theo content-spec 5.7: bỏ xuống dòng, đếm theo code point. */
function countIndependently(text: string): number {
  return Array.from(text.normalize("NFC").replace(/[\r\n]/g, "")).length;
}

async function expectNoHorizontalOverflow(page: Page, where: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${where} tràn ngang (${scrollWidth} > ${innerWidth})`).toBeLessThanOrEqual(
    innerWidth,
  );
}

test.describe("Luyện Viết — trang kỹ năng và điều hướng", () => {
  test("Trang Viết liệt kê W53, W54 (có khung ký tự); bấm thẻ mở đúng đề; W51/W52 chưa có", async ({
    page,
  }) => {
    await page.goto(LIST);
    await expect(page.getByRole("heading", { level: 1, name: "Luyện Viết" })).toBeVisible();

    const list = page.getByRole("list", { name: "Các dạng câu phần Viết" });
    await expect(list.getByRole("link")).toHaveCount(2);
    const w53 = list.getByRole("link", { name: /W53/ });
    const w54 = list.getByRole("link", { name: /W54/ });
    await expect(w53).toContainText("200–300 ký tự");
    await expect(w53).toContainText("1 đề");
    await expect(w54).toContainText("600–700 ký tự");
    await expect(list.getByRole("link", { name: /W51|W52/ })).toHaveCount(0);

    await w53.click();
    await expect(page).toHaveURL(/\/luyen-tap\/viet\/W53$/);
    await expect(page.getByRole("heading", { level: 1, name: /^W53 · / })).toBeVisible();
    await expect(runner(page)).toBeVisible();
    // Khung ký tự hiện ngay từ đầu, khi chưa viết gì.
    await expect(counter(page)).toHaveAttribute("data-status", "below");
    await expect(counter(page)).toContainText("Khung: 200–300 ký tự");

    // Đường dẫn breadcrumb về lại trang Viết.
    await page
      .getByRole("navigation", { name: "Đường dẫn" })
      .getByRole("link", { name: "Viết" })
      .click();
    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
  });

  test("Từ trang Luyện tập chọn kỹ năng Viết rồi vào W54", async ({ page }) => {
    await page.goto(`/${PROGRAM}/luyen-tap`);
    await page.locator(`a[href="${LIST}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Luyện Viết" })).toBeVisible();
    await page.getByRole("link", { name: /^W54/ }).click();
    await expect(page).toHaveURL(/\/viet\/W54$/);
    await expect(essayBox(page)).toBeVisible();
  });

  test("Dạng không có đề (W51, W52, W99) trả trang 404", async ({ page }) => {
    for (const url of [`${LIST}/W51`, `${LIST}/W52`, `${LIST}/W99`]) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { level: 1, name: "Không tìm thấy trang" }),
        url,
      ).toBeVisible();
      await expect(runner(page), url).toHaveCount(0);
    }
  });
});

test.describe("Luyện Viết — ô viết, bộ đếm, nháp", () => {
  test("W53: bộ đếm đổi dưới → trong → vượt khung, thông báo có chữ và vùng aria-live", async ({
    page,
  }) => {
    await page.goto(W53);
    await expect(essayBox(page)).toBeVisible();
    await expect(essayBox(page)).toHaveAttribute("lang", "ko");
    await expect(counter(page)).toHaveAttribute("data-status", "below");
    await expect(counter(page)).toContainText("0 ký tự");
    await expect(counter(page)).toContainText("Chưa đủ, cần ít nhất 200 ký tự");
    await expect(counterStatus(page)).toHaveText("Chưa đủ, cần ít nhất 200 ký tự");

    // Biên dưới: 199 chưa đủ, 200 đạt.
    await writeEssay(page, korean(199), 199);
    await expect(counter(page)).toHaveAttribute("data-status", "below");
    await writeEssay(page, korean(200), 200);
    await expect(counter(page)).toHaveAttribute("data-status", "within");
    await expect(counter(page)).toContainText("Trong khung ký tự");
    await expect(counterStatus(page)).toHaveText("Trong khung ký tự");

    // Biên trên: 300 vẫn đạt, 301 vượt.
    await writeEssay(page, korean(300), 300);
    await expect(counter(page)).toHaveAttribute("data-status", "within");
    await writeEssay(page, korean(301), 301);
    await expect(counter(page)).toHaveAttribute("data-status", "above");
    await expect(counter(page)).toContainText("Vượt quá 300 ký tự");
    await expect(counterStatus(page)).toHaveText("Vượt quá 300 ký tự");

    // Ô viết được mô tả bằng bộ đếm + gợi ý (trình đọc màn hình đọc cùng ô).
    const describedBy = await essayBox(page).getAttribute("aria-describedby");
    expect(describedBy?.split(" ").length).toBe(2);
  });

  test("Bộ đếm tính cả khoảng trắng giữa dòng, không tính xuống dòng và khoảng trắng cuối dòng", async ({
    page,
  }) => {
    await page.goto(W53);
    await writeEssay(page, "가나다\n라마바", 6); // xuống dòng không tính
    await writeEssay(page, "가 나 다", 5); // khoảng trắng giữa chữ tính
    await writeEssay(page, "가나  \n다라", 4); // khoảng trắng cuối dòng không tính
    await writeEssay(page, "", 0);
  });

  test("W54: khung 600–700 ký tự", async ({ page }) => {
    await page.goto(W54);
    await expect(page.getByRole("heading", { level: 1, name: /^W54 · / })).toBeVisible();
    await expect(counter(page)).toContainText("Khung: 600–700 ký tự");
    await writeEssay(page, korean(599), 599);
    await expect(counter(page)).toHaveAttribute("data-status", "below");
    await writeEssay(page, korean(650), 650);
    await expect(counter(page)).toHaveAttribute("data-status", "within");
    await writeEssay(page, korean(701), 701);
    await expect(counter(page)).toHaveAttribute("data-status", "above");
  });

  test("Nháp tự lưu localStorage và được khôi phục sau khi tải lại", async ({ page }) => {
    await page.goto(W53);
    await expect(
      page.getByText("Chế độ khách: bài viết tự lưu nháp trên thiết bị này."),
    ).toBeVisible();
    const text = `${korean(120)} 서울`;
    await writeEssay(page, text, countIndependently(text));
    await expect(page.getByText("Đã lưu nháp trên thiết bị này.")).toBeVisible();

    const stored = await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY("w53-0002"));
    expect(stored, "nháp phải nằm trong localStorage").not.toBeNull();
    expect(JSON.parse(stored!).essay).toBe(text);

    await page.reload();
    await expect(page.getByText("Đã khôi phục bản nháp của bạn từ thiết bị này.")).toBeVisible();
    await expect(essayBox(page)).toHaveValue(text);
    await expect(counter(page)).toContainText(`${countIndependently(text)} ký tự`);

    // Nháp của đề khác không lẫn vào: W54 vẫn trống.
    await page.goto(W54);
    await expect(essayBox(page)).toHaveValue("");
    await expect(page.getByText("Đã khôi phục bản nháp")).toHaveCount(0);
  });

  test("Tải lại ngay sau khi gõ (chưa kịp debounce) vẫn không mất bài", async ({ page }) => {
    await page.goto(W53);
    const text = `${korean(25)} 마지막`;
    await writeEssay(page, text, countIndependently(text));
    // Không chờ "Đã lưu nháp": ghi nháp phải được flush khi rời trang (pagehide).
    await page.reload();
    await expect(essayBox(page)).toHaveValue(text);
    await expect(page.getByText("Đã khôi phục bản nháp của bạn từ thiết bị này.")).toBeVisible();
  });

  test("Nháp hỏng trong localStorage không làm trang lỗi", async ({ page }) => {
    await page.addInitScript(
      ([key]) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(key!, "{không phải json");
          sessionStorage.setItem("seeded", "1");
        }
      },
      [DRAFT_KEY("w53-0002")],
    );
    await page.goto(W53);
    await expect(essayBox(page)).toBeVisible();
    await expect(essayBox(page)).toHaveValue("");
    await expect(counter(page)).toContainText("0 ký tự");
    await writeEssay(page, korean(10), 10);
  });

  test("Xóa bài viết: hỏi xác nhận, 'Giữ lại' giữ nguyên, 'Xóa' xóa cả nháp trên máy", async ({
    page,
  }) => {
    await page.goto(W53);
    // Chưa có chữ: chưa có nút xóa.
    await expect(page.getByRole("button", { name: "Xóa bài viết" })).toHaveCount(0);

    await writeEssay(page, korean(30), 30);
    await expect(page.getByText("Đã lưu nháp trên thiết bị này.")).toBeVisible();

    const clear = page.getByRole("button", { name: "Xóa bài viết" });
    await clear.click();
    const confirm = alertWith(page, "Xóa bài viết?");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Giữ lại" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(essayBox(page)).toHaveValue(korean(30));

    await clear.click();
    await alertWith(page, "Xóa bài viết?")
      .getByRole("button", { name: "Xóa", exact: true })
      .click();
    await expect(essayBox(page)).toHaveValue("");
    await expect(counter(page)).toContainText("0 ký tự");
    await expect(page.getByRole("status").filter({ hasText: "Đã xóa bài viết nháp." })).toHaveCount(
      1,
    );
    await expect(page.getByRole("button", { name: "Xóa bài viết" })).toHaveCount(0);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY("w53-0002")),
    ).toBeNull();

    // Tải lại: không còn gì để khôi phục.
    await page.reload();
    await expect(essayBox(page)).toHaveValue("");
    await expect(page.getByText("Đã khôi phục bản nháp")).toHaveCount(0);
  });
});

test.describe("Luyện Viết — xem bài mẫu và tự so sánh", () => {
  test("Bài mẫu KHÔNG có sẵn trong trang/payload và chỉ được tải sau khi bấm nút", async ({
    page,
  }) => {
    const bodies: string[] = [];
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes(REVEAL_API)) apiCalls.push(request.url());
    });
    page.on("response", async (response) => {
      const type = response.request().resourceType();
      if (type === "document" || type === "fetch" || type === "xhr") {
        if (!response.url().includes(REVEAL_API)) {
          bodies.push(await response.text().catch(() => ""));
        }
      }
    });

    await page.goto(W53);
    await expect(runner(page)).toBeVisible();
    await expect(revealRegion(page)).toHaveCount(0);
    // Chờ ô viết có thể dùng được rồi mới kết luận "chưa gọi API".
    await writeEssay(page, korean(5), 5);
    expect(apiCalls, "chưa bấm nút thì không được gọi API bài mẫu").toHaveLength(0);

    const before = [...bodies, await page.content()].join("\n");
    for (const secret of [
      "model_answers",
      "required_points",
      "rubric_notes",
      "expression_bank",
      "scoring_notes",
      "common_mistakes",
      "explanation_vi",
      "notes_internal",
      // Đoạn đầu của hai bài mẫu (cấp 4 và cấp 5) của w53-0002.
      "서로 다른 변화를 보였다",
      "상반된 흐름을 보인다",
      // Một ý trong ghi chú chấm.
      "Bẫy đọc số liệu",
    ]) {
      expect(before, `"${secret}" không được xuất hiện trước khi bấm xem bài mẫu`).not.toContain(
        secret,
      );
    }

    await revealButton(page).click();
    await expect(revealRegion(page)).toBeVisible();
    expect(apiCalls).toHaveLength(1);
    expect(apiCalls[0]).toContain("program=topik-ii");
    expect(apiCalls[0]).toContain("id=w53-0002");
  });

  test("W53: bài của bạn cạnh bài mẫu; đổi cấp; số ký tự bài mẫu khớp cách đếm độc lập", async ({
    page,
  }) => {
    await page.goto(W53);
    const mine = `${korean(40)} 종이책은 감소했다`;
    await writeEssay(page, mine, countIndependently(mine));

    await revealButton(page).click();
    const region = revealRegion(page);
    await expect(region).toBeVisible();
    await expect(region).toBeFocused(); // focus chuyển vào khối bài mẫu để trình đọc màn hình đọc ngay
    await expect(page.getByText("Đã tải bài mẫu.")).toBeAttached();
    await expect(
      region.getByRole("heading", { level: 2, name: "Bài mẫu & tự so sánh" }),
    ).toBeVisible();
    await expect(region).toContainText("Phần Viết chưa được chấm tự động");

    // Bài của bạn nằm nguyên văn, kèm số ký tự.
    const yours = region.getByRole("region", { name: "Bài của bạn", exact: true });
    await expect(yours).toContainText(mine);
    await expect(yours).toContainText(`${countIndependently(mine)} ký tự`);

    // Hai cấp: nút bật tắt, mặc định cấp thấp nhất.
    const picker = region.getByRole("group", { name: "Chọn cấp của bài mẫu" });
    const level4 = picker.getByRole("button", { name: "Cấp 4" });
    const level5 = picker.getByRole("button", { name: "Cấp 5" });
    await expect(level4).toHaveAttribute("aria-pressed", "true");
    await expect(level5).toHaveAttribute("aria-pressed", "false");

    const model4 = region.getByRole("region", { name: "Bài mẫu cấp 4", exact: true });
    await expect(model4).toContainText("서로 다른 변화를 보였다");
    const text4 = (await model4.locator('[lang="ko"] p').allInnerTexts()).join("");
    const meta4 = (await model4.getByText(/ô 원고지/).innerText()).match(
      /^(\d+) ký tự · khoảng (\d+) ô/,
    );
    expect(meta4, "dòng thông tin bài mẫu phải có 'N ký tự · khoảng M ô 원고지'").not.toBeNull();
    expect(Number(meta4![1]), "số ký tự bài mẫu cấp 4 phải khớp cách đếm 5.7").toBe(
      countIndependently(text4),
    );
    expect(Number(meta4![2])).toBeGreaterThanOrEqual(Number(meta4![1]));

    await level5.click();
    await expect(level5).toHaveAttribute("aria-pressed", "true");
    await expect(level4).toHaveAttribute("aria-pressed", "false");
    const model5 = region.getByRole("region", { name: "Bài mẫu cấp 5", exact: true });
    await expect(model5).toContainText("상반된 흐름을 보인다");
    await expect(model5).not.toContainText("서로 다른 변화를 보였다");
    await expect(
      region.getByRole("region", { name: "Nhận xét bài mẫu cấp 5 theo 3 tiêu chí" }),
    ).toBeVisible();
    // Bài của bạn không đổi khi đổi cấp.
    await expect(yours).toContainText(mine);

    // Các mục phụ.
    for (const title of [
      "Tự kiểm tra các ý bắt buộc",
      "Điều kiện đạt mức cao / thấp",
      "Biểu hiện nên dùng",
      "Lỗi người Việt hay mắc ở đề này",
      "Lời giải",
    ]) {
      await expect(region.getByRole("heading", { level: 3, name: title }), title).toBeVisible();
    }
  });

  test("Bài của bạn để trống: hiện 'Bạn chưa viết gì.' thay vì khối rỗng", async ({ page }) => {
    await page.goto(W53);
    await expect(
      page.getByText("Bạn chưa viết gì. Nên tự viết trước khi xem bài mẫu, nhưng vẫn có thể xem."),
    ).toBeVisible();
    await revealButton(page).click();
    const yours = revealRegion(page).getByRole("region", { name: "Bài của bạn", exact: true });
    await expect(yours).toContainText("Bạn chưa viết gì.");
    await expect(yours).toContainText("0 ký tự");
  });

  test("Checklist ý bắt buộc: đếm n/N, lưu cùng nháp và còn sau khi tải lại", async ({ page }) => {
    await page.goto(W53);
    await writeEssay(page, korean(20), 20);
    await revealButton(page).click();
    const region = revealRegion(page);
    const boxes = region.getByRole("checkbox");
    await expect(boxes).toHaveCount(3);
    await expect(region.getByText("Bạn đã đánh dấu 0/3 ý")).toBeVisible();

    await boxes.nth(0).check();
    await boxes.nth(2).check();
    await expect(region.getByText("Bạn đã đánh dấu 2/3 ý")).toBeVisible();
    await boxes.nth(0).uncheck();
    await expect(region.getByText("Bạn đã đánh dấu 1/3 ý")).toBeVisible();
    await expect(page.getByText("Đã lưu nháp trên thiết bị này.")).toBeVisible();

    await page.reload();
    await expect(essayBox(page)).toHaveValue(korean(20));
    await revealButton(page).click();
    await expect(revealRegion(page).getByText("Bạn đã đánh dấu 1/3 ý")).toBeVisible();
    await expect(revealRegion(page).getByRole("checkbox").nth(2)).toBeChecked();
    await expect(revealRegion(page).getByRole("checkbox").nth(0)).not.toBeChecked();
  });

  test("Ẩn rồi xem lại bài mẫu không gọi API lần hai", async ({ page }) => {
    let calls = 0;
    page.on("request", (request) => {
      if (request.url().includes(REVEAL_API)) calls += 1;
    });
    await page.goto(W53);
    await writeEssay(page, korean(5), 5);
    await revealButton(page).click();
    await expect(revealRegion(page)).toBeVisible();

    await page.getByRole("button", { name: "Ẩn bài mẫu" }).click();
    await expect(revealRegion(page)).toHaveCount(0);
    await revealButton(page).click();
    await expect(revealRegion(page)).toBeVisible();
    expect(calls, "bài mẫu đã tải thì dùng lại, không gọi lại API").toBe(1);
  });

  test("W54: bài mẫu cấp 5/6, checklist là câu hỏi gợi ý", async ({ page }) => {
    await page.goto(W54);
    await writeEssay(page, korean(30), 30);
    await revealButton(page).click();
    const region = revealRegion(page);
    await expect(region).toBeVisible();
    const picker = region.getByRole("group", { name: "Chọn cấp của bài mẫu" });
    await expect(picker.getByRole("button", { name: "Cấp 5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await picker.getByRole("button", { name: "Cấp 6" }).click();
    await expect(region.getByRole("region", { name: "Bài mẫu cấp 6", exact: true })).toBeVisible();
    await expect(
      region.getByText("Đánh dấu những câu hỏi gợi ý bài của bạn đã trả lời."),
    ).toBeVisible();
    await expect(region.getByRole("checkbox")).toHaveCount(3);
  });
});

test.describe("Luyện Viết — lỗi mạng và máy chủ khi xem bài mẫu", () => {
  test("Mất mạng: hiện lỗi + 'Thử lại', bài viết còn nguyên, thử lại thành công", async ({
    page,
  }) => {
    await page.goto(W53);
    const text = `${korean(60)} 전자책`;
    await writeEssay(page, text, countIndependently(text));

    await page.route(`**${REVEAL_API}*`, (route) => route.abort("failed"));
    await revealButton(page).click();

    const alert = alertWith(page, "Không kết nối được tới máy chủ");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Bài viết của bạn vẫn được giữ");
    await expect(revealRegion(page)).toHaveCount(0);
    await expect(essayBox(page)).toHaveValue(text);
    // Nút xem bài mẫu mở lại được (không kẹt ở "Đang tải…").
    await expect(revealButton(page)).toBeEnabled();

    await page.unroute(`**${REVEAL_API}*`);
    await alert.getByRole("button", { name: "Thử lại" }).click();
    await expect(revealRegion(page)).toBeVisible();
    await expect(alertWith(page, "Không kết nối được tới máy chủ")).toHaveCount(0);
    await expect(essayBox(page)).toHaveValue(text);
  });

  test("Máy chủ trả lỗi JSON: hiện đúng message của API; trả lỗi không phải JSON: thông báo chung", async ({
    page,
  }) => {
    await page.goto(W53);
    await writeEssay(page, korean(10), 10);

    await page.route(`**${REVEAL_API}*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "internal", message: "Lỗi thử nghiệm từ máy chủ." },
        }),
      }),
    );
    await revealButton(page).click();
    await expect(alertWith(page, "Lỗi thử nghiệm từ máy chủ.")).toBeVisible();

    await page.unroute(`**${REVEAL_API}*`);
    await page.route(`**${REVEAL_API}*`, (route) =>
      route.fulfill({ status: 502, contentType: "text/html", body: "<html>Bad gateway</html>" }),
    );
    await alertWith(page, "Lỗi thử nghiệm từ máy chủ.")
      .getByRole("button", { name: "Thử lại" })
      .click();
    await expect(alertWith(page, "Máy chủ chưa tải được bài mẫu")).toBeVisible();
    await expect(essayBox(page)).toHaveValue(korean(10));
  });
});

test.describe("Luyện Viết — bàn phím, ARIA, bố cục", () => {
  test("Dùng hoàn toàn bằng bàn phím: Tab tới nút, Enter mở bài mẫu và nhận focus", async ({
    page,
  }) => {
    await page.goto(W53);
    await writeEssay(page, korean(8), 8);
    await essayBox(page).focus();
    await expect(essayBox(page)).toBeFocused();

    // Từ ô viết: Tab -> "Xem bài mẫu" (nút Xóa bài viết đứng sau).
    await page.keyboard.press("Tab");
    await expect(revealButton(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Xóa bài viết" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(revealButton(page)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(revealRegion(page)).toBeFocused();

    // Trong bài mẫu: Tab tới nút chọn cấp, Space đổi cấp.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Cấp 4" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Cấp 5" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Cấp 5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("Cấu trúc trợ năng: tiêu đề phân cấp, ô viết có nhãn, mọi khu vực có tên", async ({
    page,
  }) => {
    await page.goto(W53);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(runner(page).getByRole("heading", { level: 2 })).toHaveCount(1);
    await expect(essayBox(page)).toBeVisible(); // có nhãn "Bài viết của bạn" (getByRole theo name)
    await expect(runner(page).getByRole("region", { name: "Nội dung đề" })).toBeVisible();
    // Bảng số liệu của biểu đồ có caption (trình đọc màn hình đọc được số liệu).
    await expect(runner(page).getByRole("table", { name: /연도별 대출 건수/ })).toHaveCount(1);

    await revealButton(page).click();
    const region = revealRegion(page);
    await expect(region).toBeVisible();
    // Mọi khối con của bài mẫu là region có tên (aria-labelledby tới tiêu đề).
    const unnamed = await region.evaluate(
      (root) =>
        [...root.querySelectorAll("section")].filter(
          (s) => !s.getAttribute("aria-labelledby") && !s.getAttribute("aria-label"),
        ).length,
    );
    expect(unnamed).toBe(0);
    // Thứ tự tiêu đề không nhảy cấp trong bài mẫu: h2 -> h3.
    expect(await region.getByRole("heading", { level: 4 }).count()).toBe(0);
  });

  test("Không tràn ngang; chữ Hàn dùng keep-all (không vỡ giữa từ) cả trước và sau khi xem bài mẫu", async ({
    page,
  }) => {
    for (const url of [LIST, W53, W54]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page, url);
    }

    await page.goto(W53);
    const stem = runner(page).locator('p[lang="ko"]').first();
    await expect(stem).toBeVisible();
    await expect(stem).toHaveCSS("word-break", "keep-all");
    await expect(essayBox(page)).toHaveCSS("word-break", "keep-all");

    // Gõ một đoạn dài có dấu cách để thử ngắt dòng: không có thanh cuộn ngang ở ô viết.
    const long = Array.from({ length: 40 }, () => "공공도서관의").join(" ");
    await writeEssay(page, long, countIndependently(long));
    const box = await essayBox(page).evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);

    await revealButton(page).click();
    const modelText = revealRegion(page)
      .getByRole("region", { name: "Bài mẫu cấp 4", exact: true })
      .locator('[lang="ko"]')
      .first();
    await expect(modelText).toBeVisible();
    await expect(modelText).toHaveCSS("word-break", "keep-all");
    await expectNoHorizontalOverflow(page, `${W53} sau khi mở bài mẫu`);

    // Bài viết rất dài một chuỗi không dấu cách vẫn không làm tràn trang (overflow-wrap).
    await writeEssay(page, korean(280), 280);
    await expectNoHorizontalOverflow(page, `${W53} với chuỗi dài`);
  });
});

test.describe("API Viết gọi trực tiếp", () => {
  test("reveal: 200 có bài mẫu; 400 thiếu tham số; 404 program/id lạ; không cache", async ({
    request,
  }) => {
    const ok = await request.get(`${REVEAL_API}?program=${PROGRAM}&id=w53-0002`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toContain("no-store");
    const body = await ok.json();
    expect(body.id).toBe("w53-0002");
    expect(body.type_code).toBe("W53");
    expect(body.model_answers.length).toBeGreaterThanOrEqual(2);
    expect(body.required_points).toHaveLength(3);
    for (const model of body.model_answers) {
      expect(model.char_count).toBe(countIndependently(model.text));
      expect(model.char_count).toBeGreaterThanOrEqual(200);
      expect(model.char_count).toBeLessThanOrEqual(300);
    }
    // Nội dung nội bộ của người soạn không được lộ ra API.
    expect(JSON.stringify(body)).not.toContain("notes_internal");
    expect(JSON.stringify(body)).not.toContain("reviewed_by");

    const w54 = await request.get(`${REVEAL_API}?program=${PROGRAM}&id=w54-0002`);
    expect(w54.status()).toBe(200);
    for (const model of (await w54.json()).model_answers) {
      expect(model.char_count).toBeGreaterThanOrEqual(600);
      expect(model.char_count).toBeLessThanOrEqual(700);
    }

    for (const query of ["", `?program=${PROGRAM}`, "?id=w53-0002"]) {
      const bad = await request.get(`${REVEAL_API}${query}`);
      expect(bad.status(), `reveal${query}`).toBe(400);
      expect((await bad.json()).error.code).toBe("invalid_query");
    }
    const noProgram = await request.get(`${REVEAL_API}?program=khong-co&id=w53-0002`);
    expect(noProgram.status()).toBe(404);
    expect((await noProgram.json()).error.code).toBe("program_not_found");
    const noId = await request.get(`${REVEAL_API}?program=${PROGRAM}&id=w99-9999`);
    expect(noId.status()).toBe(404);
    expect((await noId.json()).error.code).toBe("question_not_found");
  });

  test("prompts: chỉ trả phần hiển thị trước khi viết, không có bài mẫu/đáp án/ghi chú nội bộ", async ({
    request,
  }) => {
    const ok = await request.get(`/api/practice/writing/prompts?program=${PROGRAM}&type=W53`);
    expect(ok.status()).toBe(200);
    const prompts = await ok.json();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].format).toBe("essay");
    expect(prompts[0].char_limit).toEqual({ min: 200, max: 300 });
    const raw = JSON.stringify(prompts);
    for (const secret of [
      "model_answers",
      "required_points",
      "rubric_notes",
      "expression_bank",
      "scoring_notes",
      "common_mistakes",
      "explanation_vi",
      "notes_internal",
      "reviewed_by",
      "authored_by",
      "서로 다른 변화를 보였다",
    ]) {
      expect(raw, secret).not.toContain(secret);
    }

    expect((await request.get(`/api/practice/writing/prompts?program=${PROGRAM}`)).status()).toBe(
      400,
    );
    const noType = await request.get(`/api/practice/writing/prompts?program=${PROGRAM}&type=W51`);
    expect(noType.status()).toBe(404);
    expect((await noType.json()).error.code).toBe("type_not_found");
    expect(
      (await request.get(`/api/practice/writing/prompts?program=khong-co&type=W53`)).status(),
    ).toBe(404);
  });
});
