import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftKey } from "./writing-draft";
import { BLANKS_PROMPT, BLANKS_REVEAL, ESSAY_PROMPT, ESSAY_REVEAL } from "./writing-test-fixtures";
import { WritingPracticeRunner, WritingPromptPanel } from "./writing-runner";

const fetchMock = vi.fn();

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function essayBox() {
  return screen.getByRole("textbox", { name: /Bài viết của bạn/ });
}

function counter() {
  return document.querySelector("[data-status]") as HTMLElement;
}

describe("bộ đếm ký tự (W53)", () => {
  it("đếm kể cả khoảng trắng, không tính xuống dòng, và đổi trạng thái dưới/đạt/vượt", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);

    expect(counter().dataset.status).toBe("below");
    expect(counter()).toHaveTextContent("0 ký tự");
    expect(counter()).toHaveTextContent("Khung: 10–20 ký tự");

    // "가나 다라" = 5 ký tự (có 1 khoảng trắng), "마바 사아" = 5; xuống dòng không tính -> 10.
    fireEvent.change(essayBox(), { target: { value: "가나 다라\n마바 사아" } });
    expect(counter()).toHaveTextContent("10 ký tự");
    expect(counter().dataset.status).toBe("within");

    fireEvent.change(essayBox(), { target: { value: "가".repeat(20) } });
    expect(counter().dataset.status).toBe("within");

    fireEvent.change(essayBox(), { target: { value: "가".repeat(21) } });
    expect(counter().dataset.status).toBe("above");
    expect(counter()).toHaveTextContent("Vượt quá 20 ký tự");

    fireEvent.change(essayBox(), { target: { value: "가".repeat(9) } });
    expect(counter().dataset.status).toBe("below");
  });

  it("vùng aria-live lịch sự chỉ chứa câu trạng thái, không đổi theo từng ký tự", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    const live = () =>
      document.querySelector("p[role='status'][aria-live='polite']") as HTMLElement;
    const before = live().textContent;
    fireEvent.change(essayBox(), { target: { value: "가" } });
    expect(live().textContent).toBe(before);
    fireEvent.change(essayBox(), { target: { value: "가".repeat(12) } });
    expect(live().textContent).toBe("Trong khung ký tự");
  });

  it("ô viết có nhãn và trỏ aria-describedby tới bộ đếm", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    const describedBy = essayBox().getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ").some((id) => document.getElementById(id)?.dataset.status)).toBe(
      true,
    );
  });

  it("hiện biểu đồ và ghi chú số liệu giả định", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    expect(screen.getByRole("figure")).toBeInTheDocument();
    expect(screen.getByText(/Số liệu giả định/)).toBeInTheDocument();
  });
});

describe("nháp ở chế độ khách", () => {
  it("lưu nháp sau khi gõ và khôi phục khi tải lại", async () => {
    const { unmount } = render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.change(essayBox(), { target: { value: "안녕하세요 반갑습니다" } });
    await waitFor(() =>
      expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).toContain("안녕하세요"),
    );
    expect(screen.getByText(/Đã lưu nháp/)).toBeInTheDocument();
    unmount();

    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    await waitFor(() => expect(essayBox()).toHaveValue("안녕하세요 반갑습니다"));
    expect(screen.getByText(/Đã khôi phục bản nháp/)).toBeInTheDocument();
  });

  it("ghi nốt nháp khi rời trang dù chưa hết độ trễ gộp", async () => {
    const { unmount } = render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.change(essayBox(), { target: { value: "급하게 저장" } });
    unmount();
    await waitFor(() =>
      expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).toContain("급하게 저장"),
    );
  });

  it("localStorage hỏng: trình viết vẫn chạy, báo không lưu được", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.change(essayBox(), { target: { value: "가나다" } });
    expect(essayBox()).toHaveValue("가나다");
    await waitFor(() => expect(screen.getByText(/Không lưu được nháp/)).toBeInTheDocument());
  });

  it("Xóa bài viết hỏi xác nhận, rồi xoá cả nháp", async () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.change(essayBox(), { target: { value: "가나다" } });
    await waitFor(() =>
      expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).not.toBeNull(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Xóa bài viết" }));
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Giữ lại" }));
    expect(essayBox()).toHaveValue("가나다");

    fireEvent.click(screen.getByRole("button", { name: "Xóa bài viết" }));
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).toBeNull());
    expect(essayBox()).toHaveValue("");
  });
});

