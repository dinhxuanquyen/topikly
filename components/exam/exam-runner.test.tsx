import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamDraft } from "./exam-state";
import { ExamRunner } from "./exam-runner";
import * as store from "./exam-store";
import {
  EXAM,
  GROUP_STEM_1,
  GROUP_STEM_2,
  INSTRUCTION_1,
  INSTRUCTION_2,
  LISTENING_EXAM,
  LISTEN_INSTRUCTION_2,
  PLACEMENT_EXAM,
  PLACEMENT_RESULT,
  RESULT,
  SHARED_PASSAGE,
  SINGLE_STEM_1,
  SINGLE_STEM_2,
  withAudio,
} from "./test-fixtures";

vi.mock("./exam-store", () => ({
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
  loadLatestResult: vi.fn(),
  saveResult: vi.fn(),
  loadExamStatuses: vi.fn(),
}));

const fetchMock = vi.fn();

function respondOk(body: unknown = RESULT) {
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
}

function lastSubmitBody() {
  const call = fetchMock.mock.calls.at(-1)!;
  expect(call[0]).toBe("/api/exam/submit");
  return JSON.parse((call[1] as RequestInit).body as string);
}

function draftOf(partial: Partial<ExamDraft> = {}): ExamDraft {
  return {
    key: "topik-ii:mini:doc-01",
    group: "topik-ii:mini",
    program: "topik-ii",
    kind: "mini",
    examId: "doc-01",
    startedAt: Date.now(),
    answers: {},
    marked: [],
    blockIndex: 0,
    updatedAt: Date.now(),
    ...partial,
  };
}

const props = {
  exam: EXAM,
  listHref: "/topik-ii/de-thi/mini",
  practiceTypeCodes: ["R01", "R19"],
};

/** Với đồng hồ thật: chờ màn giới thiệu sẵn sàng rồi bấm Bắt đầu. */
async function renderAndStart() {
  render(<ExamRunner {...props} />);
  const start = await screen.findByRole("button", { name: /Bắt đầu làm bài/ });
  await waitFor(() => expect(start).toBeEnabled());
  fireEvent.click(start);
}

/** Với đồng hồ giả: act async xả hết microtask của các mock lưu trữ. */
async function renderWithFakeTimers() {
  await act(async () => {
    render(<ExamRunner {...props} />);
  });
}

function radiosOf(questionNumber: number) {
  return within(screen.getByRole("radiogroup", { name: `Câu ${questionNumber}: chọn đáp án` }));
}

function pick(questionNumber: number, label: string) {
  fireEvent.click(radiosOf(questionNumber).getByRole("radio", { name: new RegExp(`^${label}`) }));
}

