import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

/**
 * E2E Mini test Đọc (đề mẫu doc-01, 20 câu, 30 phút) ở chế độ khách: danh sách -> giới thiệu -> làm
 * bài (đồng hồ, bảng số câu, đánh dấu) -> nộp -> kết quả; tải lại giữa chừng; hết giờ tự nộp;
 * không lộ đáp án trước khi nộp. Bản nháp và kết quả lưu IndexedDB "topikly-exam"; mỗi test dùng
 * browser context mới nên luôn bắt đầu sạch.
 *
 * Đáp án đúng KHÔNG hard-code: lấy một lần từ POST /api/exam/submit với bài trống (server trả
 * correctLabel cho từng câu). Nhờ vậy đổi nội dung đề mẫu không làm vỡ test. Điểm kỳ vọng theo
 * công thức trong lib/exam/score.ts: round(đúng/20 × 100), cấp so ngưỡng sau khi chiếu lên thang 300
 * (3급 từ 120, 4급 từ 150, 5급 từ 190, 6급 từ 230).
 */

const PROGRAM = "topik-ii";
const LIST_URL = `/${PROGRAM}/de-thi/mini`;
const EXAM_URL = `/${PROGRAM}/de-thi/mini/doc-01`;
const SUBMIT_URL = "/api/exam/submit";
const TOTAL = 20;
const DURATION_SEC = 1800;

// ------------------------------------------------------------------ sự thật từ server

interface TruthQuestion {
  questionId: string;
  number: number;
  correctLabel: string;
  explanation_vi: string;
  type_code: string;
  type_group: string;
}
interface Truth {
  questions: TruthQuestion[];
  /** Nhãn khác đáp án đúng, để cố ý chọn sai. */
  wrongOf: (number: number) => string;
  correctOf: (number: number) => string;
}