describe("xem bài mẫu và tự so sánh (W53)", () => {
  it("không gọi API cho tới khi bấm; gọi đúng URL; hiện bài của bạn cạnh bài mẫu", async () => {
    respondWith(ESSAY_REVEAL);
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Bài mẫu cấp 4")).not.toBeInTheDocument();

    fireEvent.change(essayBox(), { target: { value: "내가 쓴 글입니다" } });
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu & tự so sánh/ }));

    await screen.findByRole("region", { name: "Bài mẫu và tự so sánh" });
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "/api/practice/writing/reveal?program=topik-ii&id=w53-0002",
    );

    const mine = screen.getByRole("heading", { name: "Bài của bạn" }).closest("section")!;
    expect(mine).toHaveTextContent("내가 쓴 글입니다");
    expect(screen.getByText("Bài mẫu cấp 4")).toBeInTheDocument();
    expect(screen.getByText("첫째 문단입니다.")).toBeInTheDocument();
    // rubric theo 3 tiêu chí, biểu hiện, lỗi thường gặp
    expect(screen.getByText(/Nội dung và thực hiện nhiệm vụ/)).toBeInTheDocument();
    expect(screen.getByText(/Cấu trúc triển khai bài viết/)).toBeInTheDocument();
    expect(screen.getByText(/Sử dụng ngôn ngữ/)).toBeInTheDocument();
    expect(screen.getByText("Viết sai số liệu")).toBeInTheDocument();
    expect(screen.getByText("-을 살펴보면")).toBeInTheDocument();
  });

  it("chọn cấp bài mẫu đổi bài mẫu và nhận xét rubric", async () => {
    respondWith(ESSAY_REVEAL);
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));
    await screen.findByText("Bài mẫu cấp 4");
    expect(screen.getByRole("button", { name: "Cấp 4" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Cấp 5" }));
    expect(screen.getByText("Bài mẫu cấp 5")).toBeInTheDocument();
    expect(screen.getByText("더 높은 수준의 문단입니다.")).toBeInTheDocument();
    expect(screen.getByText("Có diễn giải thêm.")).toBeInTheDocument();
  });

  it("checklist ý bắt buộc: tự đánh dấu, đếm tiến độ và lưu cùng nháp", async () => {
    respondWith(ESSAY_REVEAL);
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));
    await screen.findByText("Tự kiểm tra các ý bắt buộc");
    expect(screen.getByText("Bạn đã đánh dấu 0/2 ý")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /종이책 대출 건수의 변화/ }));
    expect(screen.getByText("Bạn đã đánh dấu 1/2 ý")).toBeInTheDocument();
    await waitFor(() =>
      expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).toContain('"p1"'),
    );
  });

  it("lỗi mạng: báo lỗi tiếng Việt, giữ bài viết, thử lại được", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.change(essayBox(), { target: { value: "bài của tôi" } });
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không kết nối được tới máy chủ");
    expect(essayBox()).toHaveValue("bài của tôi");

    respondWith(ESSAY_REVEAL);
    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Bài mẫu cấp 4");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lỗi từ API (404) hiện thông điệp của server", async () => {
    respondWith({ error: { code: "question_not_found", message: "Không tìm thấy đề Viết." } }, 404);
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy đề Viết.");
  });

  it("ẩn rồi xem lại bài mẫu không gọi API lần hai", async () => {
    respondWith(ESSAY_REVEAL);
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));
    await screen.findByText("Bài mẫu cấp 4");
    fireEvent.click(screen.getByRole("button", { name: "Ẩn bài mẫu" }));
    expect(screen.queryByText("Bài mẫu cấp 4")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));
    expect(await screen.findByText("Bài mẫu cấp 4")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("điền chỗ trống (W51/W52)", () => {
  it("mỗi chỗ trống một ô nhập có nhãn; passage hiện đánh dấu chỗ trống", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={BLANKS_PROMPT} />);
    expect(screen.getByRole("textbox", { name: "Ô điền ㉠" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ô điền ㉡" })).toBeInTheDocument();
    expect(screen.getByLabelText("Văn bản cần điền")).toHaveTextContent("안녕하세요.");
    expect(screen.queryByRole("textbox", { name: /Bài viết của bạn/ })).not.toBeInTheDocument();
  });

  it("xem đáp án mẫu: so khớp câu của bạn và liệt kê accepted / partial / rejected", async () => {
    respondWith(BLANKS_REVEAL);
    render(<WritingPromptPanel program="topik-ii" prompt={BLANKS_PROMPT} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ô điền ㉠" }), {
      target: { value: "갈 수 없습니다." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Ô điền ㉡" }), {
      target: { value: "문장입니다" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Xem bài mẫu/ }));

    const region = await screen.findByRole("region", { name: "Bài mẫu và tự so sánh" });
    expect(region).toHaveTextContent("Văn phong yêu cầu: Lịch sự thân mật");
    const first = within(region).getByRole("heading", { name: "Chỗ trống ㉠" }).closest("section")!;
    expect(within(first).getByText("Trùng một đáp án đạt điểm tối đa.")).toBeInTheDocument();
    expect(within(first).getByText("못 갑니다")).toBeInTheDocument();
    expect(within(first).getByText("안 갑니다")).toBeInTheDocument();
    expect(within(first).getByText(/Sai nghĩa/)).toBeInTheDocument();
    const second = within(region)
      .getByRole("heading", { name: "Chỗ trống ㉡" })
      .closest("section")!;
    expect(second).toHaveTextContent("Không trùng đáp án nào trong danh sách");
  });

  it("khôi phục từng ô từ nháp", async () => {
    localStorage.setItem(
      draftKey("topik-ii", "w51-0001"),
      JSON.stringify({
        essay: "",
        blanks: { "㉠": "참석할 수 없습니다" },
        checked: [],
        savedAt: 1,
      }),
    );
    render(<WritingPromptPanel program="topik-ii" prompt={BLANKS_PROMPT} />);
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Ô điền ㉠" })).toHaveValue("참석할 수 없습니다"),
    );
  });
});

describe("WritingPracticeRunner", () => {
  it("nhiều đề: có thanh chọn đề, mỗi đề giữ nháp riêng", async () => {
    const second = { ...ESSAY_PROMPT, id: "w53-0003", stem: "두 번째 문제의 지시문입니다." };
    render(<WritingPracticeRunner program="topik-ii" prompts={[ESSAY_PROMPT, second]} />);
    expect(screen.getByRole("region", { name: "Trình luyện Viết" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đề 1" })).toHaveAttribute("aria-current", "step");

    fireEvent.change(essayBox(), { target: { value: "đề một" } });
    fireEvent.click(screen.getByRole("button", { name: "Đề 2" }));
    expect(screen.getByText("두 번째 문제의 지시문입니다.")).toBeInTheDocument();
    expect(essayBox()).toHaveValue("");
    await waitFor(() =>
      expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).toContain("đề một"),
    );
  });

  it("một đề thì không hiện thanh chọn đề", () => {
    render(<WritingPracticeRunner program="topik-ii" prompts={[ESSAY_PROMPT]} />);
    expect(screen.queryByRole("navigation", { name: "Danh sách đề Viết" })).not.toBeInTheDocument();
  });
});