function openSubmitDialog() {
  fireEvent.click(screen.getAllByRole("button", { name: "Nộp bài" })[0]!);
  return screen.getByRole("dialog", { name: "Nộp bài?" });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(store.loadDraft).mockResolvedValue(null);
  vi.mocked(store.loadLatestResult).mockResolvedValue(null);
  vi.mocked(store.saveDraft).mockResolvedValue(true);
  vi.mocked(store.clearDraft).mockResolvedValue(true);
  vi.mocked(store.saveResult).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ExamRunner: màn giới thiệu", () => {
  it("nêu số câu, thời gian, quy chế và nhãn đề mẫu; chỉ cho bắt đầu sau khi kiểm tra bài làm dở", async () => {
    render(<ExamRunner {...props} />);
    expect(screen.getByText("4 câu · 15 phút")).toBeInTheDocument();
    expect(screen.getByText(/Thời gian làm bài là 15 phút/)).toBeInTheDocument();
    expect(screen.getByText(/hết giờ, bài được tự động nộp/i)).toBeInTheDocument();
    expect(screen.getByText(/Đáp án và lời giải chỉ hiện sau khi nộp bài/)).toBeInTheDocument();
    expect(screen.getByText(/Đề mẫu đang chờ duyệt/)).toBeInTheDocument();
    const start = screen.getByRole("button", { name: /Bắt đầu làm bài/ });
    expect(start).toBeDisabled();
    await waitFor(() => expect(start).toBeEnabled());
    expect(screen.queryByRole("timer")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("có kết quả lần trước thì hiện nút xem lại kết quả đó", async () => {
    vi.mocked(store.loadLatestResult).mockResolvedValue(RESULT);
    render(<ExamRunner {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem kết quả lần gần nhất" }));
    expect(screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ExamRunner: hiển thị đề theo khối", () => {
  it("in lệnh nhóm một lần, ẩn stem câu đơn, hiện stem riêng câu trong bộ và ngữ liệu chung một lần", async () => {
    await renderAndStart();

    // Khối 1: hai câu đơn.
    expect(screen.getAllByText(INSTRUCTION_1)).toHaveLength(1);
    expect(screen.queryByText(SINGLE_STEM_1)).toBeNull();
    expect(screen.queryByText(SINGLE_STEM_2)).toBeNull();
    expect(screen.getByText("첫 번째 지문입니다.")).toBeInTheDocument();
    expect(screen.getByText("두 번째 지문입니다.")).toBeInTheDocument();
    expect(screen.queryByText(INSTRUCTION_2)).toBeNull();

    // Khối 2: bộ dùng chung ngữ liệu.
    fireEvent.click(screen.getByRole("button", { name: /Nhóm câu sau/ }));
    expect(screen.getAllByText(INSTRUCTION_2)).toHaveLength(1);
    expect(screen.getAllByText(SHARED_PASSAGE)).toHaveLength(1);
    expect(screen.getByText(GROUP_STEM_1)).toHaveAttribute("lang", "ko");
    expect(screen.getByText(GROUP_STEM_2)).toBeInTheDocument();
    expect(screen.queryByText(INSTRUCTION_1)).toBeNull();
  });

  it("không có đáp án hay lời giải trong DOM và không gọi API trước khi nộp", async () => {
    await renderAndStart();
    pick(1, "②");
    const { textContent } = document.body;
    expect(textContent).not.toMatch(/Đáp án đúng|Lời giải|Bản dịch|Kiểu bẫy/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("chọn, đổi và bỏ chọn đáp án; thanh tiến độ đếm câu đã làm", async () => {
    await renderAndStart();
    expect(screen.getByLabelText("Đã làm 0 trên 4 câu")).toBeInTheDocument();
    pick(1, "②");
    expect(radiosOf(1).getByRole("radio", { name: /^②/ })).toBeChecked();
    expect(screen.getByLabelText("Đã làm 1 trên 4 câu")).toBeInTheDocument();
    pick(1, "④");
    expect(radiosOf(1).getByRole("radio", { name: /^②/ })).not.toBeChecked();
    expect(radiosOf(1).getByRole("radio", { name: /^④/ })).toBeChecked();
    expect(screen.getByLabelText("Đã làm 1 trên 4 câu")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Bỏ chọn" })[0]!);
    expect(radiosOf(1).getByRole("radio", { name: /^④/ })).not.toBeChecked();
    expect(screen.getByLabelText("Đã làm 0 trên 4 câu")).toBeInTheDocument();
  });

  it("phím 1–4 chọn đáp án của câu đang có focus", async () => {
    await renderAndStart();
    const second = radiosOf(2).getByRole("radio", { name: /^①/ });
    act(() => second.focus());
    fireEvent.keyDown(second, { key: "3" });
    expect(radiosOf(2).getByRole("radio", { name: /^③/ })).toBeChecked();
    expect(radiosOf(1).queryByRole("radio", { checked: true })).toBeNull();
  });

  it("đánh dấu câu bật/tắt aria-pressed và hiện trên bảng số câu", async () => {
    await renderAndStart();
    const mark = screen.getAllByRole("button", { name: "Đánh dấu" })[0]!;
    fireEvent.click(mark);
    const marked = screen.getByRole("button", { name: "Bỏ đánh dấu" });
    expect(marked).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Bảng câu hỏi" }));
    expect(
      screen.getByRole("button", { name: /^Câu 1, chưa làm, đã đánh dấu/ }),
    ).toBeInTheDocument();
    fireEvent.click(marked);
    expect(
      screen.getByRole("button", { name: /^Câu 1, chưa làm/ }).getAttribute("aria-label"),
    ).not.toMatch(/đã đánh dấu/);
  });

  it("bảng số câu nhảy sang đúng khối và đúng câu", async () => {
    await renderAndStart();
    pick(1, "①");
    fireEvent.click(screen.getByRole("button", { name: "Bảng câu hỏi" }));
    expect(screen.getByRole("button", { name: /^Câu 1, đã làm/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Câu 4, chưa làm/ }));
    expect(screen.getAllByText(INSTRUCTION_2)).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3, name: "Câu 4" })).toHaveFocus(),
    );
  });
});

describe("ExamRunner: đề Nghe", () => {
  const NOTE = /^Đề nháp: chưa có audio\./;

  async function startListening(exam: typeof LISTENING_EXAM) {
    render(<ExamRunner {...props} exam={exam} />);
    const start = await screen.findByRole("button", { name: /Bắt đầu làm bài/ });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
  }

  it("đề chưa có audio: intro cảnh báo, lúc làm bài hiện lời thoại thay phần nghe, ghi chú một lần cho khối dùng chung", async () => {
    await startListening(LISTENING_EXAM);
    expect(screen.queryByTestId("audio-missing-notice")).toBeNull(); // đã qua màn giới thiệu

    // Khối 1: hai câu đơn, mỗi câu có lời thoại riêng nên mỗi câu một ghi chú.
    expect(screen.getAllByText("이 원피스 좀 맡기려고요.")).toHaveLength(2);
    expect(screen.getAllByText(NOTE)).toHaveLength(2);
    expect(screen.queryByText(/Chế độ luyện/)).toBeNull();
    expect(document.querySelector("audio")).toBeNull();

    // Khối 2: một bài nghe dùng chung cho cả cặp -> lời thoại và ghi chú chỉ một lần.
    fireEvent.click(screen.getByRole("button", { name: /Nhóm câu sau/ }));
    expect(screen.getAllByText(LISTEN_INSTRUCTION_2)).toHaveLength(1);
    expect(screen.getAllByText("이번 주말에 등산 갈래요?")).toHaveLength(1);
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it("màn giới thiệu cảnh báo đề chưa có audio trước khi bắt đầu", async () => {
    render(<ExamRunner {...props} exam={LISTENING_EXAM} />);
    expect(screen.getByTestId("audio-missing-notice")).toHaveTextContent("chưa có audio");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Bắt đầu làm bài/ })).toBeEnabled(),
    );
  });

  it("đề có đủ audio: không ghi chú đề nháp, không lộ lời thoại khi đang thi", async () => {
    await startListening(withAudio(LISTENING_EXAM));
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByText("이 원피스 좀 맡기려고요.")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Phát/ })).toHaveLength(2);
  });
});

describe("ExamRunner: nộp bài", () => {
  it("hộp xác nhận nêu số câu bỏ trống và số câu đánh dấu; Quay lại không nộp", async () => {
    await renderAndStart();
    pick(1, "②");
    fireEvent.click(screen.getAllByRole("button", { name: "Đánh dấu" })[1]!);

    const dialog = openSubmitDialog();
    expect(within(dialog).getByText("Còn 3 câu bỏ trống, sẽ tính là sai.")).toBeInTheDocument();
    expect(within(dialog).getByText("Bạn đang đánh dấu 1 câu để xem lại.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Quay lại làm bài" })).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Quay lại làm bài" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(radiosOf(1).getByRole("radio", { name: /^②/ })).toBeChecked();
  });

  it("Esc đóng hộp xác nhận", async () => {
    await renderAndStart();
    const dialog = openSubmitDialog();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("xác nhận thì POST đúng body (câu bỏ trống là null), hiện kết quả, xoá bản nháp và lưu kết quả", async () => {
    respondOk();
    await renderAndStart();
    pick(1, "②");
    const dialog = openSubmitDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Nộp bài" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Kết quả bài làm" }),
    ).toBeInTheDocument();
    const body = lastSubmitBody();
    expect(body).toMatchObject({
      program: "topik-ii",
      kind: "mini",
      examId: "doc-01",
      timedOut: false,
      answers: { "r01-0001": "②", "r03-0001": null, "r19-0001": null, "r20-0001": null },
    });
    expect(typeof body.startedAt).toBe("number");
    expect(body.timeSpentMs).toBeLessThanOrEqual(900_000);
    await waitFor(() => expect(store.saveResult).toHaveBeenCalledWith(RESULT));
    expect(store.clearDraft).toHaveBeenCalledWith("topik-ii", "mini", "doc-01");
  });

  it("lỗi mạng: giữ nguyên bài làm, báo lỗi và cho thử lại", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await renderAndStart();
    pick(1, "③");
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không kết nối được tới máy chủ");
    expect(radiosOf(1).getByRole("radio", { name: /^③/ })).toBeChecked();
    expect(store.clearDraft).not.toHaveBeenCalled();

    respondOk();
    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại nộp bài" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Kết quả bài làm" }),
    ).toBeInTheDocument();
    expect(lastSubmitBody().answers["r01-0001"]).toBe("③");
  });

  it("lỗi API trả thông báo tiếng Việt của máy chủ", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: "exam_not_found", message: "Không tìm thấy đề." } }),
    });
    await renderAndStart();
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy đề.");
  });

  it("Làm lại đề trên trang kết quả quay về màn giới thiệu", async () => {
    respondOk();
    await renderAndStart();
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));
    fireEvent.click(await screen.findByRole("button", { name: "Làm lại đề" }));
    expect(screen.getByRole("button", { name: /Bắt đầu làm bài/ })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Kết quả bài làm" })).toBeNull();
  });
});

