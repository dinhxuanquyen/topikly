import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * E2E trụ Lý thuyết (chế độ khách): hub, Từ vựng (lọc trên URL, đánh dấu đã thuộc lưu localStorage,
 * cây hình vị), Hán tự, Ngữ pháp (lọc, chi tiết, nhóm so sánh), Nguồn và ghi công, trang 404.
 *
 * Số lượng từ / điểm ngữ pháp sẽ tăng khi đội nội dung thêm bài, nên test KHÔNG gắn cứng tổng số:
 * tổng được đọc từ giao diện rồi đối chiếu giữa các trang. Chỉ gắn cứng các mục dùng làm mẫu
 * (v-00037 발표 là bạn giả một phần, v-00001 사회, na-boda, nhóm phong-doan-dua-vao-quan-sat).
 * Mỗi test chạy trong browser context mới => localStorage luôn sạch.
 */

const PROGRAM = "topik-ii";
const BASE = `/${PROGRAM}/ly-thuyet`;
const HUB = BASE;
const VOCAB = `${BASE}/tu-vung`;
const HANJA_INDEX = `${VOCAB}/han-tu`;
const GRAMMAR = `${BASE}/ngu-phap`;
const SOURCES = `${BASE}/nguon`;
const BALJEON = `${VOCAB}/v-00037`; // 발표 發表 (phát biểu): bạn giả một phần, chưa duyệt
const SAHOE = `${VOCAB}/v-00001`; // 사회 社會 (xã hội): hai chữ Hán 社, 會
const NA_BODA = `${GRAMMAR}/na-boda`;
const GROUP = `${GRAMMAR}/nhom/phong-doan-dua-vao-quan-sat`;
const KNOWN_KEY = `topikly:vocab-known:v1:${PROGRAM}`;

/** Mọi trang lý thuyết cần có chân trang "Nguồn và ghi công" và không tràn ngang. */
const THEORY_PAGES = [
  HUB,
  VOCAB,
  BALJEON,
  SAHOE,
  HANJA_INDEX,
  `${HANJA_INDEX}/${encodeURIComponent("發")}`,
  GRAMMAR,
  NA_BODA,
  GROUP,
  SOURCES,
];

const NOT_FOUND = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Không tìm thấy trang" });

const vocabList = (page: Page) => page.getByRole("list", { name: "Danh sách từ vựng" });
const grammarList = (page: Page) => page.getByRole("list", { name: "Danh sách điểm ngữ pháp" });
const knownToggle = (page: Page, hangul: string) =>
  page.getByRole("button", { name: `Đánh dấu đã thuộc: ${hangul}` });
const progressBar = (page: Page) => page.getByRole("progressbar", { name: "Tiến độ đã thuộc" });
const filterGroup = (page: Page, name: string) =>
  page.getByRole("region", { name: "Bộ lọc" }).getByRole("group", { name, exact: true });
const searchInList = (page: Page) => page.getByRole("searchbox", { name: "Tìm trong danh sách" });
const footerSources = (page: Page) =>
  page.getByRole("contentinfo").or(page.locator("article > footer")).getByRole("link", {
    name: "Nguồn và ghi công",
  });

/**
 * Chờ React hydrate xong phần tử (React gắn props vào DOM lúc hydrate). Bấm trước đó thì onClick
 * chưa có và thao tác lặng lẽ mất, làm test chập chờn.
 */
async function hydrated(target: Locator) {
  await expect
    .poll(() =>
      target.first().evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$"))),
    )
    .toBe(true);
}

/** Đọc "Hiển thị n/N <đơn vị>" ở đầu danh sách. */
async function readCount(page: Page, unit: "từ" | "điểm ngữ pháp") {
  const text = await page.getByText(new RegExp(`^Hiển thị \\d+/\\d+ ${unit}$`)).innerText();
  const [, shown, total] = text.match(/(\d+)\/(\d+)/)!;
  return { shown: Number(shown), total: Number(total) };
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

/** Thứ tự tiêu đề: đúng một h1 và không nhảy cấp (h2 -> h4). */
async function expectHeadingOutline(page: Page, where: string) {
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6")].map(
      (h) => Number(h.tagName[1]),
    ),
  );
  expect(
    levels.filter((l) => l === 1),
    `${where}: phải có đúng một h1`,
  ).toHaveLength(1);
  levels.forEach((level, index) => {
    if (index > 0) {
      expect(
        level - levels[index - 1]!,
        `${where}: tiêu đề nhảy cấp ${levels.join("")}`,
      ).toBeLessThanOrEqual(1);
    }
  });
}

