import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckResponse, PublicQuestion } from "@/lib/practice/types";
import type { ProgressRecord } from "./guest-stats";
import * as store from "./guest-store";
import { PracticeRunner } from "./practice-runner";

vi.mock("./guest-store", () => ({
  loadProgressForType: vi.fn(),
  recordAnswer: vi.fn(),
  setMarked: vi.fn(),
}));

const QUESTION_1: PublicQuestion = {
  id: "r10-0001",
  program: "topik-ii",
  type_code: "R10",
  skill: "reading",
  subskill: "chart_reading",
  difficulty: 4,
  stem: "다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
  passage: "주말에 비가 <u>올까 봐</u> 캠핑 대신 실내 전시회에 가기로 했다.",
  chart_data: [
    {
      chart_type: "bar",
      title: "퇴근 후 가장 많이 하는 활동",
      unit: "%",
      series: [{ name: "20대", points: [{ x: "휴식", y: 31 }] }],
    },
  ],
  data_is_fictional: true,
  choices: [
    { label: "①", text: "첫째 선택지" },
    { label: "②", text: "둘째 선택지" },
    { label: "③", text: "셋째 선택지" },
    { label: "④", text: "넷째 선택지" },
  ],
};

const QUESTION_2: PublicQuestion = {
  ...QUESTION_1,
  id: "r10-0002",
  chart_data: undefined,
  data_is_fictional: undefined,
  passage: "두 번째 문제의 지문입니다.",
};

function checkResponse(partial: Partial<CheckResponse> = {}): CheckResponse {
  return {
    questionId: "r10-0001",
    correct: true,
    selectedLabel: "③",
    correctLabel: "③",
    explanation_vi: "**Đáp án ③.** Căn cứ trên biểu đồ.\nDòng thứ hai của lời giải.",
    choices: [
      {
        label: "①",
        correct: false,
        note_vi: "Sai vì chữ 모두.",
        trap: "overgeneralization",
        trap_name_vi: "Khái quát hoá quá mức",
      },
      {
        label: "②",
        correct: false,
        note_vi: "Đảo chiều so sánh.",
        trap: "detail_swap",
        trap_name_vi: "Đổi chi tiết",
      },
      { label: "③", correct: true },
      {
        label: "④",
        correct: false,
        note_vi: "Hai hạng mục sát nhau.",
        trap: "detail_swap",
        trap_name_vi: "Đổi chi tiết",
      },
    ],
    ...partial,
  };
}

const fetchMock = vi.fn();

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function lastRequestBody() {
  const call = fetchMock.mock.calls.at(-1)!;
  return JSON.parse((call[1] as RequestInit).body as string);
}

