import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

/**
 * E2E Test trình độ (đề placement-01, 12 câu Đọc, 15 phút) ở chế độ khách:
 * thẻ ở /lo-trinh -> /lo-trinh/test-trinh-do -> làm bài -> nộp -> kết quả theo bậc độ khó ->
 * quay lại thẻ ở /lo-trinh thấy kết quả lưu IndexedDB "topikly-exam". Mỗi test dùng browser
 * context mới nên IndexedDB luôn sạch.
 *
 * Đáp án đúng KHÔNG hard-code: lấy từ POST /api/exam/submit với bài trống (server trả
 * correctLabel từng câu). Kết quả kỳ vọng được suy ra từ chính bảng bậc trên giao diện theo quy
 * tắc của lib/exam/placement.ts: bậc vững khi tỉ lệ đúng làm tròn 2 chữ số >= ngưỡng (đọc từ câu
 * quy tắc hiển thị), trình độ = bậc cao nhất của chuỗi vững liên tục từ 3급, cấp bắt đầu =
 * trình độ ?? 3급. Nhờ vậy đổi nội dung đề hay ngưỡng không làm vỡ test.
 */

const PROGRAM = "topik-ii";
const ROADMAP_URL = `/${PROGRAM}/lo-trinh`;
const PLACEMENT_URL = `/${PROGRAM}/lo-trinh/test-trinh-do`;
const MINI_LIST_URL = `/${PROGRAM}/de-thi/mini`;
const SUBMIT_URL = "/api/exam/submit";
const EXAM_ID = "placement-01";
const TOTAL = 12;
const DURATION_SEC = 900;
const BANDS = [3, 4, 5, 6];

// ------------------------------------------------------------------ sự thật từ server

interface TruthQuestion {
  questionId: string;
  number: number;
  correctLabel: string;
  explanation_vi: string;
  type_code: string;
}
interface ApiBand {
  difficulty: number;
  correct: number;
  total: number;
  ratio: number;
  passed: boolean;
}
interface ApiPlacement {
  estimated_level: number | null;
  estimated_label: string;
  start_level: number;
  start_label: string;
  bands: ApiBand[];
  weak_subskills: { code: string; name_vi: string; correct: number; total: number }[];
}
interface PlacementApiResult {
  kind: string;
  questions: TruthQuestion[];
  placement?: ApiPlacement;
}

function placementRequest(answers: Record<string, string | null>) {
  return { program: PROGRAM, kind: "placement", examId: EXAM_ID, answers };
}

async function fetchTruth(request: APIRequestContext) {
  const response = await request.post(SUBMIT_URL, { data: placementRequest({}) });
  expect(response.status(), "API phải chấm được đề placement-01").toBe(200);
  const body = (await response.json()) as PlacementApiResult;
  expect(body.questions).toHaveLength(TOTAL);
  return body;
}

// ------------------------------------------------------------------ helper giao diện

const runner = (page: Page) => page.getByRole("region", { name: "Trình làm đề thi" });
const timer = (page: Page) => page.getByRole("timer");
const startButton = (page: Page) => page.getByRole("button", { name: "Bắt đầu làm bài" });
const submitButton = (page: Page) => page.getByRole("button", { name: "Nộp bài" }).first();
const dialog = (page: Page) => page.getByRole("dialog", { name: "Nộp bài?" });
const resultHeading = (page: Page) =>
  page.getByRole("heading", { level: 2, name: "Kết quả Test trình độ" });
const bandTable = (page: Page) => page.getByRole("table", { name: "Kết quả theo bậc độ khó" });

async function remainingSeconds(page: Page): Promise<number> {
  const text = (await timer(page).textContent()) ?? "";
  const match = /(\d{2}):(\d{2})/.exec(text);
  expect(match, `đồng hồ phải có dạng mm:ss, nhận được "${text}"`).not.toBeNull();
  return Number(match![1]) * 60 + Number(match![2]);
}