describe("ExamRunner: đồng hồ đếm ngược", () => {
  async function startWithFakeTimers() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));
    await renderWithFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu làm bài/ }));
  }

  function advance(ms: number) {
    return act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it("đếm ngược theo duration_sec và lưu startedAt vào bản nháp", async () => {
    await startWithFakeTimers();
    expect(screen.getByRole("timer")).toHaveTextContent("15:00");
    await advance(61_000);
    expect(screen.getByRole("timer")).toHaveTextContent("13:59");
    expect(store.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "topik-ii:mini:doc-01",
        startedAt: new Date("2026-01-01T08:00:00Z").getTime(),
      }),
    );
  });

  it("cảnh báo (aria-live) khi còn 5 phút và 1 phút", async () => {
    await startWithFakeTimers();
    const live = screen.getByRole("status");
    expect(live).toBeEmptyDOMElement();

    await advance(600_000);
    expect(live).toHaveTextContent("Còn 5 phút");
    expect(live).toHaveAttribute("aria-live", "polite");

    await advance(240_000);
    expect(live).toHaveTextContent("Chỉ còn 1 phút");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hết giờ thì tự nộp với timedOut: true, giữ đáp án đã chọn, rồi hiện kết quả", async () => {
    respondOk({ ...RESULT, timedOut: true });
    await startWithFakeTimers();
    pick(1, "②");
    fireEvent.click(screen.getByRole("button", { name: /Nhóm câu sau/ }));
    pick(4, "④");

    await advance(899_000);
    expect(fetchMock).not.toHaveBeenCalled();
    await advance(1_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = lastSubmitBody();
    expect(body.timedOut).toBe(true);
    expect(body.timeSpentMs).toBe(900_000);
    expect(body.answers).toEqual({
      "r01-0001": "②",
      "r03-0001": null,
      "r19-0001": null,
      "r20-0001": "④",
    });
    expect(screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toBeInTheDocument();
    expect(screen.getByText("Bài được tự động nộp vì hết giờ.")).toBeInTheDocument();
  });

  it("hết giờ mà mạng lỗi: khoá đáp án, báo lỗi, không nộp lặp mỗi giây và cho thử lại với timedOut", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await startWithFakeTimers();
    pick(1, "②");
    await advance(900_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Đã hết giờ nhưng chưa nộp được bài");
    expect(radiosOf(1).getByRole("radio", { name: /^②/ })).toBeChecked();
    expect(radiosOf(1).getByRole("radio", { name: /^③/ })).toBeDisabled();

    await advance(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    respondOk();
    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại nộp bài" }));
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastSubmitBody().timedOut).toBe(true);
    expect(screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toBeInTheDocument();
  });
});

describe("ExamRunner: khôi phục tiến độ", () => {
  it("tải lại giữa chừng: tiếp tục đúng giờ, đáp án, đánh dấu và khối đang xem", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));
    vi.mocked(store.loadDraft).mockResolvedValue(
      draftOf({
        startedAt: Date.now() - 10 * 60_000,
        answers: { "r01-0001": "②", "r19-0001": "③" },
        marked: ["r19-0001", "khong-co-trong-de"],
        blockIndex: 1,
      }),
    );
    await renderWithFakeTimers();

    // Không qua màn giới thiệu; còn 5 phút.
    expect(screen.queryByRole("button", { name: /Bắt đầu làm bài/ })).toBeNull();
    expect(screen.getByRole("timer")).toHaveTextContent("05:00");
    expect(screen.getByText(/Đã khôi phục bài làm dở/)).toBeInTheDocument();
    expect(screen.getByLabelText("Đã làm 2 trên 4 câu")).toBeInTheDocument();

    // Khối 2 đang mở, câu 3 đã chọn ③ và được đánh dấu.
    expect(screen.getAllByText(INSTRUCTION_2)).toHaveLength(1);
    expect(radiosOf(3).getByRole("radio", { name: /^③/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Bỏ đánh dấu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Đồng hồ vẫn chạy tiếp từ mốc đã lưu và cảnh báo 5 phút phát ngay.
    expect(screen.getByRole("status")).toHaveTextContent("Còn 5 phút");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("04:30");

    // Câu 1 (khối trước) vẫn giữ đáp án.
    fireEvent.click(screen.getByRole("button", { name: /Nhóm câu trước/ }));
    expect(radiosOf(1).getByRole("radio", { name: /^②/ })).toBeChecked();
  });

  it("bản nháp đã quá giờ thì tự nộp ngay với timedOut: true", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));
    respondOk({ ...RESULT, timedOut: true });
    vi.mocked(store.loadDraft).mockResolvedValue(
      draftOf({ startedAt: Date.now() - 20 * 60_000, answers: { "r20-0001": "④" } }),
    );
    await renderWithFakeTimers();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = lastSubmitBody();
    expect(body.timedOut).toBe(true);
    expect(body.timeSpentMs).toBe(900_000);
    expect(body.answers["r20-0001"]).toBe("④");
    expect(screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toBeInTheDocument();
  });

  it("không lưu được bản nháp (thiếu IndexedDB): vẫn làm bài được và báo nhẹ cho người học", async () => {
    vi.mocked(store.saveDraft).mockResolvedValue(false);
    await renderAndStart();
    pick(1, "②");
    expect(await screen.findByText(/Không lưu tạm được bài làm/)).toBeInTheDocument();
    expect(radiosOf(1).getByRole("radio", { name: /^②/ })).toBeChecked();
  });
});

