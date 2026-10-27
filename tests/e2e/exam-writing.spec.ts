import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

/**
 * E2E Mini test Viết (viet-01: W51, W52, W53, W54 = số câu 51~54, 50 phút) ở chế độ khách:
 * danh sách -> giới thiệu -> làm bài (ô điền ㉠ ㉡, ô viết có bộ đếm, nháp IndexedDB "topikly-exam")
 * -> hộp xác nhận nộp -> kết quả "Chưa tự chấm" -> người học tự chấm -> điểm /100 + cấp ước lượng
 * -> bài mẫu để tự so sánh -> mở lại kết quả lần gần nhất vẫn còn điểm tự chấm. Phần Viết KHÔNG chấm
 * tự động (MVP) nên mọi điểm trong test là điểm do test nhập vào.
 *
 * Không hard-code nội dung đề: số điểm tối đa từng câu, ngưỡng cấp và thang điểm lấy một lần từ
 * POST /api/exam/submit với bài trống (server trả `writing.items[].max_points`, `level_basis`).
 * Khung ký tự của W53/W54 đọc từ bộ đếm trên trang. Mỗi test dùng browser context mới nên
 * IndexedDB luôn sạch.
 */

const PROGRAM = "topik-ii";
const EXAM_ID = "viet-01";
const LIST_URL = `/${PROGRAM}/de-thi/mini`;
const EXAM_URL = `/${PROGRAM}/de-thi/mini/${EXAM_ID}`;
const SUBMIT_URL = "/api/exam/submit";
const TOTAL = 4;
const NUMBERS = [51, 52, 53, 54] as const;
const DURATION_SEC = 3000;
const TITLE = "Mini test Viết 01";

// ------------------------------------------------------------------ sự thật từ server

interface Threshold {
  level: number;
  label: string;
  min_score: number;
}
interface TruthItem {
  id: string;
  type_code: string;
  format: "essay" | "fill_blanks";
  max_points: number;
  prompt: {
    id: string;
    stem: string;
    passage?: string;
    task?: string;
    char_limit?: { min: number; max: number };
  };
  reveal: {
    model_answers?: { text: string }[];
    blanks?: { label: string; accepted_answers: string[]; partial_answers: string[] }[];
    explanation_vi?: string;
    scoring_notes_vi?: string;
  };
}
interface Truth {
  items: TruthItem[];
  maxScore: number;
  maxPointsTotal: number;
  thresholds: Threshold[];
  totalMaxScore: number;
  /** Điểm /maxScore từ điểm từng câu (làm tròn như công thức trong lib/exam/writing-self-score.ts). */
  scoreOf: (points: number) => number;
  /** Cấp (nhãn) ứng với điểm Viết /maxScore, chiếu lên thang tổng. */
  levelOf: (score: number) => { compared: number; label: string };
}

async function fetchTruth(request: APIRequestContext): Promise<Truth> {
  const response = await request.post(SUBMIT_URL, {
    data: { program: PROGRAM, kind: "mini", examId: EXAM_ID, answers: {} },
  });
  expect(response.status(), "API nộp bài phải chấm được đề mẫu viet-01").toBe(200);
  const body = await response.json();
  const writing = body.writing;
  expect(writing.items).toHaveLength(TOTAL);
  const thresholds: Threshold[] = [...writing.level_basis.thresholds].sort(
    (a: Threshold, b: Threshold) => a.min_score - b.min_score,
  );
  const maxScore: number = writing.max_score;
  const maxPointsTotal: number = writing.max_points_total;
  const totalMaxScore: number = writing.level_basis.total_max_score;
  return {
    items: writing.items,
    maxScore,
    maxPointsTotal,
    thresholds,
    totalMaxScore,
    scoreOf: (points) => Math.round((points / maxPointsTotal) * maxScore),
    levelOf: (score) => {
      const compared = Math.round((score / maxScore) * totalMaxScore);
      let label = "Chưa đạt cấp";
      for (const t of thresholds) if (compared >= t.min_score) label = t.label;
      return { compared, label };
    },
  };
}

// ------------------------------------------------------------------ helper giao diện

const runner = (page: Page) => page.getByRole("region", { name: "Trình làm đề thi" });
const timer = (page: Page) => page.getByRole("timer");
const startButton = (page: Page) => page.getByRole("button", { name: "Bắt đầu làm bài" });
/** Nút "Nộp bài" trên thanh dính (nút ở cuối trang chỉ có khi ở khối cuối). */
const submitButton = (page: Page) => page.getByRole("button", { name: "Nộp bài" }).first();
const dialog = (page: Page) => page.getByRole("dialog", { name: "Nộp bài?" });
const resultHeading = (page: Page) =>
  page.getByRole("heading", { level: 2, name: "Kết quả bài làm" });
const writingSummary = (page: Page) => page.getByTestId("writing-summary");
const blockHeading = (page: Page, n: number) =>
  page.getByRole("heading", { level: 2, name: `Câu ${n}`, exact: true });
const essayBox = (page: Page) => page.getByRole("textbox", { name: "Bài viết của bạn" });
const blankBox = (page: Page, label: "㉠" | "㉡") =>
  page.getByRole("textbox", { name: `Ô điền ${label}` });
const counter = (page: Page) => page.locator("[data-status]");
const progress = (page: Page, done: number) => page.getByText(`Đã làm ${done}/${TOTAL}`);

/** Đoạn tiếng Hàn đúng n ký tự (mỗi "가" = 1 ký tự). */
const korean = (n: number) => "가".repeat(n);

/** Đếm ký tự độc lập với app, theo content-spec 5.7: bỏ xuống dòng, đếm theo code point. */
function countIndependently(text: string): number {
  return Array.from(text.normalize("NFC").replace(/[\r\n]/g, "")).length;
}

const ANSWER_51 = ["저희 집 주소가 아니었습니다", "101동 503호로 찾으러 오시기 바랍니다"] as const;
const ANSWER_52 = ["잠을 자면 집중력이 높아진다", "낮잠을 자는 것이 도움이 된다"] as const;

/** Giây còn lại đọc từ đồng hồ "mm:ss". */
async function remainingSeconds(page: Page): Promise<number> {
  const text = (await timer(page).textContent()) ?? "";
  const match = /(\d{2}):(\d{2})/.exec(text);
  expect(match, `đồng hồ phải có dạng mm:ss, nhận được "${text}"`).not.toBeNull();
  return Number(match![1]) * 60 + Number(match![2]);
}

async function startExam(page: Page) {
  await page.goto(EXAM_URL);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await startButton(page).click(); // tự chờ hết trạng thái disabled "Đang kiểm tra bài làm dở…"
  await expect(timer(page)).toBeVisible();
  await expect(blockHeading(page, 51)).toBeVisible();
}