async function startPlacement(page: Page) {
  await page.goto(PLACEMENT_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Test trình độ" })).toBeVisible();
  await startButton(page).click(); // tự chờ hết trạng thái disabled "Đang kiểm tra bài làm dở…"
  await expect(timer(page)).toBeVisible();
}

async function gotoQuestion(page: Page, n: number) {
  const toggle = page.getByRole("button", { name: "Bảng câu hỏi" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await page
    .getByRole("navigation", { name: "Bảng số câu" })
    .getByRole("button", { name: new RegExp(`^Câu ${n}\\b`) })
    .click();
  await expect(page.getByRole("heading", { level: 3, name: `Câu ${n}` })).toBeFocused();
}

const choicesOf = (page: Page, n: number): Locator =>
  page.getByRole("radiogroup", { name: `Câu ${n}: chọn đáp án` });
const radio = (page: Page, n: number, label: string) =>
  choicesOf(page, n).getByRole("radio", { name: new RegExp(`^${label}`) });

async function pick(page: Page, n: number, label: string) {
  const id = await radio(page, n, label).getAttribute("id");
  await page.locator(`label[for="${id}"]`).click();
  await expect(radio(page, n, label)).toBeChecked();
}

async function answer(page: Page, n: number, label: string) {
  await gotoQuestion(page, n);
  await pick(page, n, label);
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

async function shiftDraftStart(page: Page, byMs: number) {
  await page.evaluate(
    (shift) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("topikly-exam");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("drafts", "readwrite");
          const store = tx.objectStore("drafts");
          const all = store.getAll();
          all.onsuccess = () => {
            for (const draft of all.result)
              store.put({ ...draft, startedAt: draft.startedAt - shift });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    byMs,
  );
}

async function countDrafts(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("topikly-exam");
        open.onerror = () => resolve(-1);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("drafts")) {
            db.close();
            resolve(0);
            return;
          }
          const req = db.transaction("drafts").objectStore("drafts").count();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => {
            db.close();
            resolve(-1);
          };
        };
      }),
  );
}

async function submitViaDialog(page: Page) {
  await submitButton(page).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
}

interface UiBand {
  difficulty: number;
  correct: number;
  total: number;
  passedAttr: string | null;
  percentText: string;
  barWidth: string;
  statusText: string;
}

/** Đọc bảng bậc trên giao diện. */
async function readBands(page: Page): Promise<UiBand[]> {
  const rows = bandTable(page).locator("tbody tr");
  const count = await rows.count();
  const bands: UiBand[] = [];
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const head = (await row.getByRole("rowheader").textContent()) ?? "";
    const cells = row.getByRole("cell");
    const ratio = /(\d+)\s*\/\s*(\d+)/.exec((await cells.nth(0).textContent()) ?? "");
    expect(ratio, `ô "Đúng/tổng" của dòng ${i} phải dạng c/t`).not.toBeNull();
    const bar = row.getByTestId("band-bar");
    await expect(bar, `dòng ${i} phải có đúng 1 thanh band-bar`).toHaveCount(1);
    bands.push({
      difficulty: Number(/(\d+)/.exec(head)![1]),
      correct: Number(ratio![1]),
      total: Number(ratio![2]),
      passedAttr: await row.getAttribute("data-passed"),
      percentText: ((await cells.nth(1).textContent()) ?? "").trim(),
      barWidth: (await bar.evaluate((el) => (el as HTMLElement).style.width)) ?? "",
      statusText: ((await cells.nth(2).textContent()) ?? "").trim(),
    });
  }
  return bands;
}

/** Suy kết quả kỳ vọng từ bảng bậc và ngưỡng, theo quy tắc placement.ts. */
function expectedFromBands(bands: UiBand[], passRatio: number) {
  const passedOf = (b: UiBand) => Math.round((b.correct / b.total) * 100) / 100 >= passRatio;
  let estimated: number | null = null;
  for (const d of BANDS) {
    const band = bands.find((b) => b.difficulty === d);
    if (!band || !passedOf(band)) break;
    estimated = d;
  }
  const start = estimated ?? BANDS[0];
  return {
    passed: (b: UiBand) => passedOf(b),
    estimatedLabel: estimated === null ? `Chưa đạt ${BANDS[0]}급` : `${estimated}급`,
    startLabel: `${start}급`,
  };
}

/** Ngưỡng "vững" đọc từ câu quy tắc ("đúng từ 60% số câu"). */
async function readPassRatio(page: Page): Promise<number> {
  const text =
    (await page
      .getByText(/Một bậc được tính là vững khi/)
      .first()
      .textContent()) ?? "";
  const m = /từ (\d+)%/.exec(text);
  expect(m, `câu quy tắc phải nêu ngưỡng %, nhận được "${text}"`).not.toBeNull();
  return Number(m![1]) / 100;
}