async function fetchTruth(request: APIRequestContext): Promise<Truth> {
  const response = await request.post(SUBMIT_URL, {
    data: { program: PROGRAM, kind: "mini", examId: "doc-01", answers: {} },
  });
  expect(response.status(), "API nộp bài phải chấm được đề mẫu doc-01").toBe(200);
  const body = (await response.json()) as { questions: TruthQuestion[] };
  expect(body.questions).toHaveLength(TOTAL);
  const byNumber = new Map(body.questions.map((q) => [q.number, q]));
  const correctOf = (n: number) => byNumber.get(n)!.correctLabel;
  return {
    questions: body.questions,
    correctOf,
    wrongOf: (n) => (correctOf(n) === "①" ? "②" : "①"),
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

/** Giây còn lại đọc từ đồng hồ "mm:ss". */
async function remainingSeconds(page: Page): Promise<number> {
  const text = (await timer(page).textContent()) ?? "";
  const match = /(\d{2}):(\d{2})/.exec(text);
  expect(match, `đồng hồ phải có dạng mm:ss, nhận được "${text}"`).not.toBeNull();
  return Number(match![1]) * 60 + Number(match![2]);
}

async function startExam(page: Page) {
  await page.goto(EXAM_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Mini test Đọc 01" })).toBeVisible();
  await startButton(page).click(); // tự chờ hết trạng thái disabled "Đang kiểm tra bài làm dở…"
  await expect(timer(page)).toBeVisible();
}

/** Mở bảng số câu (nếu đang đóng) rồi nhảy tới câu n. */
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

/** Bấm vào thẻ phương án như người dùng thật (radio thật được ẩn bằng sr-only). */
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

// ------------------------------------------------------------------ test

test.describe("Mini test Đọc — chế độ khách", () => {
  test("Danh sách: thẻ doc-01 có nhãn đề mẫu, số câu, thời gian; vào giới thiệu rồi Bắt đầu", async ({
    page,
  }) => {
    await page.goto(LIST_URL);
    const card = page.getByRole("link", { name: /Mini test Đọc 01/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Đề mẫu");
    await expect(card).toContainText(`${TOTAL} câu`);
    await expect(card).toContainText("30 phút");
    await expect(card).toContainText("Đọc");
    await expect(card).toContainText("Chưa làm"); // sau khi đọc xong IndexedDB

    await card.click();
    await expect(page).toHaveURL(/\/topik-ii\/de-thi\/mini\/doc-01$/);
    await expect(page.getByRole("heading", { level: 1, name: "Mini test Đọc 01" })).toBeVisible();

    // Màn giới thiệu: số câu/thời gian/quy chế, ghi chú đề mẫu và ước lượng cấp.
    const intro = page.getByRole("region", { name: "Trước khi bắt đầu" });
    await expect(intro).toContainText(`${TOTAL} câu · 30 phút`);
    await expect(intro).toContainText("Thời gian làm bài là 30 phút");
    await expect(intro).toContainText("Đề mẫu đang chờ duyệt nội dung");
    await expect(intro).toContainText("cấp hiển thị ở kết quả là ước lượng");
    await expect(timer(page)).toHaveCount(0); // đồng hồ chưa chạy khi chưa bấm Bắt đầu

    await startButton(page).click();
    await expect(timer(page)).toBeVisible();
    // Câu 1 hiển thị, khối đầu có lệnh tiếng Hàn.
    await expect(page.getByRole("heading", { level: 2, name: /^Câu 1/ })).toBeVisible();
    await expect(runner(page).locator('p[lang="ko"]').first()).toContainText(/[가-힣]/);
    await expect(page.getByText(`Đã làm 0/${TOTAL}`)).toBeVisible();
    expect(await remainingSeconds(page)).toBeGreaterThan(DURATION_SEC - 30);
  });

  test("Không lộ đáp án/lời giải trước khi nộp (HTML, RSC, fetch và giao diện)", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);

    // Dữ liệu (document/fetch/xhr/RSC) và mã JS tách riêng: JS của ứng dụng có tên trường như
    // `correctLabel` (mã hiển thị kết quả) nên chỉ kiểm nội dung lời giải trong JS, không kiểm tên.
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

    await page.goto(LIST_URL);
    await expect(page.getByRole("link", { name: /Mini test Đọc 01/ })).toBeVisible();
    await page.goto(EXAM_URL);
    await expect(startButton(page)).toBeEnabled();
    await startButton(page).click();
    await expect(timer(page)).toBeVisible();
    // Duyệt hết các câu để mọi khối đã được render.
    for (let n = 1; n <= TOTAL; n++) await gotoQuestion(page, n);

    // Tải thêm trực tiếp HTML và luồng RSC của trang đề (không qua trình duyệt).
    const html = await (await request.get(EXAM_URL)).text();
    const rsc = await (await request.get(EXAM_URL, { headers: { RSC: "1" } })).text();
    const everything = [...bodies, html, rsc, await page.content()].join("\n");

    // Khoá/ trường chỉ có trong kết quả chấm hoặc dữ liệu nguồn.
    const forbiddenKeys =
      /correctLabel|correct_label|is_correct|explanation_vi|note_vi|trap_name_vi|transcript_vi|\\?"correct\\?"\s*:/;
    expect(everything, "payload phải chứa dữ liệu đề (kiểm tra có quét đúng)").toContain(
      "Mini test Đọc 01",
    );
    const hit = forbiddenKeys.exec(everything);
    expect(
      hit ? everything.slice(Math.max(0, hit.index - 80), hit.index + 120) : null,
      "payload dữ liệu chứa trường đáp án/lời giải",
    ).toBeNull();

    // Lời giải thật của từng câu không được xuất hiện ở bất kỳ payload nào.
    for (const q of truth.questions) {
      const probe = q.explanation_vi.replace(/\s+/g, " ").trim().slice(0, 40);
      expect(probe.length).toBeGreaterThan(10);
      expect(everything, `lời giải câu ${q.number} bị lộ trong payload`).not.toContain(probe);
      expect(scripts.join(" "), `lời giải câu ${q.number} bị lộ trong JS`).not.toContain(probe);
    }

    // Giao diện: không có chữ "Lời giải"/"Đáp án đúng" khi đang làm bài.
    await expect(runner(page).getByText(/Lời giải|Đáp án đúng/)).toHaveCount(0);
  });

  test("Làm bài: chọn, đánh dấu, bảng số câu; tải lại vẫn giữ đáp án, đánh dấu và đồng hồ", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    await startExam(page);

    // Đáp án hiện đúng, đổi và bỏ chọn được.
    await pick(page, 1, truth.correctOf(1));
    await expect(page.getByText(`Đã làm 1/${TOTAL}`)).toBeVisible();
    await pick(page, 1, truth.wrongOf(1));
    await expect(radio(page, 1, truth.correctOf(1))).not.toBeChecked();
    await page.getByRole("button", { name: "Bỏ chọn" }).click();
    await expect(page.getByText(`Đã làm 0/${TOTAL}`)).toBeVisible();

    await pick(page, 1, truth.correctOf(1));
    await answer(page, 3, truth.wrongOf(3));
    await answer(page, 5, truth.correctOf(5));

    // Đánh dấu câu 5 (đang xem) và kiểm trạng thái trong bảng số câu.
    const article5 = page.getByRole("article", { name: "Câu 5" });
    const mark = article5.getByRole("button", { name: "Đánh dấu" });
    await expect(mark).toHaveAttribute("aria-pressed", "false");
    await mark.click();
    await expect(article5.getByRole("button", { name: "Bỏ đánh dấu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Bảng câu hỏi" }).click();
    const nav = page.getByRole("navigation", { name: "Bảng số câu" });
    await expect(nav.getByRole("button", { name: "Câu 1, đã làm" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Câu 2, chưa làm" })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Câu 5, đã làm, đã đánh dấu/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Câu 5.*đang xem/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(page.getByText(`Đã làm 3/${TOTAL}`)).toBeVisible();

    // Điều hướng khối bằng nút Trước/Sau.
    await nav.getByRole("button", { name: /^Câu 7\b/ }).click();
    await expect(page.getByRole("heading", { level: 3, name: "Câu 7" })).toBeFocused();
    await page.getByRole("button", { name: "Nhóm câu trước" }).click();
    await expect(radio(page, 6, "①")).toBeVisible();

    // Chờ bản nháp được lưu, để đồng hồ có thời gian trôi thật.
    await expect.poll(() => countDrafts(page)).toBe(1);
    await expect.poll(() => remainingSeconds(page), { timeout: 10_000 }).toBeLessThan(DURATION_SEC);

    // Tải lại lần 1: đáp án, đánh dấu và thời gian còn lại được khôi phục.
    await page.reload();
    await expect(timer(page)).toBeVisible();
    await expect(page.getByText("Đã khôi phục bài làm dở")).toBeVisible();
    const afterReload = await remainingSeconds(page);
    expect(afterReload, "đồng hồ không được reset về 30:00 sau khi tải lại").toBeLessThan(
      DURATION_SEC,
    );
    expect(afterReload).toBeGreaterThan(DURATION_SEC - 120);
    await expect(page.getByText(`Đã làm 3/${TOTAL}`)).toBeVisible();

    await gotoQuestion(page, 1);
    await expect(radio(page, 1, truth.correctOf(1))).toBeChecked();
    await gotoQuestion(page, 3);
    await expect(radio(page, 3, truth.wrongOf(3))).toBeChecked();
    await gotoQuestion(page, 5);
    await expect(radio(page, 5, truth.correctOf(5))).toBeChecked();
    await expect(
      page.getByRole("article", { name: "Câu 5" }).getByRole("button", { name: "Bỏ đánh dấu" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Tải lại lần 2 sau khi "đã làm 3 phút": đồng hồ phải khoảng 27:00, không phải 30:00.
    await shiftDraftStart(page, 180_000);
    await page.reload();
    await expect(timer(page)).toBeVisible();
    const afterShift = await remainingSeconds(page);
    expect(afterShift).toBeLessThanOrEqual(DURATION_SEC - 180);
    expect(afterShift).toBeGreaterThan(DURATION_SEC - 180 - 120);
    await expect(page.getByText(`Đã làm 3/${TOTAL}`)).toBeVisible();

    // Danh sách hiển thị "Đang làm dở".
    await page.goto(LIST_URL);
    await expect(page.getByRole("link", { name: /Mini test Đọc 01/ })).toContainText("Đang làm dở");
  });

  test("Nộp bài: hộp xác nhận nêu số câu bỏ trống; kết quả có điểm, cấp ước lượng, nhóm dạng, lời giải", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    await startExam(page);

    // Câu 1-12 đúng, câu 13 sai, câu 14-20 bỏ trống => 12/20 đúng => 60/100 => 180/300 => 4급 (ước lượng).
    for (let n = 1; n <= 12; n++) await answer(page, n, truth.correctOf(n));
    await answer(page, 13, truth.wrongOf(13));
    await page
      .getByRole("article", { name: "Câu 13" })
      .getByRole("button", { name: "Đánh dấu" })
      .click();

    // Hộp xác nhận: nêu số câu bỏ trống và số câu đánh dấu; Quay lại thì giữ nguyên bài.
    await submitButton(page).click();
    const confirm = dialog(page);
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("Còn 7 câu bỏ trống");
    await expect(confirm).toContainText("đánh dấu 1 câu");
    await confirm.getByRole("button", { name: "Quay lại làm bài" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(resultHeading(page)).toHaveCount(0);
    await expect(page.getByText(`Đã làm 13/${TOTAL}`)).toBeVisible();

    // Nộp thật: bắt response API để kiểm tra body gửi đi.
    await submitButton(page).click();
    const [apiRequest] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith(SUBMIT_URL) && r.method() === "POST"),
      dialog(page).getByRole("button", { name: "Nộp bài" }).click(),
    ]);
    const sent = apiRequest.postDataJSON() as {
      answers: Record<string, string | null>;
      timedOut: boolean;
    };
    expect(sent.timedOut).toBe(false);
    expect(Object.keys(sent.answers)).toHaveLength(TOTAL);
    expect(Object.values(sent.answers).filter((v) => v === null)).toHaveLength(7);

    await expect(resultHeading(page)).toBeVisible();
    await expect(resultHeading(page)).toBeFocused();

    // Điểm /100, cấp kèm chữ "ước lượng".
    const summary = page.getByRole("region", { name: "Kết quả bài làm" });
    await expect(summary).toContainText("60/100");
    await expect(summary).toContainText("Cấp (ước lượng)");
    await expect(summary).toContainText("4급");
    await expect(summary).toContainText("Cấp chỉ là ước lượng");
    await expect(summary).toContainText("tương đương 180/300");
    await expect(summary).toContainText("Thời gian làm bài: ");
    await expect(summary).not.toContainText("Bài được tự động nộp vì hết giờ");
    await expect(page.getByText("Kết quả được lưu tạm trên thiết bị này")).toBeVisible();

    // Bảng theo phần: Đọc 12/20, bỏ trống 7, 60/100.
    const sections = page.getByRole("table", { name: "Kết quả theo phần" });
    const readingRow = sections.getByRole("row", { name: /Đọc/ });
    await expect(readingRow).toContainText(`12/${TOTAL}`);
    await expect(readingRow).toContainText("60/100");
    await expect(readingRow.getByRole("cell").nth(1)).toHaveText("7");

    // Bảng theo nhóm dạng: tổng số câu các nhóm = TOTAL, mỗi nhóm có thanh + phần trăm.
    const groups = page.getByRole("list", { name: "Theo nhóm dạng câu" });
    const rows = groups.getByRole("listitem");
    expect(await rows.count()).toBeGreaterThan(1);
    const expectedGroupCodes = [...new Set(truth.questions.map((q) => q.type_group))];
    for (const code of expectedGroupCodes) {
      await expect(groups.getByText(`Nhóm ${code}`, { exact: true })).toBeVisible();
    }
    await expect(groups).toContainText("%");
    await expect(page.getByRole("list", { name: "Theo kỹ năng con" })).toBeVisible();

    // Xem lại câu sai: lọc "Sai (1)", mở ra có lời giải và đáp án đúng.
    await page.getByRole("button", { name: "Sai (1)" }).click();
    const wrongItems = page.locator('li[data-verdict="wrong"]');
    await expect(wrongItems).toHaveCount(1);
    await expect(page.locator('li[data-verdict="correct"]')).toHaveCount(0);
    const wrongItem = wrongItems.first();
    await expect(wrongItem).toContainText("Câu 13");
    await expect(wrongItem).toContainText(`Đáp án đúng ${truth.correctOf(13)}`);
    await wrongItem.getByRole("button").first().click();
    await expect(wrongItem.getByRole("heading", { level: 4, name: "Lời giải" })).toBeVisible();
    const explanation = wrongItem
      .getByRole("heading", { level: 4, name: "Lời giải" })
      .locator("..");
    expect(((await explanation.textContent()) ?? "").length).toBeGreaterThan(40);

    await page.getByRole("button", { name: "Bỏ trống (7)" }).click();
    await expect(page.locator('li[data-verdict="blank"]')).toHaveCount(7);
    await page.getByRole("button", { name: `Tất cả (${TOTAL})` }).click();
    await expect(page.locator("li[data-verdict]")).toHaveCount(TOTAL);

    // Về danh sách: thẻ hiện kết quả gần nhất; bản nháp đã bị xóa.
    expect(await countDrafts(page)).toBe(0);
    await page.getByRole("link", { name: "Về danh sách đề" }).click();
    await expect(page).toHaveURL(/\/de-thi\/mini$/);
    const card = page.getByRole("link", { name: /Mini test Đọc 01/ });
    await expect(card).toContainText("Lần gần nhất: 60/100 · 4급 (ước lượng)");
    await expect(card).toContainText("1 lần làm");

    // Vào lại đề: có nút xem kết quả lần gần nhất và không còn "khôi phục bài làm dở".
    await card.click();
    await expect(startButton(page)).toBeEnabled();
    await expect(page.getByRole("button", { name: "Xem kết quả lần gần nhất" })).toBeVisible();
    await page.getByRole("button", { name: "Xem kết quả lần gần nhất" }).click();
    await expect(page.getByRole("region", { name: "Kết quả bài làm" })).toContainText("60/100");
  });

  test('Kết quả: link "Luyện dạng này" dẫn đúng trang luyện tập', async ({ page, request }) => {
    const truth = await fetchTruth(request);
    await startExam(page);
    // Chỉ làm sai câu 6 (nhóm của nó phải có link luyện tập đúng dạng của câu đó).
    await answer(page, 6, truth.wrongOf(6));
    await submitButton(page).click();
    await expect(dialog(page)).toContainText(`Còn ${TOTAL - 1} câu bỏ trống`);
    await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expect(page.getByRole("region", { name: "Kết quả bài làm" })).toContainText("0/100");
    await expect(page.getByRole("region", { name: "Kết quả bài làm" })).toContainText(
      "Chưa đạt cấp",
    );

    const q6 = truth.questions.find((q) => q.number === 6)!;
    const groups = page.getByRole("list", { name: "Theo nhóm dạng câu" });
    const row = groups.getByRole("listitem").filter({ hasText: `Nhóm ${q6.type_group}` });
    await expect(row).toHaveCount(1);
    const link = row.getByRole("link", { name: /^Luyện dạng này/ });
    await expect(link).toBeVisible();
    // Đích kỳ vọng: type_code đầu tiên của nhóm có câu luyện (ở đề này nhóm chỉ có đúng dạng của câu 6).
    const href = await link.getAttribute("href");
    expect(href).toMatch(new RegExp(`^/${PROGRAM}/luyen-tap/doc/R\\d+$`));
    expect(href).toBe(`/${PROGRAM}/luyen-tap/doc/${q6.type_code}`);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`/luyen-tap/doc/${q6.type_code}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(`^${q6.type_code} · `) }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Trình làm bài" })).toBeVisible();
  });

  test("Hết giờ: tự nộp khi đồng hồ về 0 (tua 30 phút bằng page.clock)", async ({
    page,
    request,
  }) => {
    const truth = await fetchTruth(request);
    await page.clock.install();
    await startExam(page);
    await answer(page, 1, truth.correctOf(1));
    await answer(page, 2, truth.correctOf(2));

    const requestPromise = page.waitForRequest(
      (r) => r.url().endsWith(SUBMIT_URL) && r.method() === "POST",
    );
    await page.clock.fastForward("30:00");

    const apiRequest = await requestPromise;
    const sent = apiRequest.postDataJSON() as { timedOut: boolean; timeSpentMs: number };
    expect(sent.timedOut).toBe(true);
    expect(sent.timeSpentMs).toBeLessThanOrEqual(DURATION_SEC * 1000);

    await expect(resultHeading(page)).toBeVisible();
    const summary = page.getByRole("region", { name: "Kết quả bài làm" });
    await expect(summary).toContainText("Bài được tự động nộp vì hết giờ");
    await expect(summary).toContainText("10/100"); // 2/20
    await expect(summary).toContainText("Cấp (ước lượng)");
    await expect(summary).toContainText("Chưa đạt cấp");
    // Không hộp xác nhận nào hiện ra khi tự nộp.
    await expect(dialog(page)).toHaveCount(0);
  });

  test("Hết giờ khi tải lại: bài làm dở đã quá hạn được nộp luôn", async ({ page, request }) => {
    const truth = await fetchTruth(request);
    await startExam(page);
    await answer(page, 1, truth.correctOf(1));
    await expect.poll(() => countDrafts(page)).toBe(1);
    await shiftDraftStart(page, (DURATION_SEC + 60) * 1000);

    await page.reload();
    await expect(resultHeading(page)).toBeVisible();
    await expect(page.getByRole("region", { name: "Kết quả bài làm" })).toContainText(
      "Bài được tự động nộp vì hết giờ",
    );
    await expect(page.getByRole("region", { name: "Kết quả bài làm" })).toContainText("5/100"); // 1/20
  });

  test("Đồng hồ và nút Nộp bài luôn nhìn thấy (kể cả khi cuộn), không tràn ngang", async ({
    page,
  }, testInfo) => {
    await page.goto(LIST_URL);
    await expectNoHorizontalOverflow(page, "danh sách đề");
    await startExam(page);
    await expectNoHorizontalOverflow(page, "màn làm bài");

    const viewport = page.viewportSize()!;
    if (testInfo.project.name === "mobile") expect(viewport.width).toBe(375);
    else expect(viewport.width).toBe(1280);

    await expect(timer(page)).toBeInViewport();
    await expect(submitButton(page)).toBeInViewport();

    // Cuộn xuống cuối: thanh dính vẫn thấy đồng hồ và Nộp bài.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(timer(page)).toBeInViewport();
    await expect(submitButton(page)).toBeInViewport();

    // Vùng bấm đủ lớn (>= 44px) cho nút Nộp bài và đồng hồ không bị cắt.
    const box = await submitButton(page).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);

    // Bảng số câu mở được và không làm tràn ngang.
    await page.getByRole("button", { name: "Bảng câu hỏi" }).click();
    const nav = page.getByRole("navigation", { name: "Bảng số câu" });
    await expect(nav.getByRole("button")).toHaveCount(TOTAL);
    await expectNoHorizontalOverflow(page, "bảng số câu");
    await expect(submitButton(page)).toBeInViewport();

    // Chữ Hàn không vỡ giữa từ (word-break: keep-all) ở lệnh nhóm và phương án.
    await expect(runner(page).locator('p[lang="ko"]').first()).toHaveCSS("word-break", "keep-all");
    await expect(runner(page).locator('label [lang="ko"]').first()).toHaveCSS(
      "word-break",
      "keep-all",
    );

    // Hộp xác nhận vừa màn hình, hai nút bấm được.
    await submitButton(page).click();
    const confirm = dialog(page);
    await expect(confirm).toBeInViewport({ ratio: 1 });
    await expect(confirm.getByRole("button", { name: "Nộp bài" })).toBeInViewport();
    await expect(confirm.getByRole("button", { name: "Quay lại làm bài" })).toBeInViewport();
    await expectNoHorizontalOverflow(page, "hộp xác nhận");
  });

  test("Kết quả không tràn ngang và bảng điểm dùng được trên màn hình hiện tại", async ({
    page,
  }) => {
    await startExam(page);
    await submitButton(page).click();
    await dialog(page).getByRole("button", { name: "Nộp bài" }).click();
    await expect(resultHeading(page)).toBeVisible();
    await expectNoHorizontalOverflow(page, "trang kết quả");
    const summary = page.getByRole("region", { name: "Kết quả bài làm" });
    await expect(summary).toContainText("0/100");
    await expect(summary).toContainText("Chưa đạt cấp");
  });

  test("Bàn phím và ARIA: mũi tên, phím 1-4, hộp thoại nộp bài (Esc, vòng Tab, trả focus)", async ({
    page,
  }) => {
    await startExam(page);

    // Vùng, đồng hồ, bảng số câu, tiến độ có nhãn.
    await expect(runner(page)).toBeVisible();
    await expect(page.getByRole("timer")).toContainText("Thời gian còn lại");
    await expect(page.getByLabel(`Đã làm 0 trên ${TOTAL} câu`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Bảng câu hỏi" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(choicesOf(page, 1).getByRole("radio")).toHaveCount(4);

    // Mũi tên đổi phương án trong nhóm radio; phím 1-4 chọn theo vị trí.
    await radio(page, 1, "①").focus();
    await page.keyboard.press("ArrowRight");
    await expect(radio(page, 1, "②")).toBeChecked();
    await page.keyboard.press("4");
    await expect(radio(page, 1, "④")).toBeChecked();
    await page.keyboard.press("1");
    await expect(radio(page, 1, "①")).toBeChecked();
    await expect(radio(page, 1, "①")).toBeFocused();

    // Hộp thoại: modal, có tên/mô tả, focus vào "Quay lại làm bài".
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
    // Tab xoay vòng trong hộp.
    await page.keyboard.press("Tab");
    await expect(yes).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(back).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(yes).toBeFocused();
    // Phím số khi hộp mở không đổi đáp án.
    await page.keyboard.press("3");
    await expect(radio(page, 1, "①")).toBeChecked();
    // Esc đóng hộp và trả focus về nút đã mở.
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(opener).toBeFocused();

    // Bảng số câu dùng được bằng bàn phím: mỗi nút có tên đầy đủ.
    await page.getByRole("button", { name: "Bảng câu hỏi" }).press("Enter");
    const nav = page.getByRole("navigation", { name: "Bảng số câu" });
    await expect(nav.getByRole("button", { name: "Câu 1, đã làm" })).toBeVisible();
    await nav.getByRole("button", { name: /^Câu 2\b/ }).press("Enter");
    await expect(page.getByRole("heading", { level: 3, name: "Câu 2" })).toBeFocused();
  });

  test("API nộp bài: chấm đúng thang điểm/cấp quy đổi, từ chối đầu vào xấu", async ({
    request,
  }) => {
    const truth = await fetchTruth(request);
    const submit = async (correctCount: number) => {
      const answers: Record<string, string | null> = {};
      for (const q of truth.questions) {
        answers[q.questionId] = q.number <= correctCount ? q.correctLabel : null;
      }
      const response = await request.post(SUBMIT_URL, {
        data: { program: PROGRAM, kind: "mini", examId: "doc-01", answers },
      });
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      return (await response.json()) as {
        total_score: number;
        total_max_score: number;
        level: { label: string; is_estimate: boolean; compared_score: number };
      };
    };

    // [đúng, điểm/100, điểm so ngưỡng /300, cấp] — 20 câu: mỗi câu 5 điểm, sát từng ngưỡng cấp.
    const cases: [number, number, number, string][] = [
      [0, 0, 0, "Chưa đạt cấp"],
      [7, 35, 105, "Chưa đạt cấp"],
      [8, 40, 120, "3급"],
      [9, 45, 135, "3급"],
      [10, 50, 150, "4급"],
      [12, 60, 180, "4급"],
      [13, 65, 195, "5급"],
      [15, 75, 225, "5급"],
      [16, 80, 240, "6급"],
      [20, 100, 300, "6급"],
    ];
    for (const [correct, score, compared, label] of cases) {
      const result = await submit(correct);
      expect(result.total_score, `${correct} câu đúng`).toBe(score);
      expect(result.total_max_score).toBe(100);
      expect(result.level.compared_score, `${correct} câu đúng`).toBe(compared);
      expect(result.level.label, `${correct} câu đúng`).toBe(label);
      expect(result.level.is_estimate, "Mini test luôn là ước lượng").toBe(true);
    }

    const bad = await request.post(SUBMIT_URL, {
      data: {
        program: PROGRAM,
        kind: "mini",
        examId: "doc-01",
        answers: { [truth.questions[0].questionId]: "⑤" },
      },
    });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid_choice");

    const missing = await request.post(SUBMIT_URL, {
      data: { program: PROGRAM, kind: "mini", examId: "khong-ton-tai", answers: {} },
    });
    expect(missing.status()).toBe(404);
    expect((await missing.json()).error.code).toBe("exam_not_found");

    const notJson = await request.post(SUBMIT_URL, {
      headers: { "content-type": "application/json" },
      data: "{không phải json",
    });
    expect(notJson.status()).toBe(400);

    const getMethod = await request.get(SUBMIT_URL);
    expect(getMethod.status()).toBe(405);
  });
});