describe("ExamRunner: Test trình độ", () => {
  const placementProps = { exam: PLACEMENT_EXAM, listHref: "/topik-ii/lo-trinh", passRatio: 0.6 };

  it("nộp với kind placement, hiện kết quả trình độ, lưu và làm lại về màn giới thiệu", async () => {
    respondOk(PLACEMENT_RESULT);
    render(<ExamRunner {...placementProps} />);
    expect(screen.getByText(/Các câu xếp từ dễ đến khó/)).toBeInTheDocument();
    expect(store.loadLatestResult).toHaveBeenCalledWith("topik-ii", "placement", "doc-01");
    const start = await screen.findByRole("button", { name: /Bắt đầu làm bài/ });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    fireEvent.click(within(openSubmitDialog()).getByRole("button", { name: "Nộp bài" }));

    const heading = await screen.findByRole("heading", { level: 2, name: "Kết quả Test trình độ" });
    expect(heading).toHaveFocus();
    expect(lastSubmitBody()).toMatchObject({ kind: "placement", examId: "doc-01" });
    expect(document.body).toHaveTextContent("làm đúng từ 60% số câu");
    await waitFor(() => expect(store.saveResult).toHaveBeenCalledWith(PLACEMENT_RESULT));
    expect(store.clearDraft).toHaveBeenCalledWith("topik-ii", "placement", "doc-01");

    fireEvent.click(screen.getByRole("button", { name: /Làm lại test/ }));
    expect(screen.getByRole("button", { name: /Bắt đầu làm bài/ })).toBeEnabled();
  });

  it("mở lại kết quả đã lưu từ màn giới thiệu", async () => {
    vi.mocked(store.loadLatestResult).mockResolvedValue(PLACEMENT_RESULT);
    render(<ExamRunner {...placementProps} />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem kết quả lần gần nhất" }));
    expect(screen.getByTestId("placement-start")).toHaveTextContent("3급");
  });
});