function choose(label: string) {
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(label) }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(store.loadProgressForType).mockResolvedValue([]);
  vi.mocked(store.recordAnswer).mockResolvedValue(true);
  vi.mocked(store.setMarked).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PracticeRunner: giao diện làm bài", () => {
  it("có radiogroup 'Chọn đáp án' với 4 phương án ①–④, nút Nộp bài, Đánh dấu và đồng hồ", () => {
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    const group = screen.getByRole("radiogroup", { name: "Chọn đáp án" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /^③ 셋째 선택지$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Đánh dấu" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    // chỉ một câu: không có điều hướng câu
    expect(screen.queryByRole("navigation", { name: "Danh sách câu" })).toBeNull();
  });

  it("hiển thị đề: lệnh đề, ngữ liệu có gạch chân, biểu đồ kèm bảng số liệu và ghi chú số liệu giả định", () => {
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    expect(screen.getByText("다음 글 또는 그래프의 내용과 같은 것을 고르십시오.")).toHaveAttribute(
      "lang",
      "ko",
    );
    expect(document.querySelector("u")?.textContent).toBe("올까 봐");
    expect(screen.getByRole("img", { name: /Biểu đồ cột: 퇴근 후/ })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /퇴근 후 가장 많이 하는 활동/ })).toBeInTheDocument();
    expect(screen.getByText("Số liệu giả định, chỉ dùng để luyện tập.")).toBeInTheDocument();
  });

  it("không có đáp án hay lời giải trong DOM trước khi nộp", () => {
    const { container } = render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    expect(container.textContent).not.toMatch(/Đáp án đúng|Lời giải|Căn cứ/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("phím 1–4 chọn phương án tương ứng", () => {
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    fireEvent.keyDown(document.body, { key: "3" });
    expect(screen.getByRole("radio", { name: /③/ })).toBeChecked();
    fireEvent.keyDown(document.body, { key: "1" });
    expect(screen.getByRole("radio", { name: /①/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /③/ })).not.toBeChecked();
    fireEvent.keyDown(document.body, { key: "5" });
    expect(screen.getByRole("radio", { name: /①/ })).toBeChecked();
    // phím có Ctrl không bị chiếm
    fireEvent.keyDown(document.body, { key: "2", ctrlKey: true });
    expect(screen.getByRole("radio", { name: /①/ })).toBeChecked();
  });

  it("Đánh dấu bật/tắt aria-pressed và lưu vào chế độ khách", () => {
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    const mark = screen.getByRole("button", { name: "Đánh dấu" });
    fireEvent.click(mark);
    expect(mark).toHaveAttribute("aria-pressed", "true");
    expect(store.setMarked).toHaveBeenLastCalledWith(
      { program: "topik-ii", questionId: "r10-0001", type_code: "R10", skill: "reading" },
      true,
    );
    fireEvent.click(mark);
    expect(mark).toHaveAttribute("aria-pressed", "false");
    expect(store.setMarked).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it("đồng hồ đếm giây khi đang làm và dừng khi tạm dừng", () => {
    vi.useFakeTimers();
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:03");

    fireEvent.click(screen.getByRole("button", { name: "Tạm dừng đồng hồ" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:03");
  });
});

describe("PracticeRunner: nộp bài", () => {
  it("chọn ③ rồi Nộp: gọi API đúng body, hiện Đúng + lời giải, khoá lựa chọn, chuyển focus", async () => {
    respondWith(checkResponse());
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    choose("③");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    const heading = await screen.findByRole("heading", { name: "Đúng", level: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/practice/check");
    expect(lastRequestBody()).toMatchObject({
      program: "topik-ii",
      questionId: "r10-0001",
      selectedLabel: "③",
      timeSpentMs: expect.any(Number),
    });

    const region = screen.getByRole("region", { name: "Kết quả câu hỏi" });
    expect(region).toContainElement(heading);
    expect(region).toHaveFocus();
    // lời giải: **đậm** thành <strong>, mỗi dòng một đoạn
    expect(within(region).getByText("Đáp án ③.").tagName).toBe("STRONG");
    expect(within(region).getByText("Dòng thứ hai của lời giải.")).toBeInTheDocument();
    expect(region.innerHTML).not.toContain("**");

    // khoá lựa chọn và nút Nộp biến mất
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Nộp bài" })).toBeNull();
    expect(screen.getByText("③ Bạn chọn, đúng")).toBeInTheDocument();

    // lưu chế độ khách
    await waitFor(() => expect(store.recordAnswer).toHaveBeenCalledTimes(1));
    expect(store.recordAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        program: "topik-ii",
        questionId: "r10-0001",
        type_code: "R10",
        skill: "reading",
        selectedLabel: "③",
        correct: true,
      }),
    );
    expect(await screen.findByText(/lưu tạm trên thiết bị này/)).toBeInTheDocument();
  });

  it("chọn sai: hiện Sai, đáp án đúng, ghi chú và tên kiểu bẫy ở từng phương án nhiễu", async () => {
    respondWith(checkResponse({ correct: false, selectedLabel: "①" }));
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    choose("①");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    expect(await screen.findByRole("heading", { name: "Sai", level: 2 })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Kết quả câu hỏi" })).getByText(/Đáp án đúng là ③/),
    ).toBeInTheDocument();
    expect(screen.getByText("③ Đáp án đúng")).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Sai vì chữ 모두."),
    ).toBeInTheDocument();
    expect(screen.getByText("Kiểu bẫy: Khái quát hoá quá mức")).toBeInTheDocument();
    expect(screen.getByText("① Bạn chọn, sai")).toBeInTheDocument();
    // phương án nhiễu được mô tả cho trình đọc màn hình
    expect(screen.getByRole("radio", { name: /①/ })).toHaveAccessibleDescription(/Sai vì chữ 모두/);
    await waitFor(() =>
      expect(store.recordAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ selectedLabel: "①", correct: false }),
      ),
    );
  });

  it("câu Nghe: transcript hiện trước khi nộp, bản dịch chỉ hiện sau khi nộp", async () => {
    const listening: PublicQuestion = {
      ...QUESTION_1,
      id: "l01-0001",
      type_code: "L01",
      skill: "listening",
      passage: undefined,
      chart_data: undefined,
      audio_url: null,
      transcript_ko: "여자: 이 원피스 좀 맡기려고요.\n남자: 네, 그럼요.",
      speakers: [
        { label: "여자", gender: "female" },
        { label: "남자", gender: "male" },
      ],
      choices: [
        { label: "①", text: "", image_desc: "Tranh một" },
        { label: "②", text: "", image_desc: "Tranh hai" },
        { label: "③", text: "", image_desc: "Tranh ba" },
        { label: "④", text: "", image_desc: "Tranh bốn" },
      ],
      image_desc: "Bối cảnh chung của bốn tranh.",
      image_url: null,
    };
    respondWith(
      checkResponse({
        questionId: "l01-0001",
        transcript_vi: "Nữ: Cháu muốn gửi chiếc váy này.\nNam: Vâng, được chứ.",
      }),
    );
    render(<PracticeRunner program="topik-ii" questions={[listening]} />);

    expect(screen.getByText("Chế độ luyện: chưa có audio, đọc lời thoại.")).toBeInTheDocument();
    expect(screen.getByText("이 원피스 좀 맡기려고요.").closest("[lang]")).toHaveAttribute(
      "lang",
      "ko",
    );
    expect(screen.getAllByText("Tranh minh hoạ đang được vẽ — mô tả:")).toHaveLength(5);
    // phương án là hình: tên truy cập lấy từ mô tả
    expect(screen.getByRole("radio", { name: "③ Tranh ba" })).toBeInTheDocument();
    expect(screen.queryByText(/Bản dịch lời thoại/)).toBeNull();

    choose("③");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    expect(await screen.findByText("Bản dịch lời thoại")).toBeInTheDocument();
    expect(screen.getByText("Nữ: Cháu muốn gửi chiếc váy này.")).toBeInTheDocument();
  });

  it("nộp khi chưa chọn: hỏi xác nhận, không gọi API; 'Vẫn nộp' gửi selectedLabel null", async () => {
    respondWith(checkResponse({ correct: false, selectedLabel: null }));
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Bạn chưa chọn đáp án.");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Quay lại chọn" }));
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    fireEvent.click(screen.getByRole("button", { name: "Vẫn nộp" }));
    expect(await screen.findByRole("heading", { name: "Bỏ trống", level: 2 })).toBeInTheDocument();
    expect(lastRequestBody().selectedLabel).toBeNull();
    expect(screen.getByText(/Bạn chưa chọn đáp án nào/)).toBeInTheDocument();
  });

  it("lỗi mạng: báo tiếng Việt, giữ lựa chọn, cho thử lại và thành công ở lần sau", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    respondWith(checkResponse());
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    choose("③");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không kết nối được tới máy chủ");
    expect(screen.getByRole("radio", { name: /③/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /③/ })).toBeEnabled();
    expect(store.recordAnswer).not.toHaveBeenCalled();

    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Đúng", level: 2 })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("API trả lỗi 404: hiện thông báo của máy chủ", async () => {
    respondWith(
      { error: { code: "question_not_found", message: "Không tìm thấy câu hỏi này." } },
      404,
    );
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    choose("②");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy câu hỏi này.");
  });

  it("Làm lại: mở khoá lựa chọn, xoá kết quả, đồng hồ về 00:00", async () => {
    respondWith(checkResponse());
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    choose("③");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await screen.findByRole("heading", { name: "Đúng", level: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
    expect(screen.queryByRole("heading", { name: "Đúng" })).toBeNull();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeEnabled();
      expect(radio).not.toBeChecked();
    }
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
  });
});