async function ensureNavOpen(page: Page) {
  const toggle = page.getByRole("button", { name: "Bảng câu hỏi" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

/** Mở bảng số câu (nếu đang đóng) rồi nhảy tới câu n (51~54). */
async function gotoQuestion(page: Page, n: number) {
  await ensureNavOpen(page);
  await page
    .getByRole("navigation", { name: "Bảng số câu" })
    .getByRole("button", { name: new RegExp(`^Câu ${n}\\b`) })
    .click();
  await expect(blockHeading(page, n)).toBeFocused();
}

async function nextQuestion(page: Page, toNumber: number) {
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  await expect(blockHeading(page, toNumber)).toBeFocused();
}

async function fillBlanks(page: Page, values: readonly [string, string]) {
  await blankBox(page, "㉠").fill(values[0]);
  await blankBox(page, "㉡").fill(values[1]);
}

/** Đọc khung ký tự "Khung: a–b ký tự" của câu đang xem. */
async function readLimit(page: Page): Promise<{ min: number; max: number }> {
  const text = (await counter(page).textContent()) ?? "";
  const match = /Khung: (\d+)–(\d+) ký tự/.exec(text);
  expect(match, `bộ đếm phải nêu khung ký tự, nhận được "${text}"`).not.toBeNull();
  return { min: Number(match![1]), max: Number(match![2]) };
}

/** Làm đủ 4 câu (đủ ký tự cho W53/W54) rồi dừng ở câu 54. Trả về bài đã gõ. */
async function fillAll(page: Page) {
  await fillBlanks(page, ANSWER_51);
  await nextQuestion(page, 52);
  await fillBlanks(page, ANSWER_52);
  await nextQuestion(page, 53);
  const l53 = await readLimit(page);
  const essay53 = korean(l53.min);
  await essayBox(page).fill(essay53);
  await expect(counter(page)).toHaveAttribute("data-status", "within");
  await nextQuestion(page, 54);
  const l54 = await readLimit(page);
  const essay54 = korean(l54.min);
  await essayBox(page).fill(essay54);
  await expect(counter(page)).toHaveAttribute("data-status", "within");
  await expect(progress(page, TOTAL)).toBeVisible();
  return { essay53, essay54 };
}

async function submitViaDialog(page: Page) {
  await submitButton(page).click();
  await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
  await expect(resultHeading(page)).toBeVisible();
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

/** Dịch lùi `startedAt` của mọi bản nháp (mô phỏng "đã làm được N ms" mà không phải chờ thật). */
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

/** Đọc một object store của DB "topikly-exam" (mảng rỗng nếu chưa có). */
async function readStore(page: Page, store: "drafts" | "results"): Promise<unknown[]> {
  return page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve) => {
        const open = indexedDB.open("topikly-exam");
        open.onerror = () => resolve([]);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(name)) {
            db.close();
            resolve([]);
            return;
          }
          const req = db.transaction(name).objectStore(name).getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => {
            db.close();
            resolve([]);
          };
        };
      }),
    store,
  );
}

const countDrafts = async (page: Page) => (await readStore(page, "drafts")).length;

interface DraftRow {
  writing?: Record<string, { text?: string; blanks?: Record<string, string> }>;
}
async function draftWriting(page: Page): Promise<DraftRow["writing"]> {
  const [draft] = (await readStore(page, "drafts")) as DraftRow[];
  return draft?.writing;
}

/** Điểm tự chấm đã ghi vào kết quả gần nhất trong IndexedDB. */
async function storedSelfPoints(page: Page): Promise<Record<string, number | null> | undefined> {
  const rows = (await readStore(page, "results")) as {
    selfPoints?: Record<string, number | null>;
    submittedAt: number;
  }[];
  if (rows.length === 0) return undefined;
  rows.sort((a, b) => b.submittedAt - a.submittedAt);
  return rows[0].selfPoints ?? {};
}

// ---- thẻ tự chấm ở trang kết quả

const reviewCard = (page: Page, n: number): Locator =>
  page.getByRole("listitem").filter({
    has: page.getByRole("heading", { level: 3, name: new RegExp(`^Câu ${n} · W${n}$`) }),
  });
const selfScoreInput = (card: Locator) => card.getByLabel("Tự chấm (ước lượng)");
const compareButton = (card: Locator) =>
  card.getByRole("button", { name: /Xem bài mẫu & tự so sánh|Ẩn bài mẫu/ });

async function enterSelfPoints(page: Page, points: readonly number[]) {
  for (const [index, n] of NUMBERS.entries()) {
    await selfScoreInput(reviewCard(page, n)).fill(String(points[index]));
  }
}

// ------------------------------------------------------------------ test