test.describe("Lý thuyết — hub", () => {
  test("Hub có bốn lối vào với số lượng khớp trang đích; chân trang dẫn tới Nguồn và ghi công", async ({
    page,
  }) => {
    await page.goto(HUB);
    await expect(page.getByRole("heading", { level: 1, name: "Lý thuyết" })).toBeVisible();
    const learn = page.getByRole("region", { name: "Học ngay" });

    const vocabLink = learn.getByRole("link", { name: /^Từ vựng/ });
    const hanjaLink = learn.getByRole("link", { name: /^Hán tự/ });
    const grammarLink = learn.getByRole("link", { name: /^Ngữ pháp/ });
    const falseFriendLink = learn.getByRole("link", { name: /^Bạn giả Hán-Việt/ });
    await expect(vocabLink).toHaveAttribute("href", VOCAB);
    await expect(hanjaLink).toHaveAttribute("href", HANJA_INDEX);
    await expect(grammarLink).toHaveAttribute("href", GRAMMAR);
    await expect(falseFriendLink).toHaveAttribute("href", `${VOCAB}?ban-gia=1`);

    const number = async (link: Locator, pattern: RegExp) =>
      Number((await link.innerText()).match(pattern)![1]);
    const vocabTotal = await number(vocabLink, /(\d+) từ theo cấp/);
    const falseFriendTotal = await number(falseFriendLink, /(\d+) từ nghe giống/);
    const grammarTotal = await number(grammarLink, /(\d+) điểm ngữ pháp/);
    const hanjaTotal = await number(hanjaLink, /(\d+) chữ Hán/);

    // Từ vựng: tổng khớp "Hiển thị N/N từ".
    await vocabLink.click();
    await expect(page).toHaveURL(new RegExp(`${VOCAB}$`));
    await expect(page.getByText(`Hiển thị ${vocabTotal}/${vocabTotal} từ`)).toBeVisible();

    // Bạn giả: bật sẵn bộ lọc và số lượng khớp hub.
    await page.goBack();
    await falseFriendLink.click();
    await expect(page).toHaveURL(/tu-vung\?ban-gia=1$/);
    await expect(page.getByText(`Hiển thị ${falseFriendTotal}/${vocabTotal} từ`)).toBeVisible();
    await expect(
      page.getByRole("checkbox", {
        name: new RegExp(`^Chỉ bạn giả Hán-Việt \\(${falseFriendTotal}\\)`),
      }),
    ).toBeChecked();

    await page.goto(GRAMMAR);
    await expect(
      page.getByText(`Hiển thị ${grammarTotal}/${grammarTotal} điểm ngữ pháp`),
    ).toBeVisible();

    await page.goto(HANJA_INDEX);
    await expect(
      page.getByRole("list", { name: "Danh sách chữ Hán" }).getByRole("listitem"),
    ).toHaveCount(hanjaTotal);

    await page.goto(HUB);
    await footerSources(page).click();
    await expect(page).toHaveURL(new RegExp(`${SOURCES}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Nguồn và ghi công" })).toBeVisible();
  });

  test("Ô tìm kiếm chung: tìm theo âm Hán-Việt không dấu, theo hangul, ngữ pháp; không có kết quả; lỗi mạng", async ({
    page,
  }) => {
    await page.goto(HUB);
    const box = page.getByRole("searchbox", { name: /Tìm theo hangul/ });
    await hydrated(box);
    const summary = page
      .getByRole("region", { name: "Tìm từ vựng và ngữ pháp" })
      .getByRole("status");

    await box.fill("kinh te");
    await expect(summary).toHaveText(/^Tìm thấy \d+ từ vựng và \d+ điểm ngữ pháp\.$/);
    const wordLink = page.getByRole("link", { name: /^경제/ });
    await expect(wordLink).toBeVisible();

    await box.fill("느라고");
    await expect(page.getByRole("heading", { level: 3, name: "Ngữ pháp" })).toBeVisible();
    await page.getByRole("link", { name: /^-느라고/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GRAMMAR}/neula-go$`));
    await expect(page.getByRole("heading", { level: 1, name: "-느라고" })).toBeVisible();

    await page.goto(HUB);
    await hydrated(box);
    await box.fill("zzzkhongco");
    await expect(summary).toHaveText("Không tìm thấy kết quả nào.");

    // Xóa ô: kết quả biến mất.
    await box.fill("");
    await expect(summary).toHaveText("");

    await page.route("**/api/lexicon/search*", (route) => route.abort("failed"));
    await box.fill("sa hoi");
    await expect(
      page.getByRole("alert").filter({ hasText: "Không tìm được lúc này" }),
    ).toBeVisible();
    // Trang vẫn dùng được: các lối vào còn nguyên.
    await expect(page.getByRole("region", { name: "Học ngay" })).toBeVisible();
  });
});