describe("PracticeRunner: nhiều câu", () => {
  it("có dải số câu, Câu trước/Câu sau, và trạng thái từng câu độc lập", async () => {
    respondWith(checkResponse());
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1, QUESTION_2]} />);

    const nav = screen.getByRole("navigation", { name: "Danh sách câu" });
    expect(within(nav).getAllByRole("button")).toHaveLength(2);
    expect(within(nav).getByRole("button", { name: "Câu 1" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("heading", { level: 2, name: /Câu 1\/2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Câu trước" })).toBeDisabled();

    choose("③");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await screen.findByRole("heading", { name: "Đúng", level: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Đánh dấu" }));
    expect(
      within(nav).getByRole("button", { name: "Câu 1, đã làm, đúng, đã đánh dấu" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Câu sau" }));
    expect(screen.getByRole("heading", { level: 2, name: /Câu 2\/2/ })).toBeInTheDocument();
    expect(screen.getByText("두 번째 문제의 지문입니다.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Đúng" })).toBeNull();
    expect(screen.getByRole("button", { name: "Câu sau" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đánh dấu" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeEnabled();

    // quay lại câu 1: kết quả còn nguyên
    fireEvent.click(within(nav).getByRole("button", { name: /^Câu 1/ }));
    expect(screen.getByRole("heading", { name: "Đúng", level: 2 })).toBeInTheDocument();
  });
});

describe("PracticeRunner: khôi phục tiến độ khách", () => {
  const saved: ProgressRecord = {
    key: "topik-ii:r10-0001",
    program: "topik-ii",
    questionId: "r10-0001",
    type_code: "R10",
    skill: "reading",
    answered: true,
    lastSelected: "②",
    lastCorrect: false,
    marked: true,
    updatedAt: 1,
  };

  it("mở lại: hiện lựa chọn cũ, đúng/sai và đánh dấu; 'Xem lời giải' gọi API nhưng không ghi thêm lượt", async () => {
    vi.mocked(store.loadProgressForType).mockResolvedValue([saved]);
    respondWith(checkResponse({ correct: false, selectedLabel: "②" }));
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);

    expect(await screen.findByText(/Bạn đã làm câu này và trả lời sai/)).toBeInTheDocument();
    expect(screen.getByText(/Lựa chọn lần trước của bạn: ②/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /②/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /②/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đánh dấu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("② Bạn chọn, sai")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Xem lời giải" }));
    expect(await screen.findByRole("heading", { name: "Sai", level: 2 })).toBeInTheDocument();
    expect(lastRequestBody()).toMatchObject({ questionId: "r10-0001", selectedLabel: "②" });
    expect(store.recordAnswer).not.toHaveBeenCalled();
  });

  it("Làm lại từ trạng thái khôi phục trả câu về chưa làm", async () => {
    vi.mocked(store.loadProgressForType).mockResolvedValue([saved]);
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    await screen.findByText(/Bạn đã làm câu này/);
    fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
    expect(screen.queryByText(/Bạn đã làm câu này/)).toBeNull();
    expect(screen.getByRole("radio", { name: /②/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeInTheDocument();
  });

  it("IndexedDB trống: vẫn làm bài bình thường", async () => {
    vi.mocked(store.recordAnswer).mockResolvedValue(false);
    respondWith(checkResponse());
    render(<PracticeRunner program="topik-ii" questions={[QUESTION_1]} />);
    choose("③");
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await screen.findByRole("heading", { name: "Đúng", level: 2 });
    expect(await screen.findByText(/Không lưu được tiến độ/)).toBeInTheDocument();
  });
});
