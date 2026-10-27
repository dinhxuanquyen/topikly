import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamDraft } from "./exam-state";
import { ExamRunner } from "./exam-runner";
import * as store from "./exam-store";
import { WRITING_EXAM, WRITING_RESULT } from "./test-fixtures";

vi.mock("./exam-store", () => ({
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
  loadLatestAttempt: vi.fn(),
  saveResult: vi.fn(),
  saveSelfPoints: vi.fn(),
  stashDraft: vi.fn(),
  loadExamStatuses: vi.fn(),
}));

const fetchMock = vi.fn();

function respondOk(body: unknown = WRITING_RESULT) {
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
}

function lastSubmitBody() {
  const call = fetchMock.mock.calls.at(-1)!;
  expect(call[0]).toBe("/api/exam/submit");
  return JSON.parse((call[1] as RequestInit).body as string);
}

const props = {
  exam: WRITING_EXAM,
  listHref: "/topik-ii/de-thi/mini",
  practiceTypeCodes: [] as string[],
};

async function renderAndStart() {
  render(<ExamRunner {...props} />);
  const start = await screen.findByRole("button", { name: /Bắt đầu làm bài/ });
  await waitFor(() => expect(start).toBeEnabled());
  fireEvent.click(start);
}

/** Mở bảng câu hỏi rồi nhảy tới câu có số `n` (51~54). */
function gotoNumber(n: number) {
  const toggle = screen.getByRole("button", { name: "Bảng câu hỏi" });
  if (toggle.getAttribute("aria-expanded") !== "true") fireEvent.click(toggle);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Câu ${n},`) }));
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openSubmitDialog() {
  fireEvent.click(screen.getAllByRole("button", { name: "Nộp bài" })[0]!);
  return screen.getByRole("dialog", { name: "Nộp bài?" });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(store.loadDraft).mockResolvedValue(null);
  vi.mocked(store.loadLatestAttempt).mockResolvedValue(null);
  vi.mocked(store.saveDraft).mockResolvedValue(true);
  vi.mocked(store.clearDraft).mockResolvedValue(true);
  vi.mocked(store.saveResult).mockResolvedValue(true);
  vi.mocked(store.saveSelfPoints).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ExamRunner Viết: màn giới thiệu", () => {
  it("nêu 4 câu, 50 phút, ghi chú tự chấm bằng bài mẫu chưa chấm AI; không dùng quy chế của trắc nghiệm", async () => {
    render(<ExamRunner {...props} />);
    expect(screen.getByText("4 câu · 50 phút")).toBeInTheDocument();
    expect(screen.getByTestId("writing-self-score-note")).toHaveTextContent(
      "Phần Viết tự chấm bằng bài mẫu, chưa chấm AI.",
    );
    expect(screen.getByText(/Thời gian làm bài là 50 phút/)).toBeInTheDocument();
    expect(screen.getByText(/Số ký tự tính cả khoảng trắng/)).toBeInTheDocument();
    expect(screen.getByText("Câu Viết bỏ trống được tính 0 điểm khi tự chấm.")).toBeInTheDocument();
    expect(screen.queryByText(/Mỗi câu chỉ có một đáp án đúng/)).toBeNull();
    expect(screen.queryByText(/Mỗi bài nghe/)).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Bắt đầu làm bài/ })).toBeEnabled(),
    );
  });
});

describe("ExamRunner Viết: làm bài", () => {
  it("câu đầu là câu 51 (số thật suy từ type_code), ô điền theo nhãn chỗ trống, có đoạn văn ㉠ ㉡", async () => {
    await renderAndStart();
    expect(screen.getByRole("heading", { level: 2, name: "Câu 51" })).toBeInTheDocument();
    expect(screen.getByText(/다음 글의 ㉠과 ㉡에 알맞은 말을/)).toBeInTheDocument();
    expect(screen.getByLabelText("Ô điền ㉠")).toBeInTheDocument();
    expect(screen.getByLabelText("Ô điền ㉡")).toBeInTheDocument();
    expect(screen.getByText("( ㉠ )")).toBeInTheDocument();
    // Ô điền chặn theo hằng số của backend.
    expect(screen.getByLabelText("Ô điền ㉠")).toHaveAttribute("maxlength", "500");
    // Không lộ bài mẫu / đáp án ở client.
    expect(document.body.textContent).not.toMatch(/참석할 수 없습니다|Đáp án đạt điểm tối đa/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("thanh tiến độ và bảng số câu tính câu Viết đã làm khi có nội dung", async () => {
    await renderAndStart();
    expect(screen.getByLabelText("Đã làm 0 trên 4 câu")).toBeInTheDocument();
    type("Ô điền ㉠", "   ");
    expect(screen.getByLabelText("Đã làm 0 trên 4 câu")).toBeInTheDocument();
    type("Ô điền ㉠", "참석할 수 없습니다.");
    expect(screen.getByLabelText("Đã làm 1 trên 4 câu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bảng câu hỏi" }));
    expect(screen.getByRole("button", { name: /^Câu 51, đã làm/ })).toBeInTheDocument();
    for (const n of [52, 53, 54]) {
      expect(screen.getByRole("button", { name: new RegExp(`^Câu ${n}, chưa làm`) })).toBeVisible();
    }
  });

  it("câu essay: ô lớn có nhãn, maxLength, bộ đếm ký tự đổi trạng thái dưới / đạt / vượt khung", async () => {
    await renderAndStart();
    gotoNumber(53);
    const area = await screen.findByLabelText("Bài viết của bạn");
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toHaveAttribute("maxlength", "5000");
    expect(screen.getByRole("heading", { level: 2, name: "Câu 53" })).toBeInTheDocument();
    // Biểu đồ + ghi chú số liệu giả định dùng lại từ màn Luyện tập Viết.
    expect(screen.getByText(/Số liệu giả định/)).toBeInTheDocument();

    // Khung của fixture: 10–20 ký tự.
    expect(screen.getByText("0 ký tự")).toBeInTheDocument();
    expect(screen.getAllByText("Chưa đủ, cần ít nhất 10 ký tự").length).toBeGreaterThan(0);
    fireEvent.change(area, { target: { value: "가나다라마바사아자차" } });
    expect(screen.getByText("10 ký tự")).toBeInTheDocument();
    expect(screen.getAllByText("Trong khung ký tự").length).toBeGreaterThan(0);
    fireEvent.change(area, { target: { value: "가나다라마 바사아자차카타파하 거너더러머" } });
    expect(screen.getAllByText("Vượt quá 20 ký tự").length).toBeGreaterThan(0);
    // Xuống dòng không tính vào số ký tự.
    fireEvent.change(area, { target: { value: "가나\n다라" } });
    expect(screen.getByText("4 ký tự")).toBeInTheDocument();
    expect(area).toHaveAccessibleDescription(/ký tự/);
  });

  it("nút chuyển câu dùng nhãn 'Câu trước/Câu sau' và giữ nguyên nội dung đã gõ", async () => {
    await renderAndStart();
    type("Ô điền ㉠", "đáp án một");
    fireEvent.click(screen.getByRole("button", { name: /Câu sau/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Câu 52" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Câu trước/ }));
    expect(screen.getByLabelText("Ô điền ㉠")).toHaveValue("đáp án một");
  });

  it("đánh dấu câu Viết hiện trên bảng số câu", async () => {
    await renderAndStart();
    fireEvent.click(screen.getByRole("button", { name: "Đánh dấu" }));
    fireEvent.click(screen.getByRole("button", { name: "Bảng câu hỏi" }));
    expect(
      screen.getByRole("button", { name: /^Câu 51, chưa làm, đã đánh dấu/ }),
    ).toBeInTheDocument();
  });

  it("gõ số 1–4 trong ô nhập không bị coi là phím chọn đáp án", async () => {
    await renderAndStart();
    const input = screen.getByLabelText("Ô điền ㉠");
    fireEvent.keyDown(input, { key: "1" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });
});

describe("ExamRunner Viết: bản nháp (chế độ khách)", () => {
  it("lưu bài Viết vào bản nháp sau khi ngừng gõ", async () => {
    await renderAndStart();
    await waitFor(() => expect(store.saveDraft).toHaveBeenCalled());
    vi.mocked(store.saveDraft).mockClear();

    type("Ô điền ㉠", "참석할 수 없습니다.");
    type("Ô điền ㉡", "미리");
    await waitFor(
      () =>
        expect(store.saveDraft).toHaveBeenLastCalledWith(
          expect.objectContaining({
            examId: "viet-01",
            writing: { "w51-0001": { blanks: { "㉠": "참석할 수 없습니다.", "㉡": "미리" } } },
          }),
        ),
      { timeout: 2000 },
    );
    // Gộp lần gõ: hai lần gõ liên tiếp không ghi hai lần ngay.
    expect(vi.mocked(store.saveDraft).mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("khôi phục bài Viết và đúng câu đang xem khi mở lại", async () => {
    const draft: ExamDraft = {
      key: "topik-ii:mini:viet-01",
      group: "topik-ii:mini",
      program: "topik-ii",
      kind: "mini",
      examId: "viet-01",
      startedAt: Date.now() - 60_000,
      answers: {},
      marked: [],
      writing: {
        "w51-0001": { blanks: { "㉠": "đã lưu ㉠" } },
        "w53-0002": { text: "bài đã lưu" },
      },
      blockIndex: 2,
      updatedAt: Date.now(),
    };
    vi.mocked(store.loadDraft).mockResolvedValue(draft);
    render(<ExamRunner {...props} />);
    expect(await screen.findByLabelText("Bài viết của bạn")).toHaveValue("bài đã lưu");
    expect(screen.getByText(/Đã khôi phục bài làm dở/)).toBeInTheDocument();
    expect(screen.getByLabelText("Đã làm 2 trên 4 câu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Câu trước/ }));
    fireEvent.click(screen.getByRole("button", { name: /Câu trước/ }));
    expect(screen.getByLabelText("Ô điền ㉠")).toHaveValue("đã lưu ㉠");
  });

  it("ghi nốt bản nháp khi rời trang lúc đang gõ dở", async () => {
    await renderAndStart();
    await waitFor(() => expect(store.saveDraft).toHaveBeenCalled());
    vi.mocked(store.saveDraft).mockClear();
    type("Ô điền ㉠", "gõ dở");
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(store.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ writing: { "w51-0001": { blanks: { "㉠": "gõ dở" } } } }),
    );
  });
});

describe("ExamRunner Viết: nộp bài", () => {
  it("hộp xác nhận đếm đúng câu bỏ trống gồm cả Viết và cảnh báo câu điền dở", async () => {
    await renderAndStart();
    type("Ô điền ㉠", "chỉ điền một chỗ");
    gotoNumber(53);
    fireEvent.change(await screen.findByLabelText("Bài viết của bạn"), {
      target: { value: "bài viết" },
    });

    const dialog = openSubmitDialog();
    expect(
      within(dialog).getByText("Còn 2 câu bỏ trống, sẽ không được tính điểm."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("1 câu điền chỗ trống mới điền một phần.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("đã làm hết thì hộp xác nhận báo đã làm tất cả các câu", async () => {
    await renderAndStart();
    type("Ô điền ㉠", "a");
    type("Ô điền ㉡", "b");
    gotoNumber(52);
    type("Ô điền ㉠", "c");
    type("Ô điền ㉡", "d");
    gotoNumber(53);
    fireEvent.change(await screen.findByLabelText("Bài viết của bạn"), { target: { value: "e" } });
    gotoNumber(54);
    fireEvent.change(await screen.findByLabelText("Bài viết của bạn"), { target: { value: "f" } });
    const dialog = openSubmitDialog();
    expect(within(dialog).getByText("Bạn đã làm tất cả các câu.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/chỗ trống mới điền một phần/)).toBeNull();
  });

  it("POST đúng body: answers rỗng, writing theo hình dạng từng câu; hiện kết quả và lưu kết quả", async () => {
    respondOk();
    await renderAndStart();
    type("Ô điền ㉠", "참석할 수 없습니다.");
    type("Ô điền ㉡", "미리 말씀드립니다");
    gotoNumber(53);
    fireEvent.change(await screen.findByLabelText("Bài viết của bạn"), {
      target: { value: "한국어 글" },
    });

    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Kết quả bài làm" }),
    ).toBeInTheDocument();

    expect(lastSubmitBody()).toMatchObject({
      program: "topik-ii",
      kind: "mini",
      examId: "viet-01",
      timedOut: false,
      answers: {},
      writing: {
        "w51-0001": { blanks: { "㉠": "참석할 수 없습니다.", "㉡": "미리 말씀드립니다" } },
        "w52-0001": { blanks: { "㉠": "", "㉡": "" } },
        "w53-0002": { text: "한국어 글" },
        "w54-0001": { text: "" },
      },
    });
    await waitFor(() => expect(store.saveResult).toHaveBeenCalledWith(WRITING_RESULT));
    expect(store.clearDraft).toHaveBeenCalledWith("topik-ii", "mini", "viet-01");
  });

  it("invalid_writing_answer: báo bài Viết chưa hợp lệ kèm lý do của máy chủ, giữ nguyên bài và cho thử lại", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: "invalid_writing_answer",
          message: "Câu w53-0002 (W53): bài viết quá dài (tối đa 5000 ký tự).",
        },
      }),
    });
    await renderAndStart();
    gotoNumber(53);
    fireEvent.change(await screen.findByLabelText("Bài viết của bạn"), {
      target: { value: "bài của tôi" },
    });
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Bài Viết chưa hợp lệ");
    expect(alert).toHaveTextContent("bài viết quá dài (tối đa 5000 ký tự)");
    expect(screen.getByLabelText("Bài viết của bạn")).toHaveValue("bài của tôi");
    expect(store.clearDraft).not.toHaveBeenCalled();
    expect(within(alert).getByRole("button", { name: "Thử lại nộp bài" })).toBeInTheDocument();
  });

  it("khoá ô viết khi đang nộp (chỉ đọc) để nội dung gửi đi không đổi giữa chừng", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    fetchMock.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await renderAndStart();
    type("Ô điền ㉠", "a");
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));
    await waitFor(() => expect(screen.getByLabelText("Ô điền ㉠")).toHaveAttribute("readonly"));
    await act(async () => {
      resolve({ ok: true, status: 200, json: async () => WRITING_RESULT });
    });
    expect(
      await screen.findByRole("heading", { level: 2, name: "Kết quả bài làm" }),
    ).toBeInTheDocument();
  });
});

describe("ExamRunner Viết: tự chấm sau khi nộp", () => {
  async function submitEmpty() {
    respondOk();
    await renderAndStart();
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));
    await screen.findByRole("heading", { level: 2, name: "Kết quả bài làm" });
  }

  it("chưa tự chấm thì báo trạng thái, nhập điểm thì cập nhật điểm Viết /100 và cấp ước lượng, rồi lưu", async () => {
    await submitEmpty();
    const summary = screen.getByTestId("writing-summary");
    expect(within(summary).getByText("Chưa tự chấm")).toBeInTheDocument();
    expect(within(summary).queryByText(/급/)).toBeNull();

    const card = screen.getByTestId("writing-review-w53-0002");
    fireEvent.change(within(card).getByLabelText("Tự chấm (ước lượng)"), {
      target: { value: "20" },
    });
    await waitFor(() =>
      expect(store.saveSelfPoints).toHaveBeenCalledWith(WRITING_RESULT, { "w53-0002": 20 }),
    );

    const card54 = screen.getByTestId("writing-review-w54-0001");
    fireEvent.change(within(card54).getByLabelText("Tự chấm (ước lượng)"), {
      target: { value: "50" },
    });
    // 70/100 -> 210/300 -> 5급.
    expect(within(summary).getByText("70")).toBeInTheDocument();
    expect(within(summary).getByText("/100")).toBeInTheDocument();
    expect(summary).toHaveTextContent("5급");
    expect(summary).toHaveTextContent("chưa chấm AI");
    await waitFor(() =>
      expect(store.saveSelfPoints).toHaveBeenLastCalledWith(WRITING_RESULT, {
        "w53-0002": 20,
        "w54-0001": 50,
      }),
    );
  });

  it("mở lại kết quả đã lưu từ màn giới thiệu thì điểm tự chấm vẫn còn", async () => {
    vi.mocked(store.loadLatestAttempt).mockResolvedValue({
      result: WRITING_RESULT,
      selfPoints: { "w51-0001": 10, "w52-0001": 10, "w53-0002": 20, "w54-0001": 30 },
    });
    render(<ExamRunner {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem kết quả lần gần nhất" }));
    const summary = screen.getByTestId("writing-summary");
    expect(within(summary).getByText("70")).toBeInTheDocument();
    expect(summary).toHaveTextContent("5급");
    const card = screen.getByTestId("writing-review-w54-0001");
    expect(within(card).getByLabelText("Tự chấm (ước lượng)")).toHaveValue(30);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ExamRunner Viết: không mất chữ khi tải lại ngay sau khi gõ", () => {
  it("sao đồng bộ bản nháp ngay khi gõ, không chờ gộp lần gõ của IndexedDB", async () => {
    await renderAndStart();
    await waitFor(() => expect(store.saveDraft).toHaveBeenCalled());
    vi.mocked(store.stashDraft).mockClear();
    vi.mocked(store.saveDraft).mockClear();

    type("Ô điền ㉠", "vừa gõ");
    // Ngay sau sự kiện gõ (chưa hết 400ms): localStorage đã có bản sao, IndexedDB thì chưa.
    expect(store.stashDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        examId: "viet-01",
        writing: { "w51-0001": { blanks: { "㉠": "vừa gõ" } } },
      }),
    );
    expect(store.saveDraft).not.toHaveBeenCalled();
  });

  it("pagehide và ẩn tab đều sao đồng bộ rồi ghi IndexedDB", async () => {
    await renderAndStart();
    await waitFor(() => expect(store.saveDraft).toHaveBeenCalled());
    type("Ô điền ㉠", "gõ dở");
    vi.mocked(store.stashDraft).mockClear();
    vi.mocked(store.saveDraft).mockClear();
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(store.stashDraft).toHaveBeenCalledTimes(1);
    expect(store.saveDraft).toHaveBeenCalledTimes(1);

    type("Ô điền ㉠", "gõ tiếp");
    vi.mocked(store.saveDraft).mockClear();
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(store.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        writing: { "w51-0001": { blanks: { "㉠": "gõ tiếp" } } },
      }),
    );
    visibility.mockRestore();
  });

  it("chưa gõ gì thì không sao localStorage (chỉ bài Viết đang gõ mới cần)", async () => {
    await renderAndStart();
    await waitFor(() => expect(store.saveDraft).toHaveBeenCalled());
    expect(store.stashDraft).not.toHaveBeenCalled();
  });
});

describe("ExamRunner Viết: nhãn nút chuyển câu và dán quá dài", () => {
  it("câu đầu tiên: nút lùi (đang tắt) vẫn nhãn 'Câu trước', không phải 'Nhóm câu trước'", async () => {
    await renderAndStart();
    expect(screen.getByRole("button", { name: /Câu trước/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Nhóm câu/ })).toBeNull();
    gotoNumber(54);
    expect(await screen.findByRole("button", { name: /Câu trước/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Câu sau/ })).toBeNull();
  });

  it("dán bài dài hơn giới hạn thì báo phần dư đã bị cắt, sửa lại dưới giới hạn thì tắt báo", async () => {
    await renderAndStart();
    gotoNumber(53);
    const area = await screen.findByLabelText("Bài viết của bạn");
    expect(screen.queryByText(/phần dư đã bị cắt/)).toBeNull();
    fireEvent.paste(area, { clipboardData: { getData: () => "가".repeat(5001) } });
    expect(
      screen.getByText("Nội dung dán dài hơn giới hạn 5000 ký tự nên phần dư đã bị cắt."),
    ).toBeVisible();
    fireEvent.change(area, { target: { value: "ngắn" } });
    expect(screen.queryByText(/phần dư đã bị cắt/)).toBeNull();

    // Dán vừa đủ thì không báo.
    fireEvent.paste(area, { clipboardData: { getData: () => "가".repeat(10) } });
    expect(screen.queryByText(/phần dư đã bị cắt/)).toBeNull();
  });

  it("ô chỗ trống dùng giới hạn 500 ký tự", async () => {
    await renderAndStart();
    fireEvent.paste(screen.getByLabelText("Ô điền ㉠"), {
      clipboardData: { getData: () => "가".repeat(501) },
    });
    expect(screen.getByText(/giới hạn 500 ký tự/)).toBeInTheDocument();
  });
});