test.describe("Lý thuyết — Từ vựng: danh sách, bộ lọc, đã thuộc", () => {
  test("Danh sách: mỗi từ có liên kết + nút đã thuộc; phân trang 'Hiện thêm'; chữ Hàn có lang=ko", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    await expect(page.getByRole("heading", { level: 1, name: "Từ vựng" })).toBeVisible();
    const { shown, total } = await readCount(page, "từ");
    expect(shown).toBe(total);
    expect(total).toBeGreaterThan(0);

    const rows = vocabList(page).getByRole("listitem");
    const firstPage = Math.min(total, 50);
    await expect(rows).toHaveCount(firstPage);
    const first = rows.first();
    await expect(first.getByRole("link")).toHaveAttribute("href", /\/tu-vung\/v-\d+$/);
    await expect(first.getByRole("button", { name: /^Đánh dấu đã thuộc: / })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(first.locator('[lang="ko"]').first()).toContainText(/[가-힣]/);

    if (total > 50) {
      const more = page.getByRole("button", { name: `Hiện thêm ${total - 50} từ` });
      await more.click();
      await expect(rows).toHaveCount(total);
      await expect(more).toHaveCount(0);
    }
  });

  test("Lọc theo cấp: nút aria-pressed, URL ?cap=, mọi dòng đúng cấp, 'Xóa bộ lọc' xóa query", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    const levels = filterGroup(page, "Cấp");
    await hydrated(levels.getByRole("button").first());
    const all = levels.getByRole("button", { name: "Tất cả" });
    await expect(all).toHaveAttribute("aria-pressed", "true");

    const chip = levels.getByRole("button", { name: /^(3급|Cấp 3) \(\d+\)$/ });
    const expected = Number((await chip.innerText()).match(/\((\d+)\)/)![1]);
    const { total } = await readCount(page, "từ");
    await chip.click();

    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(/[?&]cap=3(&|$)/);
    await expect(page.getByText(`Hiển thị ${expected}/${total} từ`)).toBeVisible();
    const rows = vocabList(page).getByRole("listitem");
    await expect(rows).toHaveCount(Math.min(expected, 50));
    for (const text of await rows.allInnerTexts()) expect(text).toContain("Cấp 3");

    // Bấm lại chip đang chọn thì bỏ chọn, như nút "Tất cả".
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(page).not.toHaveURL(/cap=/);

    await chip.click();
    await all.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(page).not.toHaveURL(/cap=/);

    await chip.click();
    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(page).toHaveURL(new RegExp(`${VOCAB}$`));
    await expect(page.getByText(`Hiển thị ${total}/${total} từ`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Xóa bộ lọc" })).toHaveCount(0);
  });

  test("Lọc theo chủ đề + từ loại (ô chọn có nhãn), kết hợp cấp; tải lại giữ nguyên bộ lọc", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    const topic = page.getByRole("combobox", { name: "Chủ đề" });
    const pos = page.getByRole("combobox", { name: "Từ loại" });
    await hydrated(topic);
    await expect(page.getByRole("combobox", { name: "Trạng thái" })).toBeVisible();

    // Chọn theo giá trị: lấy option "Xã hội" bất kể số đếm.
    const topicOption = await topic
      .locator("option", { hasText: /^Xã hội \(\d+\)$/ })
      .getAttribute("value");
    expect(topicOption, "phải có chủ đề Xã hội").toBeTruthy();
    await topic.selectOption(topicOption!);
    await expect(page).toHaveURL(new RegExp(`chu-de=${topicOption}`));
    const afterTopic = await readCount(page, "từ");
    expect(afterTopic.shown).toBeGreaterThan(0);
    expect(afterTopic.shown).toBeLessThan(afterTopic.total);

    const noun = await pos
      .locator("option", { hasText: /^Danh từ \(\d+\)$/ })
      .getAttribute("value");
    await pos.selectOption(noun!);
    await expect(page).toHaveURL(new RegExp(`tu-loai=${noun}`));
    const afterPos = await readCount(page, "từ");
    expect(afterPos.shown).toBeLessThanOrEqual(afterTopic.shown);
    for (const text of await vocabList(page).getByRole("listitem").allInnerTexts()) {
      expect(text).toContain("Danh từ");
    }

    await page.reload();
    await expect(topic).toHaveValue(topicOption!);
    await expect(pos).toHaveValue(noun!);
    await expect.poll(async () => (await readCount(page, "từ")).shown).toBe(afterPos.shown);

    // Mở thẳng bằng URL có query cũng lọc đúng.
    await page.goto(`${VOCAB}?chu-de=${topicOption}&tu-loai=${noun}`);
    await expect.poll(async () => (await readCount(page, "từ")).shown).toBe(afterPos.shown);

    // Bộ lọc không có kết quả: thông báo thay vì danh sách rỗng.
    await page.goto(`${VOCAB}?chu-de=khong-co-chu-de-nay`);
    await expect(page.getByText("Không có từ nào khớp bộ lọc.")).toBeVisible();
    await expect(vocabList(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(vocabList(page)).toBeVisible();
  });

  test("Chỉ bạn giả Hán-Việt: bật bằng ô chọn, mọi dòng có nhãn Bạn giả, 발표 nằm trong danh sách", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    const checkbox = page.getByRole("checkbox", { name: /^Chỉ bạn giả Hán-Việt/ });
    await hydrated(checkbox);
    await checkbox.check();
    await expect(page).toHaveURL(/ban-gia=1/);
    const { shown, total } = await readCount(page, "từ");
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
    const rows = vocabList(page).getByRole("listitem");
    await expect(rows).toHaveCount(Math.min(shown, 50));
    for (const text of await rows.allInnerTexts()) expect(text).toContain("Bạn giả");
    await expect(rows.filter({ hasText: "발표" })).toHaveCount(1);
    // Nhãn có chữ (không chỉ dựa vào màu/biểu tượng): đọc được mức độ bạn giả.
    await expect(rows.filter({ hasText: "발표" })).toContainText("Bạn giả một phần");

    await checkbox.uncheck();
    await expect(page).not.toHaveURL(/ban-gia/);
  });

  test("Tìm trong danh sách: theo hangul và theo âm Hán-Việt không dấu; 'Xóa bộ lọc' xóa cả ô tìm", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    const box = searchInList(page);
    await hydrated(box);
    const { total } = await readCount(page, "từ");

    await box.fill("발표");
    await expect(vocabList(page).getByRole("listitem")).toHaveCount(1);
    await expect(vocabList(page).getByRole("listitem")).toContainText("발표");

    await box.fill("phat bieu");
    await expect(vocabList(page).getByRole("listitem").filter({ hasText: "발표" })).toHaveCount(1);

    await box.fill("zzz-khong-co");
    await expect(page.getByText("Không có từ nào khớp bộ lọc.")).toBeVisible();

    await box.fill("");
    await expect(page.getByText(`Hiển thị ${total}/${total} từ`)).toBeVisible();
  });

  test("Đánh dấu đã thuộc: tiến độ, ô lọc trạng thái, lưu localStorage, còn sau khi tải lại", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    const toggle = knownToggle(page, "발표");
    await hydrated(toggle);
    const { total } = await readCount(page, "từ");
    await expect(page.getByText(`Đã thuộc 0/${total} từ`)).toBeVisible();
    await expect(progressBar(page)).toHaveAttribute("aria-valuenow", "0");
    await expect(progressBar(page)).toHaveAttribute("aria-valuemax", String(total));
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toContainText("Đã thuộc"); // có chữ, không chỉ màu
    await expect(page.getByText(`Đã thuộc 1/${total} từ`)).toBeVisible();
    await expect(progressBar(page)).toHaveAttribute("aria-valuenow", "1");
    expect(
      JSON.parse((await page.evaluate((key) => localStorage.getItem(key), KNOWN_KEY))!),
    ).toEqual(["v-00037"]);

    // Lọc theo trạng thái.
    const status = page.getByRole("combobox", { name: "Trạng thái" });
    await status.selectOption({ label: "Đã thuộc" });
    await expect(page).toHaveURL(/trang-thai=da-thuoc/);
    await expect(vocabList(page).getByRole("listitem")).toHaveCount(1);
    await expect(vocabList(page).getByRole("listitem")).toContainText("발표");
    await status.selectOption({ label: "Chưa thuộc" });
    await expect(page).toHaveURL(/trang-thai=chua-thuoc/);
    await expect(page.getByText(`Hiển thị ${total - 1}/${total} từ`)).toBeVisible();
    await expect(vocabList(page).getByRole("listitem").filter({ hasText: "발표" })).toHaveCount(0);

    // Tải lại: bộ lọc (URL) và trạng thái (localStorage) cùng còn.
    await page.reload();
    await expect(page.getByText(`Hiển thị ${total - 1}/${total} từ`)).toBeVisible();
    await expect(progressBar(page)).toHaveAttribute("aria-valuenow", "1");
    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(knownToggle(page, "발표")).toHaveAttribute("aria-pressed", "true");

    // Bỏ đánh dấu: kho trống thì xóa khóa.
    await knownToggle(page, "발표").click();
    await expect(page.getByText(`Đã thuộc 0/${total} từ`)).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), KNOWN_KEY)).toBeNull();
  });

  test("Đã thuộc đồng bộ giữa trang chi tiết và danh sách", async ({ page }) => {
    await page.goto(BALJEON);
    const toggle = knownToggle(page, "발표");
    await hydrated(toggle);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await page.goto(VOCAB);
    await expect(knownToggle(page, "발표")).toHaveAttribute("aria-pressed", "true");
    await expect(progressBar(page)).toHaveAttribute("aria-valuenow", "1");
  });

  test("Dữ liệu 'đã thuộc' hỏng hoặc có id lạ trong localStorage bị bỏ qua, không làm lỗi trang", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key]) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(
            key!,
            JSON.stringify(["v-00037", "v-99999", 5, null, "", "x".repeat(100)]),
          );
          sessionStorage.setItem("seeded", "1");
        }
      },
      [KNOWN_KEY],
    );
    await page.goto(VOCAB);
    const { total } = await readCount(page, "từ");
    await expect(page.getByText(`Đã thuộc 1/${total} từ`)).toBeVisible(); // chỉ v-00037 hợp lệ và có thật
    await expect(knownToggle(page, "발표")).toHaveAttribute("aria-pressed", "true");

    await page.evaluate((key) => localStorage.setItem(key, "{không phải json"), KNOWN_KEY);
    await page.reload();
    await expect(page.getByText(`Đã thuộc 0/${total} từ`)).toBeVisible();
    await expect(knownToggle(page, "발표")).toHaveAttribute("aria-pressed", "false");
  });

  test("Không ghi được localStorage: báo cho người học, đánh dấu vẫn đúng trong phiên", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("đầy bộ nhớ", "QuotaExceededError");
      };
    });
    await page.goto(VOCAB);
    const toggle = knownToggle(page, "발표");
    await hydrated(toggle);
    await expect(page.getByText("Không lưu được trên thiết bị này")).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("alert").filter({ hasText: "Không lưu được trên thiết bị này" }),
    ).toBeVisible();
  });

  test("Bàn phím: Tab tới nút đã thuộc, Space/Enter bật tắt; bộ lọc cấp dùng được bằng Enter", async ({
    page,
  }) => {
    await page.goto(VOCAB);
    const toggle = knownToggle(page, "발표");
    await hydrated(toggle);
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    const chip = filterGroup(page, "Cấp").getByRole("button", { name: /^(3급|Cấp 3)/ });
    await chip.focus();
    await page.keyboard.press("Enter");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/cap=3/);
  });
});