// ------------------------------------------------------------------ test

test.describe("Test trình độ — chế độ khách", () => {
  test("Thẻ ở Lộ trình: mời làm test, link dẫn tới trang làm bài, chưa có kết quả", async ({
    page,
  }) => {
    await page.goto(ROADMAP_URL);
    await expect(page.getByRole("heading", { level: 2, name: "Test trình độ" })).toBeVisible();
    const start = page.getByRole("link", { name: "Làm test ngay" });
    await expect(start).toBeVisible();
    await expect(page.getByText(`${TOTAL} câu Đọc trong 15 phút`)).toBeVisible();
    await expect(page.getByTestId("placement-card-result")).toHaveCount(0);

    await start.click();
    await expect(page).toHaveURL(/\/topik-ii\/lo-trinh\/test-trinh-do$/);
    const intro = page.getByRole("region", { name: "Trước khi bắt đầu" });
    await expect(intro).toContainText(`${TOTAL} câu · 15 phút`);
    await expect(intro).toContainText("ước lượng sơ bộ");
    await expect(timer(page)).toHaveCount(0);
    await startButton(page).click();
    await expect(timer(page)).toBeVisible();
    expect(await remainingSeconds(page)).toBeGreaterThan(DURATION_SEC - 30);
    await expect(page.getByText(`Đã làm 0/${TOTAL}`)).toBeVisible();
  });

  test("Chọn cùng một phương án cho mọi câu: tổng đúng/tổng khớp đáp án; không có phần xem lại; thẻ Lộ trình hiện kết quả", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    const LABEL = "①";
    const expectedCorrect = truth.questions.filter((q) => q.correctLabel === LABEL).length;

    await startPlacement(page);
    for (let n = 1; n <= TOTAL; n++) await answer(page, n, LABEL);
    await expect(page.getByText(`Đã làm ${TOTAL}/${TOTAL}`)).toBeVisible();

    await submitButton(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).not.toContainText("bỏ trống"); // không còn câu trống
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith(SUBMIT_URL) && r.request().method() === "POST"),
      dialog(page).getByRole("button", { name: "Nộp bài" }).click(),
    ]);
    expect((response.request().postDataJSON() as { kind: string }).kind).toBe("placement");
    const api = (await response.json()) as PlacementApiResult;

    await expect(resultHeading(page)).toBeVisible();
    await expect(resultHeading(page)).toBeFocused();

    // Cấu trúc kết quả: bảng 4 dòng bậc 3급–6급, mỗi dòng có data-passed và đúng 1 thanh.
    const bands = await readBands(page);
    expect(bands.map((b) => b.difficulty)).toEqual(BANDS);
    expect(bands.reduce((s, b) => s + b.total, 0)).toBe(TOTAL);
    const passRatio = await readPassRatio(page);
    const expected = expectedFromBands(bands, passRatio);
    for (const b of bands) {
      expect(b.passedAttr, `bậc ${b.difficulty}급 thiếu data-passed`).toMatch(/^(true|false)$/);
      expect(b.passedAttr === "true", `bậc ${b.difficulty}급 vững/không vững`).toBe(
        expected.passed(b),
      );
      expect(b.statusText).toContain(b.passedAttr === "true" ? "Vững" : "Chưa vững");
      const percent = Math.round((b.correct / b.total) * 100);
      expect(b.percentText).toBe(`${percent}%`);
      expect(b.barWidth).toBe(`${percent}%`);
    }

    // Tổng total = 12 câu đã nộp; tổng correct khớp đáp án thật từ server (và khớp response API).
    const sumCorrect = bands.reduce((s, b) => s + b.correct, 0);
    expect(sumCorrect).toBe(expectedCorrect);
    expect(api.placement!.bands.reduce((s, b) => s + b.correct, 0)).toBe(expectedCorrect);
    expect(api.placement!.bands.reduce((s, b) => s + b.total, 0)).toBe(TOTAL);
    expect(api.questions).toHaveLength(TOTAL);
    expect(
      api.questions.filter((q) => q.correctLabel === LABEL).length,
      "số câu đúng theo response API",
    ).toBe(sumCorrect);

    // Không có phần "Xem lại từng câu" (không đáp án, không lời giải); có đoạn giải thích lý do.
    await expect(page.getByRole("heading", { name: "Xem lại từng câu" })).toHaveCount(0);
    await expect(page.locator("li[data-verdict]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Tất cả|Sai|Bỏ trống) \(/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Lời giải" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Đáp án đúng/);
    await expect(page.locator("main")).toContainText(
      "Test trình độ không hiện đáp án và lời giải từng câu",
    );

    // Trình độ ước lượng và cấp bắt đầu khớp quy tắc và khớp API.
    await expect(page.getByTestId("placement-estimated")).toHaveText(expected.estimatedLabel);
    await expect(page.getByTestId("placement-start")).toHaveText(expected.startLabel);
    expect(api.placement, "API phải trả placement").toBeTruthy();
    expect(api.placement!.estimated_label).toBe(expected.estimatedLabel);
    expect(api.placement!.start_label).toBe(expected.startLabel);
    expect(api.placement!.bands.map((b) => [b.difficulty, b.correct, b.total])).toEqual(
      bands.map((b) => [b.difficulty, b.correct, b.total]),
    );

    // Lời lẽ: ước lượng sơ bộ, không có câu "Bạn đạt".
    const main = page.locator("main");
    await expect(main).toContainText("ước lượng sơ bộ");
    await expect(main).not.toContainText(/Bạn đạt/);

    // Kỹ năng nên luyện trước: danh sách hoặc câu trung tính khi rỗng.
    await expect(
      page.getByRole("heading", { level: 2, name: "Kỹ năng nên luyện trước" }),
    ).toBeVisible();
    const weakList = page.getByRole("list", { name: "Kỹ năng nên luyện trước" });
    if ((await weakList.count()) > 0) {
      expect(await weakList.getByRole("listitem").count()).toBeGreaterThan(0);
    } else {
      await expect(page.getByText("chưa có kỹ năng nào cần ưu tiên luyện thêm")).toBeVisible();
    }

    // Bản nháp đã bị xóa; nút Làm lại test và link Về Lộ trình có đủ.
    expect(await countDrafts(page)).toBe(0);
    await expect(page.getByRole("button", { name: "Làm lại test" })).toBeVisible();
    await page.getByRole("link", { name: "Về Lộ trình" }).click();
    await expect(page).toHaveURL(/\/topik-ii\/lo-trinh$/);

    // Thẻ hiện kết quả đã lưu và đổi nút thành "Làm lại Test trình độ".
    const card = page.getByTestId("placement-card-result");
    await expect(card).toBeVisible();
    await expect(card).toContainText(
      `Trình độ ước lượng: ${expected.estimatedLabel} · nên bắt đầu ở ${expected.startLabel}`,
    );
    const retry = page.getByRole("link", { name: "Làm lại Test trình độ" });
    await expect(retry).toBeVisible();
    await expect(page.getByRole("link", { name: "Làm test ngay" })).toHaveCount(0);

    // Làm lại: vào trang, có nút xem kết quả gần nhất; "Làm lại test" ở trang kết quả mở lại bài mới.
    await retry.click();
    await expect(page).toHaveURL(/\/test-trinh-do$/);
    await expect(startButton(page)).toBeEnabled();
    await page.getByRole("button", { name: "Xem kết quả lần gần nhất" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expect(page.getByTestId("placement-start")).toHaveText(expected.startLabel);
    await page.getByRole("button", { name: "Làm lại test" }).click();
    await expect(startButton(page)).toBeVisible();
  });

  test("Để trống nộp bài: Chưa đạt 3급, bắt đầu ở 3급, mọi bậc chưa vững, kỹ năng yếu dẫn tới trang luyện", async ({
    page,
  }) => {
    await startPlacement(page);
    await submitButton(page).click();
    await expect(dialog(page)).toContainText(`Còn ${TOTAL} câu bỏ trống`);
    await dialog(page).getByRole("button", { name: "Nộp bài" }).click();

    await expect(resultHeading(page)).toBeVisible();
    await expect(resultHeading(page)).toBeFocused();
    await expect(page.getByTestId("placement-estimated")).toHaveText("Chưa đạt 3급");
    await expect(page.getByTestId("placement-start")).toHaveText("3급");
    await expect(page.getByText("chưa vững bậc thấp nhất")).toBeVisible();

    const bands = await readBands(page);
    expect(bands.map((b) => b.difficulty)).toEqual(BANDS);
    for (const b of bands) {
      expect(b.passedAttr).toBe("false");
      expect(b.correct).toBe(0);
      expect(b.percentText).toBe("0%");
      expect(b.barWidth).toBe("0%");
      expect(b.statusText).toContain("Chưa vững");
    }
    await expect(page.locator("li[data-verdict]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Xem lại từng câu" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Bạn đạt/);

    // Bài trống: mọi kỹ năng đều sai nên danh sách kỹ năng yếu không rỗng; link luyện dẫn tới trang có thật.
    const weakList = page.getByRole("list", { name: "Kỹ năng nên luyện trước" });
    await expect(weakList).toBeVisible();
    expect(await weakList.getByRole("listitem").count()).toBeGreaterThan(0);
    const links = weakList.getByRole("link", { name: /^Luyện dạng này/ });
    expect(await links.count()).toBeGreaterThan(0);
    const href = await links.first().getAttribute("href");
    expect(href).toMatch(new RegExp(`^/${PROGRAM}/luyen-tap/doc/R\\d+$`));
    await links.first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/^R\d+ · /);

    // Thẻ ở Lộ trình cũng hiện "Chưa đạt 3급 · nên bắt đầu ở 3급".
    await page.goto(ROADMAP_URL);
    await expect(page.getByTestId("placement-card-result")).toContainText(
      "Trình độ ước lượng: Chưa đạt 3급 · nên bắt đầu ở 3급",
    );
  });

  test("Tải lại giữa chừng: giữ đáp án, đánh dấu và đồng hồ", async ({ page, request }) => {
    const truth = await fetchTruth(request);
    const q = (n: number) => truth.questions.find((x) => x.number === n)!;
    const wrongOf = (n: number) => (q(n).correctLabel === "①" ? "②" : "①");

    await startPlacement(page);
    await answer(page, 1, "③");
    await answer(page, 4, wrongOf(4));
    await gotoQuestion(page, 7);
    await page
      .getByRole("article", { name: "Câu 7" })
      .getByRole("button", { name: "Đánh dấu" })
      .click();
    await expect(page.getByText(`Đã làm 2/${TOTAL}`)).toBeVisible();

    await expect.poll(() => countDrafts(page)).toBe(1);
    await expect.poll(() => remainingSeconds(page), { timeout: 10_000 }).toBeLessThan(DURATION_SEC);

    await page.reload();
    await expect(timer(page)).toBeVisible();
    await expect(page.getByText("Đã khôi phục bài làm dở")).toBeVisible();
    const afterReload = await remainingSeconds(page);
    expect(afterReload, "đồng hồ không được reset về 15:00 sau khi tải lại").toBeLessThan(
      DURATION_SEC,
    );
    expect(afterReload).toBeGreaterThan(DURATION_SEC - 120);
    await expect(page.getByText(`Đã làm 2/${TOTAL}`)).toBeVisible();
    await gotoQuestion(page, 1);
    await expect(radio(page, 1, "③")).toBeChecked();
    await gotoQuestion(page, 4);
    await expect(radio(page, 4, wrongOf(4))).toBeChecked();
    await gotoQuestion(page, 7);
    await expect(
      page.getByRole("article", { name: "Câu 7" }).getByRole("button", { name: "Bỏ đánh dấu" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Sau khi "đã làm 4 phút" rồi tải lại: còn khoảng 11:00, không phải 15:00.
    await shiftDraftStart(page, 240_000);
    await page.reload();
    await expect(timer(page)).toBeVisible();
    const afterShift = await remainingSeconds(page);
    expect(afterShift).toBeLessThanOrEqual(DURATION_SEC - 240);
    expect(afterShift).toBeGreaterThan(DURATION_SEC - 240 - 120);
    await expect(page.getByText(`Đã làm 2/${TOTAL}`)).toBeVisible();

    // Quá hạn khi tải lại thì tự nộp và hiện kết quả Test trình độ.
    await shiftDraftStart(page, (DURATION_SEC + 60) * 1000);
    await page.reload();
    await expect(resultHeading(page)).toBeVisible();
    await expect(page.getByText("Bài được tự động nộp vì hết giờ")).toBeVisible();
    await expect(page.getByTestId("placement-start")).toBeVisible();
  });

  test("Nộp lỗi mạng: báo lỗi, giữ bài làm, thử lại được (cả khi server trả 500)", async ({
    page,
  }) => {
    await startPlacement(page);
    await answer(page, 1, "①");
    await answer(page, 2, "②");

    let calls = 0;
    await page.route(`**${SUBMIT_URL}`, (route) => {
      calls++;
      return route.abort("failed");
    });
    await submitViaDialog(page);
    // Có thêm role=alert của Next route announcer, nên giới hạn trong vùng trình làm đề.
    const alert = runner(page).getByRole("alert");
    await expect(alert).toContainText("Không kết nối được tới máy chủ");
    await expect(alert.getByRole("button", { name: "Thử lại nộp bài" })).toBeVisible();
    expect(calls).toBe(1);
    await expect(resultHeading(page)).toHaveCount(0);
    await expect(page.getByText(`Đã làm 2/${TOTAL}`)).toBeVisible();
    expect(await countDrafts(page), "bản nháp phải còn khi nộp lỗi").toBe(1);

    // Thử lại lần 2: server 500.
    await page.unroute(`**${SUBMIT_URL}`);
    await page.route(`**${SUBMIT_URL}`, (route) => {
      calls++;
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    await alert.getByRole("button", { name: "Thử lại nộp bài" }).click();
    await expect(alert).toContainText("Máy chủ chưa chấm được bài");
    expect(calls).toBe(2);
    await expect(resultHeading(page)).toHaveCount(0);

    // Thử lại lần 3: mạng ổn.
    await page.unroute(`**${SUBMIT_URL}`);
    const [finalRequest] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith(SUBMIT_URL) && r.method() === "POST"),
      alert.getByRole("button", { name: "Thử lại nộp bài" }).click(),
    ]);
    // Hai câu đã chọn vẫn được gửi đi sau các lần thử lại (đủ 12 khoá, đúng 2 giá trị khác null).
    const sent = finalRequest.postDataJSON() as {
      kind: string;
      answers: Record<string, string | null>;
    };
    expect(sent.kind).toBe("placement");
    expect(Object.keys(sent.answers)).toHaveLength(TOTAL);
    expect(Object.values(sent.answers).filter((v) => v !== null)).toHaveLength(2);
    await expect(resultHeading(page)).toBeVisible();
    await expect(runner(page).getByRole("alert")).toHaveCount(0);
    await expect(page.getByTestId("placement-start")).toBeVisible();
    expect(await countDrafts(page)).toBe(0);
  });

  test("Placement không lọt vào trụ Đề thi; /de-thi/placement trả 404", async ({
    page,
    request,
  }) => {
    // Danh sách Mini test: có doc-01, không có Test trình độ.
    await page.goto(MINI_LIST_URL);
    await expect(page.getByRole("link", { name: /Mini test Đọc 01/ })).toBeVisible();
    for (const text of ["Test trình độ", "placement"]) {
      await expect(page.locator("main")).not.toContainText(text);
    }
    expect(await page.locator('main a[href*="placement"]').count()).toBe(0);

    // Trang tổng của trụ Đề thi và mọi loại đề khác cũng không dẫn tới placement.
    const urls = [
      `/${PROGRAM}/de-thi`,
      ...["mini", "full", "hard", "ibt"].map((k) => `/${PROGRAM}/de-thi/${k}`),
    ];
    for (const url of urls) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      const html = await response.text();
      expect(html, `${url} không được nhắc placement-01`).not.toContain(EXAM_ID);
      expect(html, `${url} không được link tới /de-thi/placement`).not.toContain(
        "de-thi/placement",
      );
    }

    // Không có route /de-thi/placement (và đề con, và đề placement mở qua loại đề khác).
    const hidden = [
      `/${PROGRAM}/de-thi/placement`,
      `/${PROGRAM}/de-thi/placement/${EXAM_ID}`,
      `/${PROGRAM}/de-thi/mini/${EXAM_ID}`,
    ];
    // Lưu ý (lỗi sản phẩm minor, đã báo): lần GET ĐẦU TIÊN (cache lạnh) tới đường dẫn lạ có thể trả
    // mã 200 kèm giao diện 404 (soft 404); từ lần thứ hai mới đúng 404. Khởi động nguội một lần
    // rồi kiểm mã trạng thái để test không phụ thuộc thứ tự chạy của các worker.
    for (const url of hidden) await request.get(url);
    for (const url of hidden) {
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: "Không tìm thấy trang" }),
        url,
      ).toBeVisible();
    }
  });

  test("Mini test vẫn còn phần Xem lại từng câu (khác Test trình độ)", async ({ page }) => {
    await page.goto(`/${PROGRAM}/de-thi/mini/doc-01`);
    await expect(startButton(page)).toBeEnabled();
    await startButton(page).click();
    await expect(timer(page)).toBeVisible();
    await submitViaDialog(page);
    await expect(page.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Xem lại từng câu" })).toBeVisible();
    await expect(page.locator("li[data-verdict]")).toHaveCount(20);
    await expect(page.locator("main")).not.toContainText(
      "Test trình độ không hiện đáp án và lời giải từng câu",
    );
  });

  test("Không lộ đáp án/lời giải trong payload của trang làm bài", async ({ page, request }) => {
    const truth = await fetchTruth(request);
    const bodies: string[] = [];
    const scripts: string[] = [];
    page.on("response", async (response) => {
      const type = response.request().resourceType();
      if (type === "document" || type === "fetch" || type === "xhr") {
        bodies.push(await response.text().catch(() => ""));
      } else if (type === "script") {
        scripts.push(await response.text().catch(() => ""));
      }
    });

    await page.goto(ROADMAP_URL);
    await startPlacement(page);
    for (let n = 1; n <= TOTAL; n++) await gotoQuestion(page, n);

    const html = await (await request.get(PLACEMENT_URL)).text();
    const rsc = await (await request.get(PLACEMENT_URL, { headers: { RSC: "1" } })).text();
    const everything = [...bodies, html, rsc, await page.content()].join("\n");

    const forbiddenKeys =
      /correctLabel|correct_label|is_correct|explanation_vi|note_vi|trap_name_vi|transcript_vi|\\?"correct\\?"\s*:/;
    expect(everything, "payload phải chứa dữ liệu đề (kiểm tra có quét đúng)").toContain(
      "Test trình độ",
    );
    const hit = forbiddenKeys.exec(everything);
    expect(
      hit ? everything.slice(Math.max(0, hit.index - 80), hit.index + 120) : null,
      "payload dữ liệu chứa trường đáp án/lời giải",
    ).toBeNull();
    for (const q of truth.questions) {
      const probe = q.explanation_vi.replace(/\s+/g, " ").trim().slice(0, 40);
      expect(probe.length).toBeGreaterThan(10);
      expect(everything, `lời giải câu ${q.number} bị lộ trong payload`).not.toContain(probe);
      expect(scripts.join(" "), `lời giải câu ${q.number} bị lộ trong JS`).not.toContain(probe);
    }
    await expect(runner(page).getByText(/Lời giải|Đáp án đúng/)).toHaveCount(0);
  });

  test("Bàn phím và ARIA trong trình làm Test trình độ", async ({ page }) => {
    await startPlacement(page);
    await expect(runner(page)).toBeVisible();
    await expect(timer(page)).toContainText("Thời gian còn lại");
    await expect(page.getByLabel(`Đã làm 0 trên ${TOTAL} câu`)).toBeVisible();
    await expect(choicesOf(page, 1).getByRole("radio")).toHaveCount(4);

    await radio(page, 1, "①").focus();
    await page.keyboard.press("ArrowRight");
    await expect(radio(page, 1, "②")).toBeChecked();
    await page.keyboard.press("4");
    await expect(radio(page, 1, "④")).toBeChecked();

    const opener = submitButton(page);
    await opener.focus();
    await page.keyboard.press("Enter");
    const confirm = dialog(page);
    await expect(confirm).toBeVisible();
    await expect(confirm).toHaveAttribute("aria-modal", "true");
    await expect(confirm.getByRole("button", { name: "Quay lại làm bài" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("API nộp bài kind placement: trả placement, từ chối đề/loại sai", async ({ request }) => {
    const truth = await fetchTruth(request);
    expect(truth.kind).toBe("placement");
    const blank = truth.placement!;
    expect(blank.estimated_level).toBeNull();
    expect(blank.estimated_label).toBe("Chưa đạt 3급");
    expect(blank.start_level).toBe(3);
    expect(blank.start_label).toBe("3급");
    expect(blank.bands.map((b) => b.difficulty)).toEqual(BANDS);
    expect(blank.bands.every((b) => !b.passed && b.correct === 0)).toBe(true);
    expect(blank.bands.reduce((s, b) => s + b.total, 0)).toBe(TOTAL);

    // Bài đúng hết: 6급 vững, cấp bắt đầu 6급, mọi bậc vững.
    const all: Record<string, string | null> = {};
    for (const q of truth.questions) all[q.questionId] = q.correctLabel;
    const perfectRes = await request.post(SUBMIT_URL, { data: placementRequest(all) });
    expect(perfectRes.status()).toBe(200);
    expect(perfectRes.headers()["cache-control"]).toContain("no-store");
    const perfect = ((await perfectRes.json()) as PlacementApiResult).placement!;
    expect(perfect.estimated_level).toBe(6);
    expect(perfect.estimated_label).toBe("6급");
    expect(perfect.start_label).toBe("6급");
    expect(perfect.bands.every((b) => b.passed && b.correct === b.total)).toBe(true);
    expect(perfect.weak_subskills).toEqual([]);

    // Loại đề và id không khớp.
    const wrongKind = await request.post(SUBMIT_URL, {
      data: { program: PROGRAM, kind: "mini", examId: EXAM_ID, answers: {} },
    });
    expect(wrongKind.status()).toBe(404);
    const wrongId = await request.post(SUBMIT_URL, {
      data: { program: PROGRAM, kind: "placement", examId: "doc-01", answers: {} },
    });
    expect(wrongId.status()).toBe(404);
    const badChoice = await request.post(SUBMIT_URL, {
      data: placementRequest({ [truth.questions[0].questionId]: "⑤" }),
    });
    expect(badChoice.status()).toBe(400);
  });

  test("Không tràn ngang: thẻ Lộ trình, màn giới thiệu, làm bài, hộp nộp bài và kết quả", async ({
    page,
  }, testInfo) => {
    const viewport = page.viewportSize()!;
    expect(viewport.width).toBe(testInfo.project.name === "mobile" ? 375 : 1280);

    await page.goto(ROADMAP_URL);
    await expect(page.getByRole("link", { name: "Làm test ngay" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "trang Lộ trình");

    await page.goto(PLACEMENT_URL);
    await expect(startButton(page)).toBeEnabled();
    await expectNoHorizontalOverflow(page, "màn giới thiệu");
    await startButton(page).click();
    await expect(timer(page)).toBeVisible();
    await expectNoHorizontalOverflow(page, "màn làm bài");
    await expect(timer(page)).toBeInViewport();
    await expect(submitButton(page)).toBeInViewport();
    await expect(runner(page).locator('label [lang="ko"]').first()).toHaveCSS(
      "word-break",
      "keep-all",
    );
    await page.getByRole("button", { name: "Bảng câu hỏi" }).click();
    await expectNoHorizontalOverflow(page, "bảng số câu");

    await submitButton(page).click();
    await expect(dialog(page)).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page, "hộp xác nhận");
    await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expectNoHorizontalOverflow(page, "trang kết quả (bài trống)");

    // Dòng trong bảng bậc không bị cắt ngoài khung nhìn: ô "Kết quả" cuối phải cuộn tới được.
    const lastCell = bandTable(page).locator("tbody tr").first().getByRole("cell").last();
    await lastCell.scrollIntoViewIfNeeded();
    await expect(lastCell).toBeVisible();
    await expect(page.locator("main")).toContainText(
      "Test trình độ không hiện đáp án và lời giải từng câu",
    );
    await expectNoHorizontalOverflow(page, "kết quả, đoạn giải thích không có phần xem lại");

    await page.goto(ROADMAP_URL);
    await expect(page.getByTestId("placement-card-result")).toBeVisible();
    await expectNoHorizontalOverflow(page, "trang Lộ trình có kết quả");
  });
});