test.describe("Mini test Viết — chế độ khách", () => {
  test("Danh sách: thẻ viet-01 nêu Viết · 4 câu · 50 phút và ghi chú tự chấm; vào giới thiệu rồi Bắt đầu", async ({
    page,
  }) => {
    await page.goto(LIST_URL);
    const card = page.getByRole("link", { name: /Mini test Viết 01/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Viết");
    await expect(card).toContainText(`${TOTAL} câu`);
    await expect(card).toContainText("50 phút");
    await expect(card).toContainText("Phần Viết tự chấm bằng bài mẫu, chưa chấm AI");
    await expect(card).toContainText("Chưa làm");
    await expect(card).not.toContainText("0/0");

    await card.click();
    await expect(page).toHaveURL(/\/topik-ii\/de-thi\/mini\/viet-01$/);
    await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();

    const intro = page.getByRole("region", { name: "Trước khi bắt đầu" });
    await expect(intro).toContainText(`${TOTAL} câu · 50 phút`);
    await expect(intro).toContainText("Thời gian làm bài là 50 phút");
    await expect(intro).toContainText("Số ký tự tính cả khoảng trắng");
    await expect(intro.getByTestId("writing-self-score-note")).toContainText("chưa chấm AI");
    // Đề chỉ Viết: không có luật câu trắc nghiệm/audio.
    await expect(intro).not.toContainText("Mỗi câu chỉ có một đáp án đúng");
    await expect(intro).not.toContainText("Mỗi bài nghe chỉ phát một lần");
    await expect(timer(page)).toHaveCount(0); // đồng hồ chưa chạy khi chưa bấm Bắt đầu

    await startButton(page).click();
    await expect(timer(page)).toBeVisible();
    expect(await remainingSeconds(page)).toBeGreaterThan(DURATION_SEC - 30);
    await expect(progress(page, 0)).toBeVisible();
  });

  test("Làm bài: câu 51~54, W51/W52 hai ô ㉠ ㉡, W53/W54 ô lớn có bộ đếm dưới/đạt/vượt khung", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    expect(truth.items.map((i) => i.type_code)).toEqual(["W51", "W52", "W53", "W54"]);
    await startExam(page);

    // Bảng số câu: đúng 4 nút mang số 51~54.
    await ensureNavOpen(page);
    const nav = page.getByRole("navigation", { name: "Bảng số câu" });
    await expect(nav.getByRole("button")).toHaveCount(TOTAL);
    for (const n of NUMBERS) {
      await expect(nav.getByRole("button", { name: new RegExp(`^Câu ${n}\\b`) })).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: "Câu 51, chưa làm" })).toBeVisible();

    // Câu 51: hai ô điền, không có ô viết lớn / bộ đếm; lệnh đề và đoạn văn tiếng Hàn.
    await expect(blockHeading(page, 51)).toBeVisible();
    await expect(runner(page).locator('p[lang="ko"]').first()).toContainText(/[가-힣]/);
    await expect(runner(page)).toContainText("㉠");
    await expect(blankBox(page, "㉠")).toBeVisible();
    await expect(blankBox(page, "㉡")).toBeVisible();
    await expect(essayBox(page)).toHaveCount(0);
    await expect(counter(page)).toHaveCount(0);
    // Nút lùi bị khóa ở câu đầu; nhãn theo loại khối hiện tại ("Câu trước" cho câu Viết).
    await expect(page.getByRole("button", { name: "Câu trước" })).toBeDisabled();

    // Điền một phần: vẫn là "đã làm" (có nội dung), nav cập nhật.
    await blankBox(page, "㉠").fill(ANSWER_51[0]);
    await expect(progress(page, 1)).toBeVisible();
    await ensureNavOpen(page);
    // Ô đang gõ -> câu 51 là câu "đang xem".
    await expect(nav.getByRole("button", { name: /^Câu 51, đã làm, đang xem/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await blankBox(page, "㉡").fill(ANSWER_51[1]);
    await expect(progress(page, 1)).toBeVisible();

    // Câu 52: cũng là hai ô điền; không rò giá trị từ câu 51.
    await nextQuestion(page, 52);
    await expect(blankBox(page, "㉠")).toHaveValue("");
    await expect(blankBox(page, "㉡")).toHaveValue("");
    await fillBlanks(page, ANSWER_52);
    await expect(progress(page, 2)).toBeVisible();

    // Câu 53: ô lớn + bộ đếm; biên dưới/đạt/vượt khung theo khung đọc từ trang.
    await nextQuestion(page, 53);
    await expect(blankBox(page, "㉠")).toHaveCount(0);
    await expect(essayBox(page)).toBeVisible();
    await expect(essayBox(page)).toHaveAttribute("lang", "ko");
    const l53 = await readLimit(page);
    expect(l53.min).toBeLessThan(l53.max);
    await expect(counter(page)).toHaveAttribute("data-status", "below");
    await expect(counter(page)).toContainText("0 ký tự");
    await expect(counter(page)).toContainText(`Chưa đủ, cần ít nhất ${l53.min} ký tự`);
    await essayBox(page).fill(korean(l53.min - 1));
    await expect(counter(page)).toContainText(`${l53.min - 1} ký tự`);
    await expect(counter(page)).toHaveAttribute("data-status", "below");
    await essayBox(page).fill(korean(l53.min));
    await expect(counter(page)).toHaveAttribute("data-status", "within");
    await expect(counter(page)).toContainText("Trong khung ký tự");
    await essayBox(page).fill(korean(l53.max));
    await expect(counter(page)).toHaveAttribute("data-status", "within");
    await essayBox(page).fill(korean(l53.max + 1));
    await expect(counter(page)).toHaveAttribute("data-status", "above");
    await expect(counter(page)).toContainText(`Vượt quá ${l53.max} ký tự`);
    // Xuống dòng không tính; khoảng trắng giữa chữ tính.
    const mixed = "가나다\n라 마";
    await essayBox(page).fill(mixed);
    await expect(counter(page)).toContainText(`${countIndependently(mixed)} ký tự`);
    await essayBox(page).fill(korean(l53.min));
    await expect(progress(page, 3)).toBeVisible();

    // Câu 54: khung riêng của câu 54, bộ đếm bắt đầu lại từ 0.
    await nextQuestion(page, 54);
    await expect(counter(page)).toContainText("0 ký tự");
    const l54 = await readLimit(page);
    expect(l54.min).toBeGreaterThan(l53.max - 1);
    await essayBox(page).fill(korean(l54.min));
    await expect(counter(page)).toHaveAttribute("data-status", "within");
    await expect(progress(page, TOTAL)).toBeVisible();
    // Khối cuối: không có "Câu sau", có "Nộp bài" ở cuối trang.
    await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nộp bài" })).toHaveCount(2);

    // Quay về câu 53 bằng "Câu trước": nội dung còn nguyên.
    await page.getByRole("button", { name: "Câu trước", exact: true }).click();
    await expect(blockHeading(page, 53)).toBeFocused();
    await expect(essayBox(page)).toHaveValue(korean(l53.min));

    // Đánh dấu câu: nút bật/tắt và hiện trong bảng số câu.
    const mark = page.getByRole("button", { name: "Đánh dấu", exact: true });
    await expect(mark).toHaveAttribute("aria-pressed", "false");
    await mark.click();
    await expect(page.getByRole("button", { name: "Bỏ đánh dấu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await ensureNavOpen(page);
    await expect(nav.getByRole("button", { name: /^Câu 53, đã làm, đã đánh dấu/ })).toBeVisible();
  });

  test("Nháp: gõ xong tải lại được khôi phục (nội dung, câu đang xem, đồng hồ không reset)", async ({
    page,
  }) => {
    await startExam(page);
    await fillBlanks(page, ANSWER_51);
    await nextQuestion(page, 52);
    await blankBox(page, "㉠").fill(ANSWER_52[0]); // câu 52 chỉ điền một phần
    await nextQuestion(page, 53);
    const limit = await readLimit(page);
    const essay = `${korean(limit.min)} 서울\n마지막 줄`;
    await essayBox(page).fill(essay);
    await expect(progress(page, 3)).toBeVisible();

    // Nháp Viết ghi sau một khoảng gộp lần gõ; chờ nó vào IndexedDB.
    await expect
      .poll(async () => (await draftWriting(page)) !== undefined && (await countDrafts(page)))
      .toBe(1);
    await expect
      .poll(async () => JSON.stringify(await draftWriting(page)), { timeout: 10_000 })
      .toContain("마지막 줄");
    await expect.poll(() => remainingSeconds(page), { timeout: 10_000 }).toBeLessThan(DURATION_SEC);

    await page.reload();
    await expect(timer(page)).toBeVisible();
    await expect(page.getByText("Đã khôi phục bài làm dở")).toBeVisible();
    await expect(progress(page, 3)).toBeVisible();
    const afterReload = await remainingSeconds(page);
    expect(afterReload, "đồng hồ không được reset về 50:00").toBeLessThan(DURATION_SEC);
    expect(afterReload).toBeGreaterThan(DURATION_SEC - 120);

    // Trở về đúng câu đang xem (53) với nội dung nguyên văn, kể cả xuống dòng.
    await expect(blockHeading(page, 53)).toBeVisible();
    await expect(essayBox(page)).toHaveValue(essay);
    await expect(counter(page)).toContainText(`${countIndependently(essay)} ký tự`);
    await gotoQuestion(page, 51);
    await expect(blankBox(page, "㉠")).toHaveValue(ANSWER_51[0]);
    await expect(blankBox(page, "㉡")).toHaveValue(ANSWER_51[1]);
    await gotoQuestion(page, 52);
    await expect(blankBox(page, "㉠")).toHaveValue(ANSWER_52[0]);
    await expect(blankBox(page, "㉡")).toHaveValue("");

    // Tải lại lần 2 sau khi "đã làm 10 phút": đồng hồ khoảng 40:00.
    await expect.poll(() => countDrafts(page)).toBe(1);
    await shiftDraftStart(page, 600_000);
    await page.reload();
    await expect(timer(page)).toBeVisible();
    const afterShift = await remainingSeconds(page);
    expect(afterShift).toBeLessThanOrEqual(DURATION_SEC - 600);
    expect(afterShift).toBeGreaterThan(DURATION_SEC - 600 - 120);

    // Danh sách báo "Đang làm dở".
    await page.goto(LIST_URL);
    await expect(page.getByRole("link", { name: /Mini test Viết 01/ })).toContainText(
      "Đang làm dở",
    );
  });

  test("Tải lại ngay sau khi gõ (chưa hết thời gian gộp lần gõ) vẫn không mất bài", async ({
    page,
  }) => {
    await startExam(page);
    await blankBox(page, "㉠").fill(ANSWER_51[0]);
    await nextQuestion(page, 52);
    await nextQuestion(page, 53);
    // Chờ nháp có vị trí câu 53 (ghi ngay khi đổi câu) để chỉ còn lại chữ vừa gõ là chưa ghi.
    await expect.poll(async () => (await readStore(page, "drafts")).length).toBe(1);
    await page.waitForTimeout(800);
    const text = `${korean(30)} 마지막`;
    await essayBox(page).fill(text);
    // Không chờ ghi nháp: ghi phải được flush khi rời trang (pagehide / unmount).
    await page.reload();
    await expect(timer(page)).toBeVisible();
    await expect(page.getByText("Đã khôi phục bài làm dở")).toBeVisible();
    await expect(essayBox(page)).toHaveValue(text);
    await gotoQuestion(page, 51);
    await expect(blankBox(page, "㉠")).toHaveValue(ANSWER_51[0]);
  });

  test("Hộp xác nhận nộp đếm câu bỏ trống và câu điền một phần; Quay lại giữ nguyên bài", async ({
    page,
  }) => {
    await startExam(page);
    // 51: điền một phần (chỉ ㉠). 52: bỏ trống. 53: có chữ. 54: bỏ trống.
    await blankBox(page, "㉠").fill(ANSWER_51[0]);
    await gotoQuestion(page, 53);
    await essayBox(page).fill(korean(10));
    await page.getByRole("button", { name: "Đánh dấu", exact: true }).click();
    await expect(progress(page, 2)).toBeVisible();

    await submitButton(page).click();
    const confirm = dialog(page);
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("Còn 2 câu bỏ trống, sẽ không được tính điểm");
    await expect(confirm).toContainText("1 câu điền chỗ trống mới điền một phần");
    await expect(confirm).toContainText("đánh dấu 1 câu");
    await expect(confirm).not.toContainText("sẽ tính là sai");
    await confirm.getByRole("button", { name: "Quay lại làm bài" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(resultHeading(page)).toHaveCount(0);
    await expect(essayBox(page)).toHaveValue(korean(10));

    // Điền nốt ㉡ của câu 51 -> hết cảnh báo "một phần"; câu 51 đã đủ, vẫn còn 2 câu trống.
    await gotoQuestion(page, 51);
    await blankBox(page, "㉡").fill(ANSWER_51[1]);
    await submitButton(page).click();
    await expect(dialog(page)).toContainText("Còn 2 câu bỏ trống");
    await expect(dialog(page)).not.toContainText("mới điền một phần");
    await dialog(page).getByRole("button", { name: "Quay lại làm bài" }).click();

    // Làm đủ -> hộp xác nhận báo đã làm tất cả.
    await gotoQuestion(page, 52);
    await fillBlanks(page, ANSWER_52);
    await gotoQuestion(page, 54);
    await essayBox(page).fill(korean(5));
    await submitButton(page).click();
    await expect(dialog(page)).toContainText("Bạn đã làm tất cả các câu");
    await expect(dialog(page)).not.toContainText("bỏ trống");
  });

  test("Nộp bài: request có writing đúng hình dạng; kết quả 'Chưa tự chấm', không có bảng đúng/sai rỗng", async ({
    page,
  }) => {
    await startExam(page);
    const { essay53, essay54 } = await fillAll(page);
    await submitButton(page).click();

    const [apiRequest] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith(SUBMIT_URL) && r.method() === "POST"),
      dialog(page).getByRole("button", { name: "Nộp bài" }).click(),
    ]);
    const sent = apiRequest.postDataJSON() as {
      answers: Record<string, string | null>;
      writing: Record<string, { text?: string; blanks?: Record<string, string> }>;
      timedOut: boolean;
      examId: string;
    };
    expect(sent.examId).toBe(EXAM_ID);
    expect(sent.timedOut).toBe(false);
    expect(sent.answers).toEqual({}); // đề chỉ Viết: không có câu trắc nghiệm
    expect(Object.keys(sent.writing)).toHaveLength(TOTAL);
    expect(sent.writing["w51-0001"]).toEqual({
      blanks: { "㉠": ANSWER_51[0], "㉡": ANSWER_51[1] },
    });
    expect(sent.writing["w52-0001"]).toEqual({
      blanks: { "㉠": ANSWER_52[0], "㉡": ANSWER_52[1] },
    });
    expect(sent.writing["w53-0002"]).toEqual({ text: essay53 });
    expect(sent.writing["w54-0002"]).toEqual({ text: essay54 });

    await expect(resultHeading(page)).toBeVisible();
    await expect(resultHeading(page)).toBeFocused();

    // Chưa tự chấm: không in điểm, không in cấp.
    const summary = writingSummary(page);
    await expect(summary).toContainText("Điểm Viết (tự chấm)");
    await expect(summary).toContainText("Chưa tự chấm");
    await expect(summary).toContainText("chưa chấm AI");
    await expect(summary).toContainText("Thời gian làm bài: ");
    await expect(summary).not.toContainText("Chưa đạt cấp");
    await expect(summary).not.toContainText("Cấp (ước lượng)");
    await expect(summary).not.toContainText(/\d+\/100/);
    await expect(page.getByText("Kết quả được lưu tạm trên thiết bị này")).toBeVisible();

    // Đề chỉ Viết: không có bảng theo phần / nhóm dạng / kỹ năng con (sẽ rỗng) và không có "0/0".
    await expect(page.getByRole("table", { name: "Kết quả theo phần" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Kết quả theo phần" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Theo nhóm dạng câu" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Theo kỹ năng con" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Xem lại từng câu" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("0/0");
    await expect(page.locator("main")).not.toContainText("NaN");

    // Bốn thẻ Viết, đúng thứ tự 51~54, đều chưa tự chấm; bài đã nộp hiện nguyên văn.
    await expect(
      page.getByRole("heading", { level: 2, name: "Bài Viết: so sánh và tự chấm" }),
    ).toBeVisible();
    for (const n of NUMBERS) {
      const card = reviewCard(page, n);
      await expect(card).toHaveCount(1);
      await expect(card).toContainText("Chưa tự chấm");
      await expect(selfScoreInput(card)).toHaveValue("");
    }
    await expect(reviewCard(page, 51)).toContainText(ANSWER_51[0]);
    await expect(reviewCard(page, 51)).toContainText(ANSWER_51[1]);
    await expect(reviewCard(page, 52)).toContainText(ANSWER_52[1]);
    await expect(reviewCard(page, 53)).toContainText(`${countIndependently(essay53)} ký tự`);
    await expect(reviewCard(page, 54)).toContainText(essay54.slice(0, 20));

    // Bản nháp đã bị xóa sau khi nộp.
    await expect.poll(() => countDrafts(page)).toBe(0);
  });

  test("Bỏ trống toàn bộ vẫn nộp được: 4 câu 'Bạn chưa điền/viết gì', chấm tay được 0 điểm", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    await startExam(page);
    await submitButton(page).click();
    await expect(dialog(page)).toContainText(`Còn ${TOTAL} câu bỏ trống`);
    await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expect(writingSummary(page)).toContainText("Chưa tự chấm");
    await expect(reviewCard(page, 51)).toContainText("Bạn chưa điền");
    await expect(reviewCard(page, 53)).toContainText("Bạn chưa viết gì");

    // Nhập 0 điểm cho một câu: đó là "đã chấm" (khác với để trống).
    await selfScoreInput(reviewCard(page, 51)).fill("0");
    await expect(writingSummary(page)).toContainText(`Đã tự chấm 1/${TOTAL} câu`);
    await expect(writingSummary(page)).toContainText(`0/${truth.maxScore}`);
  });

  test("Tự chấm: điểm /100 và cấp ước lượng đúng công thức, kẹp [0, tối đa], lưu và mở lại được", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    await startExam(page);
    await fillAll(page);
    await submitViaDialog(page);
    await expect(writingSummary(page)).toContainText("Chưa tự chấm");

    // Trang danh sách khi chưa tự chấm: nói rõ "chưa tự chấm Viết", không in 0/0.
    await page.getByRole("link", { name: "Về danh sách đề" }).click();
    await expect(page).toHaveURL(/\/de-thi\/mini$/);
    const listCard = page.getByRole("link", { name: /Mini test Viết 01/ });
    await expect(listCard).toContainText("Lần gần nhất: đã nộp, chưa tự chấm Viết");
    await expect(listCard).toContainText("1 lần làm");
    await expect(listCard).not.toContainText("0/0");

    // Vào lại đề: có nút xem kết quả lần gần nhất, không có "khôi phục bài làm dở".
    await listCard.click();
    await expect(startButton(page)).toBeEnabled();
    await expect(page.getByText("Đã khôi phục bài làm dở")).toHaveCount(0);
    await page.getByRole("button", { name: "Xem kết quả lần gần nhất" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expect(writingSummary(page)).toContainText("Chưa tự chấm");

    // Mỗi ô nhập có giới hạn tối đa đúng điểm của câu (đọc từ giao diện, đối chiếu với server).
    const maxes: number[] = [];
    for (const [index, n] of NUMBERS.entries()) {
      const card = reviewCard(page, n);
      const input = selfScoreInput(card);
      await expect(input).toHaveAttribute("max", String(truth.items[index].max_points));
      await expect(input).toHaveAttribute("min", "0");
      await expect(card).toContainText(`/ ${truth.items[index].max_points} điểm`);
      maxes.push(truth.items[index].max_points);
    }

    // Chấm một câu: đã đủ để hiện điểm và cấp (các câu chưa chấm tính 0).
    const only51 = Math.floor(maxes[0] * 0.7);
    await selfScoreInput(reviewCard(page, 51)).fill(String(only51));
    await expect(writingSummary(page)).toContainText(`Đã tự chấm 1/${TOTAL} câu`);
    await expect(reviewCard(page, 51)).toContainText(`Tự chấm ${only51}/${maxes[0]}`);
    const s1 = truth.scoreOf(only51);
    await expect(writingSummary(page)).toContainText(`${s1}/${truth.maxScore}`);
    await expect(writingSummary(page)).toContainText(truth.levelOf(s1).label);
    await expect(writingSummary(page)).toContainText("Cấp (ước lượng)");

    // Chấm cả 4 câu ở 70% điểm tối đa.
    const points = maxes.map((m) => Math.floor(m * 0.7));
    await enterSelfPoints(page, points);
    const total = points.reduce((a, b) => a + b, 0);
    const score = truth.scoreOf(total);
    const level = truth.levelOf(score);
    const summary = writingSummary(page);
    await expect(summary).toContainText(`Đã tự chấm ${TOTAL}/${TOTAL} câu`);
    await expect(summary).toContainText(`${score}/${truth.maxScore}`);
    await expect(summary).toContainText(`Tổng điểm các câu Viết: ${total}/${truth.maxPointsTotal}`);
    await expect(summary).toContainText("Cấp (ước lượng)");
    await expect(summary).toContainText(level.label);
    await expect(summary).toContainText(`${level.compared}/${truth.totalMaxScore}`);
    await expect(summary).toContainText("ước lượng");
    await expect(summary).toContainText("chưa chấm AI");
    await expect(summary).not.toContainText("Chưa tự chấm");

    // Kẹp giá trị: vượt tối đa -> tối đa; âm -> 0; số lẻ -> làm tròn; để trống -> bỏ chấm câu đó.
    const input51 = selfScoreInput(reviewCard(page, 51));
    await input51.fill(String(maxes[0] + 25));
    await expect(input51).toHaveValue(String(maxes[0]));
    await expect(reviewCard(page, 51)).toContainText(`Tự chấm ${maxes[0]}/${maxes[0]}`);
    await input51.fill("-3");
    await expect(input51).toHaveValue("0");
    await input51.fill("2.6");
    await expect(input51).toHaveValue("3");
    await input51.fill("");
    await expect(reviewCard(page, 51)).toContainText("Chưa tự chấm");
    await expect(summary).toContainText(`Đã tự chấm ${TOTAL - 1}/${TOTAL} câu`);

    // Chốt điểm cuối cùng, chờ ghi IndexedDB rồi kiểm danh sách.
    await input51.fill(String(points[0]));
    const finalSelf: Record<string, number> = {
      "w51-0001": points[0],
      "w52-0001": points[1],
      "w53-0002": points[2],
      "w54-0002": points[3],
    };
    await expect.poll(() => storedSelfPoints(page), { timeout: 10_000 }).toEqual(finalSelf);

    await page.getByRole("link", { name: "Về danh sách đề" }).click();
    await expect(page.getByRole("link", { name: /Mini test Viết 01/ })).toContainText(
      `Lần gần nhất: ${score}/${truth.maxScore} · ${level.label} (ước lượng, Viết tự chấm)`,
    );

    // Tải lại hẳn trang rồi mở lại kết quả lần gần nhất: điểm tự chấm còn nguyên.
    await page.reload();
    await page.getByRole("link", { name: /Mini test Viết 01/ }).click();
    await page.getByRole("button", { name: "Xem kết quả lần gần nhất" }).click();
    await expect(writingSummary(page)).toContainText(`${score}/${truth.maxScore}`);
    await expect(writingSummary(page)).toContainText(level.label);
    for (const [index, n] of NUMBERS.entries()) {
      await expect(selfScoreInput(reviewCard(page, n))).toHaveValue(String(points[index]));
    }
  });

  test('Tự chấm điểm tối đa mọi câu đạt cấp cao nhất; "Xem bài mẫu & tự so sánh" mở/ẩn từng câu', async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    await startExam(page);
    const { essay53 } = await fillAll(page);
    await submitViaDialog(page);

    // Bài mẫu KHÔNG hiện cho tới khi bấm; mỗi câu mở độc lập.
    await expect(page.getByRole("region", { name: /Bài mẫu và tự so sánh/ })).toHaveCount(0);
    for (const n of NUMBERS) {
      const card = reviewCard(page, n);
      const button = compareButton(card);
      await expect(button).toHaveText(/Xem bài mẫu & tự so sánh/);
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await button.click();
      await expect(button).toHaveText(/Ẩn bài mẫu/);
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(
        card.getByRole("region", { name: `Bài mẫu và tự so sánh câu ${n}` }),
      ).toBeVisible();
    }
    // Câu 51: có đáp án chấp nhận (của server) để đối chiếu; câu 53: bài của bạn cạnh bài mẫu.
    const accepted = truth.items[0].reveal.blanks![0].accepted_answers[0];
    await expect(reviewCard(page, 51)).toContainText(accepted);
    const region53 = reviewCard(page, 53).getByRole("region", {
      name: "Bài mẫu và tự so sánh câu 53",
    });
    await expect(region53.getByRole("region", { name: "Bài của bạn", exact: true })).toContainText(
      essay53.slice(0, 10),
    );
    await expect(region53.getByRole("region", { name: /^Bài mẫu cấp \d$/ }).first()).toBeVisible();

    // Ẩn lại.
    await compareButton(reviewCard(page, 53)).click();
    await expect(
      reviewCard(page, 53).getByRole("region", { name: "Bài mẫu và tự so sánh câu 53" }),
    ).toHaveCount(0);

    // Điểm tối đa mọi câu -> cấp cao nhất.
    await enterSelfPoints(
      page,
      truth.items.map((i) => i.max_points),
    );
    const top = truth.thresholds[truth.thresholds.length - 1];
    const score = truth.scoreOf(truth.maxPointsTotal);
    expect(truth.levelOf(score).label).toBe(top.label);
    await expect(writingSummary(page)).toContainText(`${score}/${truth.maxScore}`);
    await expect(writingSummary(page)).toContainText(top.label);
    await expect(writingSummary(page)).toContainText("cấp cao nhất");
  });

  test("Hết giờ: tự nộp khi đồng hồ về 0 (tua 50 phút), bài đang gõ không mất", async ({
    page,
  }) => {
    await page.clock.install();
    await startExam(page);
    await blankBox(page, "㉠").fill(ANSWER_51[0]);
    await gotoQuestion(page, 53);
    await essayBox(page).fill(korean(40));

    const requestPromise = page.waitForRequest(
      (r) => r.url().endsWith(SUBMIT_URL) && r.method() === "POST",
    );
    await page.clock.fastForward("50:00");

    const apiRequest = await requestPromise;
    const sent = apiRequest.postDataJSON() as {
      timedOut: boolean;
      timeSpentMs: number;
      writing: Record<string, { text?: string; blanks?: Record<string, string> }>;
    };
    expect(sent.timedOut).toBe(true);
    expect(sent.timeSpentMs).toBeLessThanOrEqual(DURATION_SEC * 1000);
    expect(sent.writing["w51-0001"].blanks?.["㉠"]).toBe(ANSWER_51[0]);
    expect(sent.writing["w53-0002"].text).toBe(korean(40));

    await expect(resultHeading(page)).toBeVisible();
    await expect(writingSummary(page)).toContainText("Bài được tự động nộp vì hết giờ");
    await expect(writingSummary(page)).toContainText("Chưa tự chấm");
    await expect(dialog(page)).toHaveCount(0); // không có hộp xác nhận khi tự nộp
    await expect(reviewCard(page, 51)).toContainText(ANSWER_51[0]);
  });

  test("Hết giờ khi tải lại: bài làm dở đã quá hạn được nộp luôn, giữ nội dung đã gõ", async ({
    page,
  }) => {
    await startExam(page);
    await blankBox(page, "㉠").fill(ANSWER_51[0]);
    await expect
      .poll(async () => JSON.stringify(await draftWriting(page)), { timeout: 10_000 })
      .toContain(ANSWER_51[0]);
    await shiftDraftStart(page, (DURATION_SEC + 60) * 1000);

    await page.reload();
    await expect(resultHeading(page)).toBeVisible();
    await expect(writingSummary(page)).toContainText("Bài được tự động nộp vì hết giờ");
    await expect(reviewCard(page, 51)).toContainText(ANSWER_51[0]);
    await expect(reviewCard(page, 51)).toContainText("Bạn chưa điền"); // ㉡ bỏ trống
    await expect.poll(() => countDrafts(page)).toBe(0);
  });

  test("Lỗi mạng khi nộp: báo lỗi, bài còn nguyên, thử lại nộp được", async ({ page }) => {
    await startExam(page);
    await blankBox(page, "㉠").fill(ANSWER_51[0]);

    await page.route(`**${SUBMIT_URL}`, (route) => route.abort("failed"));
    await submitButton(page).click();
    await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Không kết nối được tới máy chủ" }),
    ).toBeVisible();
    await expect(resultHeading(page)).toHaveCount(0);
    await expect(blankBox(page, "㉠")).toHaveValue(ANSWER_51[0]);

    await page.unroute(`**${SUBMIT_URL}`);
    await page.getByRole("button", { name: "Thử lại nộp bài" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expect(reviewCard(page, 51)).toContainText(ANSWER_51[0]);
  });

  test("Không lộ bài mẫu/đáp án trước khi nộp (HTML, RSC, fetch, JS và giao diện)", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);

    // Dữ liệu (document/fetch/xhr) tách khỏi mã JS: JS của ứng dụng có tên trường như
    // `model_answers` (mã hiển thị kết quả) nên chỉ kiểm NỘI DUNG bài mẫu trong JS, không kiểm tên.
    // Phản hồi POST /api/exam/submit không tính (nó hợp lệ chứa bài mẫu, sau khi nộp).
    const bodies: string[] = [];
    const scripts: string[] = [];
    page.on("response", async (response) => {
      if (response.url().endsWith(SUBMIT_URL)) return;
      const type = response.request().resourceType();
      if (type === "document" || type === "fetch" || type === "xhr") {
        bodies.push(await response.text().catch(() => ""));
      } else if (type === "script") {
        scripts.push(await response.text().catch(() => ""));
      }
    });

    await page.goto(LIST_URL);
    await expect(page.getByRole("link", { name: /Mini test Viết 01/ })).toBeVisible();
    await startExam(page);
    // Duyệt hết các câu để mọi khối đã được render.
    for (const n of NUMBERS) await gotoQuestion(page, n);

    const html = await (await request.get(EXAM_URL)).text();
    const rsc = await (await request.get(EXAM_URL, { headers: { RSC: "1" } })).text();
    const everything = [...bodies, html, rsc, await page.content()].join("\n");

    expect(everything, "payload phải chứa dữ liệu đề (kiểm tra có quét đúng)").toContain(TITLE);
    expect(everything).toContain("㉠");

    const forbiddenKeys =
      /model_answers|accepted_answers|partial_answers|rejected_answers|required_points|required_elements|rubric_notes|expression_bank|scoring_notes|common_mistakes|explanation_vi|outline_vi|notes_internal|reviewed_by|authored_by|note_vi|reason_vi|correctLabel|is_correct/;
    const hit = forbiddenKeys.exec(everything);
    expect(
      hit ? everything.slice(Math.max(0, hit.index - 80), hit.index + 120) : null,
      "payload dữ liệu chứa trường bài mẫu/đáp án",
    ).toBeNull();

    // Nội dung thật của bài mẫu/đáp án/lời giải không được xuất hiện ở bất kỳ payload hay JS nào
    // (trừ khi nó trùng nguyên văn với phần đề công khai).
    const publicText = JSON.stringify(truth.items.map((i) => i.prompt));
    const probes: string[] = [];
    for (const item of truth.items) {
      for (const model of item.reveal.model_answers ?? []) probes.push(model.text.slice(0, 30));
      for (const blank of item.reveal.blanks ?? []) {
        probes.push(...blank.accepted_answers, ...blank.partial_answers);
      }
      const line = (item.reveal.explanation_vi ?? "")
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length >= 20);
      if (line) probes.push(line.slice(0, 40));
    }
    const usable = probes.filter((p) => p.length >= 8 && !publicText.includes(p));
    expect(usable.length, "phải có mẫu dò để kiểm").toBeGreaterThan(8);
    const allScripts = scripts.join("\n");
    for (const probe of usable) {
      expect(everything, `"${probe}" bị lộ trong payload`).not.toContain(probe);
      expect(allScripts, `"${probe}" bị lộ trong JS`).not.toContain(probe);
    }

    // Giao diện đang làm bài không có bài mẫu / đáp án / lời giải / nút so sánh.
    await expect(runner(page).getByText(/Lời giải|Bài mẫu|Đáp án đúng/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Xem bài mẫu/ })).toHaveCount(0);
  });

  test("Bố cục: không tràn ngang ở mọi câu, chữ Hàn keep-all, vùng bấm đủ lớn, đồng hồ + Nộp bài luôn thấy", async ({
    page,
  }, testInfo) => {
    await page.goto(LIST_URL);
    await expectNoHorizontalOverflow(page, "danh sách đề");
    await startExam(page);

    const viewport = page.viewportSize()!;
    if (testInfo.project.name === "mobile") expect(viewport.width).toBe(375);
    else expect(viewport.width).toBe(1280);

    for (const n of NUMBERS) {
      await gotoQuestion(page, n);
      await expectNoHorizontalOverflow(page, `câu ${n}`);
      await expect(timer(page)).toBeInViewport();
      await expect(submitButton(page)).toBeInViewport();
      // Mọi phần tử tiếng Hàn đang hiển thị trong trình làm bài đều không vỡ giữa từ.
      const bad = await runner(page).evaluate((root) =>
        [...root.querySelectorAll<HTMLElement>('[lang="ko"]')]
          .filter((el) => el.offsetParent !== null && getComputedStyle(el).wordBreak !== "keep-all")
          .map((el) => `${el.tagName}:${(el.textContent ?? "").slice(0, 20)}`),
      );
      expect(bad, `câu ${n}: phần tử lang=ko không dùng word-break: keep-all`).toEqual([]);
      // Ô nhập đủ lớn (>= 44px) và vừa chiều ngang.
      const fields = n <= 52 ? [blankBox(page, "㉠"), blankBox(page, "㉡")] : [essayBox(page)];
      for (const field of fields) {
        const box = await field.boundingBox();
        expect(box!.height, `ô nhập câu ${n} quá thấp`).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      }
    }

    // Chuỗi dài không dấu cách và đoạn dài có dấu cách đều không làm tràn trang/ô viết.
    await gotoQuestion(page, 54);
    await essayBox(page).fill(korean(900));
    await expectNoHorizontalOverflow(page, "câu 54 với chuỗi dài không dấu cách");
    const longText = Array.from({ length: 80 }, () => "공공도서관의").join(" ");
    await essayBox(page).fill(longText);
    await expectNoHorizontalOverflow(page, "câu 54 với đoạn dài");
    const box = await essayBox(page).evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
    await gotoQuestion(page, 51);
    await blankBox(page, "㉠").fill("가".repeat(120));
    await expectNoHorizontalOverflow(page, "câu 51 với ô điền dài");

    // Nút Nộp bài >= 44px cao và không bị cắt; hộp xác nhận vừa màn hình.
    const submitBox = await submitButton(page).boundingBox();
    expect(submitBox!.height).toBeGreaterThanOrEqual(44);
    expect(submitBox!.x + submitBox!.width).toBeLessThanOrEqual(viewport.width);
    await page.getByRole("button", { name: "Bảng câu hỏi" }).click();
    await expectNoHorizontalOverflow(page, "bảng số câu");
    await submitButton(page).click();
    await expect(dialog(page)).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page, "hộp xác nhận");
  });

  test("Trang kết quả: không tràn ngang kể cả khi mở bài mẫu cả 4 câu; thứ bậc tiêu đề không nhảy cấp", async ({
    page,
  }) => {
    await startExam(page);
    await fillAll(page);
    await submitViaDialog(page);
    await expectNoHorizontalOverflow(page, "trang kết quả");

    for (const n of NUMBERS) {
      await compareButton(reviewCard(page, n)).click();
      await expectNoHorizontalOverflow(page, `kết quả sau khi mở bài mẫu câu ${n}`);
    }
    await enterSelfPoints(page, [3, 3, 10, 20]);
    await expectNoHorizontalOverflow(page, "kết quả sau khi tự chấm");

    // Chữ Hàn trong kết quả (bài của bạn, bài mẫu) không vỡ giữa từ.
    const bad = await page
      .locator("main")
      .evaluate((root) =>
        [...root.querySelectorAll<HTMLElement>('[lang="ko"]')]
          .filter((el) => el.offsetParent !== null && getComputedStyle(el).wordBreak !== "keep-all")
          .map((el) => `${el.tagName}:${(el.textContent ?? "").slice(0, 20)}`),
      );
    expect(bad, "phần tử lang=ko ở trang kết quả không dùng word-break: keep-all").toEqual([]);

    // Thứ bậc tiêu đề: mỗi tiêu đề không sâu hơn tiêu đề trước quá 1 cấp.
    const levels = await page.locator("main").evaluate((root) =>
      [...root.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
        level: Number(h.tagName.slice(1)),
        text: (h.textContent ?? "").trim().slice(0, 40),
      })),
    );
    let previous = 1;
    for (const h of levels) {
      expect(
        h.level,
        `tiêu đề "${h.text}" (h${h.level}) nhảy cấp sau h${previous}`,
      ).toBeLessThanOrEqual(previous + 1);
      previous = h.level;
    }
  });

  test("Bàn phím và ARIA trong trình làm bài: ô nhập có nhãn, Tab, phím số gõ được vào ô, hộp thoại", async ({
    page,
  }) => {
    await startExam(page);

    // Vùng, đồng hồ, bảng số câu, tiến độ có nhãn.
    await expect(runner(page)).toBeVisible();
    await expect(timer(page)).toContainText("Thời gian còn lại");
    await expect(page.getByLabel(`Đã làm 0 trên ${TOTAL} câu`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Bảng câu hỏi" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    // Câu 51: nhóm ô điền có tên; mỗi ô có nhãn truy cập duy nhất.
    await expect(page.getByRole("group", { name: "Điền vào chỗ trống" })).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(2);
    await expect(blankBox(page, "㉠")).toBeVisible();
    await expect(blankBox(page, "㉡")).toBeVisible();

    // Phím số (phím tắt chọn đáp án ở đề trắc nghiệm) không được chặn khi gõ vào ô; Tab đi ㉠ -> ㉡.
    await blankBox(page, "㉠").focus();
    await page.keyboard.type("1234 가나");
    await expect(blankBox(page, "㉠")).toHaveValue("1234 가나");
    await page.keyboard.press("Tab");
    await expect(blankBox(page, "㉡")).toBeFocused();
    await page.keyboard.type("4 다라");
    await expect(blankBox(page, "㉡")).toHaveValue("4 다라");
    await page.keyboard.press("Shift+Tab");
    await expect(blankBox(page, "㉠")).toBeFocused();
    await expect(progress(page, 1)).toBeVisible();

    // Phím số khi KHÔNG ở trong ô cũng không làm gì (không có đáp án trắc nghiệm để chọn).
    await page.getByRole("heading", { level: 2, name: "Câu 51", exact: true }).focus();
    await page.keyboard.press("2");
    await expect(blankBox(page, "㉠")).toHaveValue("1234 가나");

    // "Câu sau" bằng bàn phím: focus chuyển tới tiêu đề câu mới.
    await page.getByRole("button", { name: "Câu sau", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(blockHeading(page, 52)).toBeFocused();
    await page.getByRole("button", { name: "Câu sau", exact: true }).press("Enter");
    await expect(blockHeading(page, 53)).toBeFocused();

    // Ô viết: nhãn "Bài viết của bạn", mô tả gồm bộ đếm + gợi ý, đọc được khung ký tự.
    await expect(essayBox(page)).toBeVisible();
    await expect(essayBox(page)).toHaveAccessibleDescription(/ký tự/);
    const describedBy = (await essayBox(page).getAttribute("aria-describedby")) ?? "";
    expect(describedBy.split(" ")).toHaveLength(2);
    await expect(page.locator("p[role=status]")).toContainText("Chưa đủ");
    // Tab từ ô viết tới các nút kế tiếp, không bị kẹt.
    await essayBox(page).focus();
    await page.keyboard.type("가");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).not.toHaveJSProperty("tagName", "TEXTAREA");

    // Hộp thoại: modal, có tên/mô tả, focus vào "Quay lại làm bài", Tab xoay vòng, Esc trả focus.
    const opener = submitButton(page);
    await opener.focus();
    await page.keyboard.press("Enter");
    const confirm = dialog(page);
    await expect(confirm).toBeVisible();
    await expect(confirm).toHaveAttribute("aria-modal", "true");
    await expect(confirm).toHaveAccessibleDescription(/bỏ trống/);
    const back = confirm.getByRole("button", { name: "Quay lại làm bài" });
    const yes = confirm.getByRole("button", { name: "Nộp bài" });
    await expect(back).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(yes).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(back).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("Trợ năng trang kết quả: ô tự chấm có nhãn và mô tả, nhóm chọn nhanh, vùng trạng thái đọc điểm", async ({
    page,
  }) => {
    await startExam(page);
    await fillAll(page);
    await submitViaDialog(page);

    // Mọi ô nhập số có đúng một nhãn và aria-describedby trỏ tới gợi ý có thật.
    const problems = await page.locator("main").evaluate((root) => {
      const out: string[] = [];
      for (const el of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      )) {
        if (!el.labels || el.labels.length === 0) out.push(`${el.tagName}#${el.id} không có label`);
        const described = el.getAttribute("aria-describedby");
        if (described) {
          for (const id of described.split(" ")) {
            if (!document.getElementById(id))
              out.push(`${el.id}: aria-describedby ${id} không tồn tại`);
          }
        }
      }
      return out;
    });
    expect(problems).toEqual([]);
    await expect(page.getByLabel("Tự chấm (ước lượng)")).toHaveCount(TOTAL);

    // W51/W52 có nút chọn nhanh điểm (nhóm có tên, aria-pressed); W53/W54 chỉ có ô nhập.
    const quick51 = reviewCard(page, 51).getByRole("group", { name: "Chọn nhanh" });
    await expect(quick51).toBeVisible();
    await expect(reviewCard(page, 53).getByRole("group", { name: "Chọn nhanh" })).toHaveCount(0);
    const buttons = quick51.getByRole("button");
    expect(await buttons.count()).toBeGreaterThanOrEqual(2);
    await expect(buttons.first()).toHaveAttribute("aria-pressed", "false");
    await buttons.last().click();
    await expect(buttons.last()).toHaveAttribute("aria-pressed", "true");
    await expect(buttons.first()).toHaveAttribute("aria-pressed", "false");
    await expect(selfScoreInput(reviewCard(page, 51))).not.toHaveValue("");

    // Vùng trạng thái cho trình đọc màn hình đọc điểm khi đổi.
    await expect(
      page.locator("p[role=status]").filter({ hasText: /Điểm Viết tự chấm \d+ trên \d+/ }),
    ).toHaveCount(1);

    // Dùng bàn phím: Tab tới ô tự chấm, gõ số.
    const input = selfScoreInput(reviewCard(page, 52));
    await input.focus();
    await page.keyboard.type("4");
    await expect(input).toHaveValue("4");
    await expect(reviewCard(page, 52)).toContainText(/Tự chấm 4\//);
  });

  test("API nộp bài Viết: kết quả không chấm tự động, đếm ký tự, từ chối hình dạng sai khi gọi trực tiếp", async ({
    request,
  }) => {
    const truth = await fetchTruth(request);
    const post = (data: unknown) => request.post(SUBMIT_URL, { data });
    const base = { program: PROGRAM, kind: "mini", examId: EXAM_ID, answers: {} };
    const apiError = async (response: Awaited<ReturnType<typeof post>>) =>
      (await response.json()).error as { code: string; message: string };

    // Bài trống: 200, không cache, không có phần chấm tự động, cấp là null.
    const empty = await post(base);
    expect(empty.status()).toBe(200);
    expect(empty.headers()["cache-control"]).toContain("no-store");
    const emptyBody = await empty.json();
    expect(emptyBody.sections).toEqual([]);
    expect(emptyBody.questions).toEqual([]);
    expect(emptyBody.level).toBeNull();
    expect(emptyBody.total_score).toBe(0);
    expect(emptyBody.writing.items.map((i: { type_code: string }) => i.type_code)).toEqual([
      "W51",
      "W52",
      "W53",
      "W54",
    ]);
    expect(truth.maxPointsTotal).toBe(truth.maxScore); // đề đủ 4 câu: 10+10+30+50 = 100
    expect(emptyBody.writing.duration_sec).toBe(DURATION_SEC);
    expect(emptyBody.writing.level_basis.is_estimate).toBe(true);
    expect(emptyBody.writing.level_basis.auto_max_score).toBe(0);
    for (const item of emptyBody.writing.items) {
      if (item.format === "fill_blanks") {
        expect(Object.values(item.answer.blanks)).toEqual(["", ""]);
        expect(item.char_count).toBeUndefined();
      } else {
        expect(item.answer.text).toBe("");
        expect(item.char_count).toBe(0);
        expect(item.char_status).toBe("below");
      }
    }

    // Bài hợp lệ: server đếm ký tự độc lập và phân loại dưới/đạt/vượt khung.
    const limit53 = truth.items[2].prompt.char_limit!;
    const limit54 = truth.items[3].prompt.char_limit!;
    const text53 = `${korean(limit53.min)}\n${korean(3)}`;
    const ok = await post({
      ...base,
      writing: {
        "w51-0001": { blanks: { "㉠": "가", "㉡": "나" } },
        "w52-0001": { blanks: { "㉠": "다" } }, // thiếu ㉡ -> được điền ""
        "w53-0002": { text: text53 },
        "w54-0002": { text: korean(limit54.max + 1) },
        "w99-9999": { text: "khoá lạ bị bỏ qua" },
      },
    });
    expect(ok.status()).toBe(200);
    const okBody = await ok.json();
    const byId = Object.fromEntries(
      okBody.writing.items.map((i: { id: string }) => [i.id, i]),
    ) as Record<
      string,
      {
        answer: { text?: string; blanks?: Record<string, string> };
        char_count?: number;
        char_status?: string;
      }
    >;
    expect(byId["w51-0001"].answer.blanks).toEqual({ "㉠": "가", "㉡": "나" });
    expect(byId["w52-0001"].answer.blanks).toEqual({ "㉠": "다", "㉡": "" });
    expect(byId["w53-0002"].char_count).toBe(countIndependently(text53));
    expect(byId["w53-0002"].char_status).toBe("within");
    expect(byId["w54-0002"].char_count).toBe(limit54.max + 1);
    expect(byId["w54-0002"].char_status).toBe("above");
    expect(JSON.stringify(okBody)).not.toContain("khoá lạ");

    // Trường writing = null/thiếu, câu trắc nghiệm lạ trong answers: bỏ qua.
    expect((await post({ ...base, writing: null })).status()).toBe(200);
    expect((await post({ ...base, answers: { "w53-0002": "①", "r01-0001": "②" } })).status()).toBe(
      200,
    );

    // Hình dạng sai -> 400 invalid_writing_answer, thông báo tiếng Việt nêu id câu.
    const bad: [string, unknown, RegExp?][] = [
      ["writing là chuỗi", "x"],
      ["writing là mảng", []],
      ["câu essay gửi blanks", { "w53-0002": { blanks: { "㉠": "가" } } }, /w53-0002/],
      ["câu điền chỗ trống gửi text", { "w51-0001": { text: "가" } }, /w51-0001/],
      ["nhãn chỗ trống lạ", { "w51-0001": { blanks: { "㉢": "가" } } }, /㉢/],
      ["text không phải chuỗi", { "w53-0002": { text: 123 } }],
      ["giá trị ô điền không phải chuỗi", { "w51-0001": { blanks: { "㉠": 5 } } }],
      ["bài của một câu là chuỗi", { "w53-0002": "가나다" }],
      ["essay quá dài (5001)", { "w53-0002": { text: "가".repeat(5001) } }],
      ["ô điền quá dài (501)", { "w51-0001": { blanks: { "㉠": "가".repeat(501) } } }],
    ];
    for (const [name, writing, messageHint] of bad) {
      const response = await post({ ...base, writing });
      expect(response.status(), name).toBe(400);
      const error = await apiError(response);
      expect(error.code, name).toBe("invalid_writing_answer");
      expect(error.message.length, name).toBeGreaterThan(10);
      if (messageHint) expect(error.message, name).toMatch(messageHint);
    }

    // Đúng biên được nhận.
    const edge = await post({
      ...base,
      writing: {
        "w51-0001": { blanks: { "㉠": "가".repeat(500) } },
        "w53-0002": { text: "가".repeat(5000) },
      },
    });
    expect(edge.status()).toBe(200);

    // Thân quá lớn, JSON hỏng, đề lạ.
    const huge = await post({ ...base, writing: { "w53-0002": { text: "가".repeat(40_000) } } });
    expect(huge.status()).toBe(400);
    expect((await apiError(huge)).code).toBe("invalid_body");
    const notJson = await request.post(SUBMIT_URL, {
      headers: { "content-type": "application/json" },
      data: "{không phải json",
    });
    expect(notJson.status()).toBe(400);
    const missing = await post({ ...base, examId: "viet-99" });
    expect(missing.status()).toBe(404);
    expect((await apiError(missing)).code).toBe("exam_not_found");

    // Đề Đọc nhận kèm `writing` thì bỏ qua, không sinh phần Viết.
    const reading = await post({
      program: PROGRAM,
      kind: "mini",
      examId: "doc-01",
      answers: {},
      writing: { "w53-0002": { text: "가나다" } },
    });
    expect(reading.status()).toBe(200);
    expect((await reading.json()).writing).toBeUndefined();
  });
});