test.describe("Lý thuyết — Từ vựng: trang chi tiết và cây hình vị", () => {
  test("Bạn giả một phần (발표): tiêu đề, callout, nhãn chờ duyệt, nghĩa, ví dụ", async ({
    page,
  }) => {
    await page.goto(BALJEON);
    await expect(page.getByRole("heading", { level: 1, name: "발표" })).toHaveAttribute(
      "lang",
      "ko",
    );
    await expect(page.getByText("Âm Hán-Việt: phát biểu")).toBeVisible();
    await expect(page.getByText("Nội dung đang chờ duyệt", { exact: true })).toBeVisible();

    const callout = page.getByRole("region", { name: "Bạn giả một phần" });
    await expect(callout.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(callout).toContainText("Trong tiếng Việt, “phát biểu” nghĩa là");
    await expect(callout).toContainText("Cần nhớ");

    await expect(page.getByRole("region", { name: "Nghĩa" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Ví dụ" }).locator('[lang="ko"]').first(),
    ).toContainText("발표");
    await expect(page.getByRole("region", { name: "Cụm hay đi cùng" })).toBeVisible();
    await expectHeadingOutline(page, BALJEON);

    // Breadcrumb về danh sách.
    await page
      .getByRole("navigation", { name: "Đường dẫn" })
      .getByRole("link", { name: "Từ vựng" })
      .click();
    await expect(page).toHaveURL(new RegExp(`${VOCAB}$`));
  });

  test("Cây hình vị: nút âm tiết aria-pressed, đổi chữ Hán, liên kết sang trang chữ", async ({
    page,
  }) => {
    await page.goto(BALJEON);
    const tree = page.getByRole("region", { name: "Cây hình vị Hán-Hàn" });
    const tabs = tree.getByRole("group", { name: "Các chữ Hán trong từ" });
    const fa = tabs.getByRole("button", { name: "발 發 phát" });
    const pyo = tabs.getByRole("button", { name: "표 表 biểu" });
    await hydrated(fa);
    await expect(fa).toHaveAttribute("aria-pressed", "true");
    await expect(pyo).toHaveAttribute("aria-pressed", "false");

    await expect(
      tree.getByRole("heading", { level: 3, name: "Các từ khác chứa 發" }),
    ).toBeVisible();
    const hanjaLink = tree.getByRole("link", { name: "Xem trang chữ 發" });
    await expect(hanjaLink).toHaveAttribute("href", `${HANJA_INDEX}/%E7%99%BC`);

    await pyo.click();
    await expect(pyo).toHaveAttribute("aria-pressed", "true");
    await expect(fa).toHaveAttribute("aria-pressed", "false");
    await expect(
      tree.getByRole("heading", { level: 3, name: "Các từ khác chứa 表" }),
    ).toBeVisible();
    await expect(tree.getByRole("link", { name: "Xem trang chữ 表" })).toBeVisible();

    await tree.getByRole("link", { name: "Xem trang chữ 表" }).click();
    await expect(page).toHaveURL(new RegExp(`${HANJA_INDEX}/%E8%A1%A8$`));
    await expect(page.getByRole("heading", { level: 1, name: /表/ })).toBeVisible();
  });

  test("Cây hình vị liệt kê 'gia đình từ': 사회 → chữ 會 → từ khác chứa 會 → mở trang từ đó", async ({
    page,
  }) => {
    await page.goto(SAHOE);
    const tree = page.getByRole("region", { name: "Cây hình vị Hán-Hàn" });
    const hoe = tree.getByRole("button", { name: "회 會 hội" });
    await hydrated(hoe);
    await hoe.click();
    await expect(
      tree.getByRole("heading", { level: 3, name: "Các từ khác chứa 會" }),
    ).toBeVisible();
    const family = tree.getByRole("list").getByRole("link");
    await expect(family).not.toHaveCount(0);
    await expect(tree.getByText("Chưa có từ nào khác trong kho chứa chữ Hán này.")).toHaveCount(0);

    const href = await family.first().getAttribute("href");
    expect(href).toMatch(/\/tu-vung\/v-\d+$/);
    expect(href).not.toBe(`${VOCAB}/v-00001`);
    await family.first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveAttribute("lang", "ko");
  });

  test("Từ thuần Hàn (쓰레기) không có cây hình vị và không có callout bạn giả", async ({
    page,
  }) => {
    await page.goto(`${VOCAB}/v-00012`);
    await expect(page.getByRole("heading", { level: 1, name: "쓰레기" })).toBeVisible();
    await expect(
      page.getByText("Từ thuần Hàn, không có chữ Hán nên không có cây hình vị."),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Cây hình vị Hán-Hàn" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: /^Bạn giả/ })).toHaveCount(0);
  });
});

test.describe("Lý thuyết — Hán tự", () => {
  test("Danh sách chữ Hán dẫn tới trang chữ; trang chữ liệt kê các từ chứa nó", async ({
    page,
  }) => {
    await page.goto(HANJA_INDEX);
    await expect(page.getByRole("heading", { level: 1, name: "Hán tự" })).toBeVisible();
    const list = page.getByRole("list", { name: "Danh sách chữ Hán" });
    await expect(list.getByRole("link").first()).toHaveAccessibleName(/\d+ từ$/);

    const link = list.getByRole("link", { name: /^會, / });
    await expect(link).toHaveAccessibleName(/hội, \d+ từ$/);
    await link.click();
    await expect(page).toHaveURL(/\/han-tu\/%E6%9C%83$/);
    await expect(page.getByRole("heading", { level: 1, name: /會/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Cách đọc" })).toContainText("hội");
    const words = page.getByRole("region", { name: "Các từ chứa 會" }).getByRole("link");
    await expect(words).not.toHaveCount(0);
    await words.first().click();
    await expect(page).toHaveURL(/\/tu-vung\/v-\d+$/);

    // URL viết thẳng chữ Hán (chưa mã hóa) cũng mở được.
    await page.goto(`${HANJA_INDEX}/發`);
    await expect(page.getByRole("heading", { level: 1, name: /發/ })).toBeVisible();
  });
});

test.describe("Lý thuyết — Ngữ pháp", () => {
  test("Danh sách: nhóm so sánh, lọc cấp/chức năng/nhóm, tìm kiếm, xóa bộ lọc", async ({
    page,
  }) => {
    await page.goto(GRAMMAR);
    await expect(page.getByRole("heading", { level: 1, name: "Ngữ pháp" })).toBeVisible();
    const groupLinks = page
      .getByRole("list", { name: "Các nhóm so sánh ngữ pháp" })
      .getByRole("link");
    await expect(groupLinks).not.toHaveCount(0);
    await expect(groupLinks.first()).toHaveAttribute("href", /\/ngu-phap\/nhom\/[a-z0-9-]+$/);

    const { total } = await readCount(page, "điểm ngữ pháp");
    await expect(grammarList(page).getByRole("listitem")).toHaveCount(total);

    const levels = filterGroup(page, "Cấp");
    await hydrated(levels.getByRole("button").first());
    const chip = levels.getByRole("button", { name: /^(4급|Cấp 4) \(\d+\)$/ });
    const expected = Number((await chip.innerText()).match(/\((\d+)\)/)![1]);
    await chip.click();
    await expect(page).toHaveURL(/cap=4/);
    await expect(page.getByText(`Hiển thị ${expected}/${total} điểm ngữ pháp`)).toBeVisible();
    for (const text of await grammarList(page).getByRole("listitem").allInnerTexts()) {
      expect(text).toContain("Cấp 4");
    }

    const fn = page.getByRole("combobox", { name: "Chức năng" });
    const reason = await fn
      .locator("option", { hasText: /^Nguyên nhân, lý do/ })
      .getAttribute("value");
    await fn.selectOption(reason!);
    await expect(page).toHaveURL(new RegExp(`chuc-nang=${reason}`));
    const afterFn = await readCount(page, "điểm ngữ pháp");
    expect(afterFn.shown).toBeGreaterThan(0);
    expect(afterFn.shown).toBeLessThanOrEqual(expected);

    await page.reload();
    await expect(fn).toHaveValue(reason!);
    await expect
      .poll(async () => (await readCount(page, "điểm ngữ pháp")).shown)
      .toBe(afterFn.shown);

    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(page).toHaveURL(new RegExp(`${GRAMMAR}$`));
    await expect(page.getByText(`Hiển thị ${total}/${total} điểm ngữ pháp`)).toBeVisible();

    // Lọc theo nhóm so sánh: chỉ các mẫu thuộc nhóm.
    const group = page.getByRole("combobox", { name: "Nhóm so sánh" });
    const groupValue = await group.locator("option").nth(1).getAttribute("value");
    await group.selectOption(groupValue!);
    await expect(page).toHaveURL(new RegExp(`nhom=${groupValue}`));
    const inGroup = await readCount(page, "điểm ngữ pháp");
    expect(inGroup.shown).toBeGreaterThanOrEqual(2);
    for (const text of await grammarList(page).getByRole("listitem").allInnerTexts()) {
      expect(text).toContain("Thuộc nhóm so sánh");
    }

    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    const box = searchInList(page);
    await box.fill("느라고");
    await expect(grammarList(page).getByRole("listitem")).toHaveCount(1);
    await box.fill("zzz");
    await expect(page.getByText("Không có điểm ngữ pháp nào khớp bộ lọc.")).toBeVisible();
  });

  test("Chi tiết -나 보다: câu sai thường gặp, lỗi người Việt, liên kết nhóm so sánh và mẫu liên quan", async ({
    page,
  }) => {
    await page.goto(NA_BODA);
    await expect(page.getByRole("heading", { level: 1, name: "-나 보다" })).toHaveAttribute(
      "lang",
      "ko",
    );
    await expect(page.getByText("Nội dung đang chờ duyệt", { exact: true })).toBeVisible();
    for (const name of [
      "Nghĩa",
      "Giải thích",
      "Cách chia",
      "Ràng buộc khi dùng",
      "Ví dụ",
      "Câu sai thường gặp",
      "Lỗi người Việt hay mắc",
      "Thuộc nhóm so sánh",
      "Điểm ngữ pháp liên quan",
    ]) {
      await expect(page.getByRole("region", { name, exact: true }), name).toBeVisible();
    }

    // Câu sai có chữ "Câu sai" và phần "Sửa thành" (không chỉ dựa vào màu).
    const wrong = page.getByRole("region", { name: "Câu sai thường gặp" }).getByRole("listitem");
    await expect(wrong.first()).toContainText("Câu sai");
    await expect(wrong.first()).toContainText("Sửa thành:");
    expect(await wrong.count()).toBeGreaterThanOrEqual(2);
    await expectHeadingOutline(page, NA_BODA);

    const related = page.getByRole("region", { name: "Điểm ngữ pháp liên quan" });
    await expect(related.getByRole("link", { name: "-(으)ㄴ/는 모양이다" })).toBeVisible();

    await page.getByRole("link", { name: "Xem bảng so sánh cả nhóm" }).click();
    await expect(page).toHaveURL(new RegExp(`${GROUP}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Phỏng đoán");
  });

  test("Nhóm so sánh: bảng cuộn ngang trong khung, trang không tràn; ví dụ có nhãn Đúng/Sai bằng chữ", async ({
    page,
  }, testInfo) => {
    await page.goto(GROUP);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Phỏng đoán");
    const members = page.getByRole("region", { name: "Các mẫu trong nhóm" }).getByRole("link");
    expect(await members.count()).toBeGreaterThanOrEqual(2);
    await expect(members.first()).toHaveAttribute("href", /\/ngu-phap\/[a-z0-9-]+$/);

    const table = page.getByRole("table", { name: /^Bảng so sánh/ });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader").first()).toHaveText("Tiêu chí");
    expect(await table.getByRole("rowheader").count()).toBeGreaterThanOrEqual(5);

    const frame = page.getByRole("group", { name: /^Bảng so sánh.*Cuộn ngang/ });
    await expect(frame).toHaveAttribute("tabindex", "0"); // cuộn được bằng bàn phím
    await expectNoHorizontalOverflow(page, GROUP);

    const sizes = await frame.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    if (testInfo.project.name === "mobile") {
      expect(sizes.sw, "bảng phải rộng hơn khung ở 375px").toBeGreaterThan(sizes.cw);
    }
    if (sizes.sw > sizes.cw) {
      await frame.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => frame.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      // Cột tiêu chí dính bên trái nên vẫn nhìn thấy khi cuộn.
      const header = table.getByRole("columnheader", { name: "Tiêu chí" });
      const frameBox = (await frame.boundingBox())!;
      const headerBox = (await header.boundingBox())!;
      expect(headerBox.x).toBeGreaterThanOrEqual(frameBox.x - 1);
      expect(headerBox.x).toBeLessThan(frameBox.x + frameBox.width);
    }

    const situations = page.getByRole("region", {
      name: "Cùng một tình huống, mỗi mẫu dùng ra sao",
    });
    await expect(situations.locator("p", { hasText: /^Đúng/ }).first()).toBeVisible();
    await expect(situations.locator("p", { hasText: /^Sai/ }).first()).toBeVisible();
    await expectHeadingOutline(page, GROUP);
  });

  test("Mọi nhóm so sánh mở được và có bảng", async ({ page }) => {
    await page.goto(GRAMMAR);
    const hrefs = await page
      .getByRole("list", { name: "Các nhóm so sánh ngữ pháp" })
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) {
      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 }), href).toBeVisible();
      await expect(page.getByRole("table", { name: /^Bảng so sánh/ }), href).toBeVisible();
      await expectNoHorizontalOverflow(page, href);
    }
  });
});

test.describe("Lý thuyết — nguồn, 404, bố cục, API", () => {
  test("Trang Nguồn và ghi công: ghi công, danh sách nguồn, tình trạng nội dung", async ({
    page,
  }) => {
    await page.goto(SOURCES);
    await expect(page.getByRole("heading", { level: 1, name: "Nguồn và ghi công" })).toBeVisible();
    for (const name of [
      "Ghi công",
      "Các nguồn tham chiếu",
      "Chúng tôi dùng các nguồn này như thế nào",
      "Tình trạng nội dung",
    ]) {
      await expect(page.getByRole("region", { name }), name).toBeVisible();
    }
    const sources = page
      .getByRole("list", { name: "Danh sách nguồn tham chiếu" })
      .getByRole("listitem");
    expect(await sources.count()).toBeGreaterThanOrEqual(1);
    await expectHeadingOutline(page, SOURCES);
  });

  test("Mọi trang lý thuyết có chân trang 'Nguồn và ghi công', đúng cấu trúc tiêu đề, không tràn ngang", async ({
    page,
  }) => {
    for (const url of THEORY_PAGES) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 }).first(), url).toBeVisible();
      await expect(footerSources(page).first(), url).toHaveAttribute("href", SOURCES);
      await expectHeadingOutline(page, url);
      await expectNoHorizontalOverflow(page, url);
    }
  });

  test("Trang không tồn tại trả giao diện 404 (và không tiết lộ nội dung khác)", async ({
    page,
  }) => {
    const missing = [
      `${VOCAB}/v-99999`,
      // Phân biệt hoa thường. Bỏ trên Windows: hệ thống file không phân biệt hoa thường nên
      // `next start` có thể trả file prerender của v-00037 (CI chạy Linux vẫn kiểm).
      ...(process.platform === "win32" ? [] : [`${VOCAB}/V-00037`]),
      `${VOCAB}/v-00037%20`,
      `${VOCAB}/%3Cscript%3Ealert(1)%3C%2Fscript%3E`,
      `${HANJA_INDEX}/X`,
      `${HANJA_INDEX}/${encodeURIComponent("社會")}`, // chỉ nhận MỘT chữ Hán
      `${GRAMMAR}/khong-co`,
      `${GRAMMAR}/nhom/xx`,
      `${GRAMMAR}/nhom/na-boda`, // slug điểm ngữ pháp không phải slug nhóm
      `/${PROGRAM}/luyen-tap/viet/W99`,
    ];
    for (const url of missing) {
      await page.goto(url);
      await expect(NOT_FOUND(page), url).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Về trang chủ", exact: true }),
        url,
      ).toHaveAttribute("href", "/");
      expect(
        await page.locator('meta[name="robots"][content*="noindex"]').count(),
        url,
      ).toBeGreaterThan(0);
    }
  });

  test("Chương trình chưa mở (TOPIK I, EPS) hiện 'Sắp ra mắt' ở các trang lý thuyết, không lỗi", async ({
    page,
  }) => {
    for (const program of ["topik-i", "eps"]) {
      for (const path of ["", "/tu-vung", "/ngu-phap", "/nguon"]) {
        await page.goto(`/${program}/ly-thuyet${path}`);
        await expect(page.getByText("Sắp ra mắt").first(), `${program}${path}`).toBeVisible();
      }
    }
  });

  test("Bố cục: chữ Hàn trong thẻ từ/tiêu đề dùng keep-all, không tràn ngang", async ({ page }) => {
    await page.goto(VOCAB);
    const hangul = vocabList(page).locator('[lang="ko"]').first();
    await expect(hangul).toHaveCSS("word-break", "keep-all");
    await page.goto(NA_BODA);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("word-break", "keep-all");
    await expectNoHorizontalOverflow(page, NA_BODA);
    // Ví dụ tiếng Hàn dài không bị vỡ giữa từ.
    const example = page.getByRole("region", { name: "Ví dụ" }).locator('[lang="ko"]').first();
    await expect(example).toHaveCSS("word-break", "keep-all");
  });

  test("API tìm kiếm: 200 có kết quả không dấu; 400 thiếu tham số/quá dài/limit sai; 404 chương trình lạ", async ({
    request,
  }) => {
    const ok = await request.get(`/api/lexicon/search?program=${PROGRAM}&q=phat%20bieu&limit=5`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toContain("no-store");
    const body = await ok.json();
    expect(body.vocab.map((w: { id: string }) => w.id)).toContain("v-00037");
    expect(body.vocab.length).toBeLessThanOrEqual(5);
    // Không lộ trường nội bộ.
    const raw = JSON.stringify(body);
    for (const field of ["notes_internal", "authored_by", "reviewed_by"]) {
      expect(raw).not.toContain(field);
    }

    const grammar = await request.get(
      `/api/lexicon/search?program=${PROGRAM}&q=${encodeURIComponent("느라고")}`,
    );
    expect((await grammar.json()).grammar.length).toBeGreaterThanOrEqual(1);

    const empty = await request.get(`/api/lexicon/search?program=${PROGRAM}&q=`);
    expect(empty.status()).toBe(200);
    expect(await empty.json()).toMatchObject({ vocab: [], grammar: [] });

    for (const query of [
      "",
      `?program=${PROGRAM}`,
      `?q=abc`,
      `?program=${PROGRAM}&q=${"a".repeat(65)}`,
      `?program=${PROGRAM}&q=a&limit=0`,
      `?program=${PROGRAM}&q=a&limit=51`,
      `?program=${PROGRAM}&q=a&limit=abc`,
    ]) {
      const bad = await request.get(`/api/lexicon/search${query}`);
      expect(bad.status(), `search${query}`).toBe(400);
      expect((await bad.json()).error.code).toBe("invalid_query");
    }
    const noProgram = await request.get("/api/lexicon/search?program=khong-co&q=a");
    expect(noProgram.status()).toBe(404);
    expect((await noProgram.json()).error.code).toBe("program_not_found");
    // Chuỗi đặc biệt không gây lỗi 500.
    for (const q of ["%", "'; DROP TABLE x;--", "<script>", "\\", ".*", "(((("]) {
      const res = await request.get(
        `/api/lexicon/search?program=${PROGRAM}&q=${encodeURIComponent(q)}`,
      );
      expect(res.status(), `q=${q}`).toBe(200);
    }
  });
});
