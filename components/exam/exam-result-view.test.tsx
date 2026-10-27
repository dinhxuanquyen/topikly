import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamResultView } from "./exam-result-view";
import {
  EXAM,
  LISTENING_EXAM,
  LISTENING_RESULT,
  LISTEN_TRANSLATION_1,
  LISTEN_TRANSLATION_2,
  RESULT,
  WRITING_EXAM,
  WRITING_RESULT,
  withAudio,
} from "./test-fixtures";

const base = {
  result: RESULT,
  exam: EXAM,
  listHref: "/topik-ii/de-thi/mini",
  saved: true as boolean | null,
  onRetry: vi.fn(),
};

describe("ExamResultView: tổng quan", () => {
  it("hiện điểm / thang, cấp ghi rõ là ước lượng và điểm cần thêm để lên cấp kế", () => {
    render(<ExamResultView {...base} />);
    const heading = screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" });
    expect(heading).toHaveFocus();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
    expect(screen.getByText("Cấp (ước lượng)")).toBeInTheDocument();
    const level = screen.getByText("Cấp (ước lượng)").nextElementSibling!;
    expect(level).toHaveTextContent("3급");
    expect(within(level as HTMLElement).getByText("급")).toHaveAttribute("lang", "ko");
    expect(screen.getByText(/tương đương 150\/300 điểm/)).toBeInTheDocument();
    expect(document.body).toHaveTextContent("Cần thêm 30 điểm (thang 300) để lên 4급.");
    expect(screen.getByText("Thời gian làm bài: 10:05")).toBeInTheDocument();
    expect(screen.getByText(/lưu tạm trên thiết bị này/)).toBeInTheDocument();
  });

  it("không ghi 'ước lượng' khi không phải ước lượng và báo cấp cao nhất khi next_level là null", () => {
    render(
      <ExamResultView
        {...base}
        result={{
          ...RESULT,
          timedOut: true,
          level: { ...RESULT.level!, is_estimate: false, next_level: null },
        }}
      />,
    );
    expect(screen.getByText("Cấp")).toBeInTheDocument();
    expect(screen.queryByText(/ước lượng/)).toBeNull();
    expect(screen.getByText("Bạn đã ở cấp cao nhất.")).toBeInTheDocument();
    expect(screen.getByText("Bài được tự động nộp vì hết giờ.")).toBeInTheDocument();
  });

  it("bảng kết quả theo phần", () => {
    render(<ExamResultView {...base} />);
    const table = screen.getByRole("table", { name: "Kết quả theo phần" });
    const row = within(table).getByRole("row", { name: /Đọc/ });
    expect(row).toHaveTextContent("2/4");
    expect(row).toHaveTextContent("50/100");
  });
});

describe("ExamResultView: theo nhóm dạng và kỹ năng con", () => {
  it("mỗi nhóm có đúng/tổng, phần trăm, thanh tỉ lệ và link Luyện dạng này tới dạng đầu tiên có câu luyện", () => {
    render(<ExamResultView {...base} practiceTypeCodes={["R02", "R19", "L01"]} />);
    const groups = screen.getByRole("list", { name: "Theo nhóm dạng câu" });
    const [first, second] = within(groups).getAllByRole("listitem");
    expect(first).toHaveTextContent("Nhóm R01-2");
    expect(first).toHaveTextContent("1/2 câu · 50%");
    expect(second).toHaveTextContent("1/2 câu · 50%");
    expect(within(first!).getByTestId("rate-bar")).toHaveStyle({ width: "50%" });

    // R01 chưa có câu luyện nên nhảy sang R02; nhóm 2 bắt đầu từ R19.
    expect(within(first!).getByRole("link", { name: /Luyện dạng này/ })).toHaveAttribute(
      "href",
      "/topik-ii/luyen-tap/doc/R02",
    );
    expect(within(second!).getByRole("link", { name: /Luyện dạng này/ })).toHaveAttribute(
      "href",
      "/topik-ii/luyen-tap/doc/R19",
    );
  });

  it("mặc định (không biết dạng nào có câu luyện) lấy type_code đầu tiên của nhóm", () => {
    render(<ExamResultView {...base} />);
    const links = screen.getAllByRole("link", { name: /Luyện dạng này/ });
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/topik-ii/luyen-tap/doc/R01",
      "/topik-ii/luyen-tap/doc/R19",
    ]);
  });

  it("nhóm chưa có câu luyện nào thì không gắn link", () => {
    render(<ExamResultView {...base} practiceTypeCodes={[]} />);
    expect(screen.queryByRole("link", { name: /Luyện dạng này/ })).toBeNull();
    expect(screen.getAllByText("Chưa có câu luyện cho nhóm này")).toHaveLength(2);
  });

  it("bảng kỹ năng con theo thứ tự server trả (yếu nhất trước)", () => {
    render(
      <ExamResultView
        {...base}
        result={{
          ...RESULT,
          by_subskill: [
            {
              code: "insert_sentence",
              name_vi: "Chèn câu",
              correct: 0,
              total: 2,
              type_codes: ["R39"],
            },
            {
              code: "main_idea",
              name_vi: "Tìm ý chính",
              correct: 2,
              total: 2,
              type_codes: ["R19"],
            },
          ],
        }}
      />,
    );
    const items = within(screen.getByRole("list", { name: "Theo kỹ năng con" })).getAllByRole(
      "listitem",
    );
    expect(items[0]).toHaveTextContent("Chèn câu");
    expect(items[0]).toHaveTextContent("0/2 câu · 0%");
    expect(items[1]).toHaveTextContent("Tìm ý chính");
    expect(items[1]).toHaveTextContent("100%");
  });
});

describe("ExamResultView: xem lại câu", () => {
  it("lọc Tất cả / Sai / Bỏ trống kèm số lượng", () => {
    render(<ExamResultView {...base} />);
    expect(screen.getByRole("button", { name: "Tất cả (4)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "Sai (1)" }));
    let items = screen.getAllByRole("heading", { level: 3 });
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Câu 2 · R02");
    expect(items[0]).toHaveTextContent("Sai");

    fireEvent.click(screen.getByRole("button", { name: "Bỏ trống (1)" }));
    items = screen.getAllByRole("heading", { level: 3 });
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Câu 3 · R19");
    expect(items[0]).toHaveTextContent("Bỏ trống");
  });

  it("mở một câu sai: đáp án đúng, lựa chọn của bạn, ghi chú phương án nhiễu và lời giải", () => {
    render(<ExamResultView {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Sai (1)" }));
    const toggle = screen.getByRole("button", { name: /Câu 2 · R02/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Lời giải của r03-0001.")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Lời giải của r03-0001.")).toBeInTheDocument();
    expect(screen.getByText("Vì sao ① của r03-0001 sai.")).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: "Câu 2: chọn đáp án" });
    expect(within(group).getByRole("radio", { name: /^①/ })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /^①/ })).toBeDisabled();
    expect(within(group).getByText("① Bạn chọn, sai")).toBeInTheDocument();
    expect(within(group).getByText("③ Đáp án đúng")).toBeInTheDocument();
    // Câu đơn: không in stem; ngữ liệu của chính câu vẫn hiện.
    expect(screen.queryByText("단일 문항 줄거리 둘")).toBeNull();
    expect(screen.getByText("두 번째 지문입니다.")).toBeInTheDocument();
  });

  it("câu trong bộ hiện stem riêng khi xem lại", () => {
    render(<ExamResultView {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ trống (1)" }));
    fireEvent.click(screen.getByRole("button", { name: /Câu 3 · R19/ }));
    expect(screen.getByText(/윗글에 나타난 '나'의 심정/)).toBeInTheDocument();
    expect(screen.getByText("Bạn bỏ trống · Đáp án đúng ④")).toBeInTheDocument();
  });

  it("Làm lại đề gọi onRetry và có link về danh sách đề", () => {
    const onRetry = vi.fn();
    render(<ExamResultView {...base} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Làm lại đề" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Về danh sách đề" })).toHaveAttribute(
      "href",
      "/topik-ii/de-thi/mini",
    );
  });
});

describe("ExamResultView: xem lại câu Nghe", () => {
  const listening = { ...base, result: LISTENING_RESULT, exam: LISTENING_EXAM };

  function openPanel(name: RegExp) {
    const toggle = screen.getByRole("button", { name });
    fireEvent.click(toggle);
    return document.getElementById(toggle.getAttribute("aria-controls")!)!;
  }

  it("chưa có audio: hiện lời thoại tiếng Hàn kèm bản dịch dưới từng lượt, ghi chú trung tính", () => {
    render(<ExamResultView {...listening} />);
    const panel = openPanel(/Câu 1 · L10/);
    expect(within(panel).getByText("이 원피스 좀 맡기려고요.")).toBeInTheDocument();
    expect(within(panel).getByText(LISTEN_TRANSLATION_1)).toBeInTheDocument();
    expect(within(panel).getByText(LISTEN_TRANSLATION_2)).toBeInTheDocument();
    expect(within(panel).getByText("Chưa có audio, đọc lời thoại.")).toBeInTheDocument();
    expect(within(panel).queryByText(/Chế độ luyện/)).toBeNull();
    expect(panel.querySelector("audio")).toBeNull();
  });

  it("câu không có transcript_vi vẫn hiện lời thoại tiếng Hàn, không có dòng dịch", () => {
    render(<ExamResultView {...listening} />);
    const panel = openPanel(/Câu 2 · L11/);
    expect(within(panel).getByText("이 원피스 좀 맡기려고요.")).toBeInTheDocument();
    expect(screen.queryByText(LISTEN_TRANSLATION_1)).toBeNull();
  });

  it("có audio: trình phát luyện có công tắc bản dịch, bản dịch chỉ hiện sau khi bật", () => {
    render(<ExamResultView {...listening} exam={withAudio(LISTENING_EXAM)} />);
    openPanel(/Câu 1 · L10/);
    expect(document.querySelector("audio")).not.toBeNull();
    expect(screen.queryByText(LISTEN_TRANSLATION_1)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem lời thoại" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hiện bản dịch tiếng Việt" }));
    expect(screen.getByText(LISTEN_TRANSLATION_1)).toBeInTheDocument();
  });
});

describe("ExamResultView: đề có phần Viết", () => {
  const writingBase = {
    ...base,
    result: WRITING_RESULT,
    exam: WRITING_EXAM,
  };

  it("đề chỉ có Viết (level null): không vỡ, không dựng bảng theo phần/dạng/kỹ năng con rỗng", () => {
    render(<ExamResultView {...writingBase} />);
    expect(screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toHaveFocus();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Kết quả theo phần" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Theo nhóm dạng câu" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Theo kỹ năng con" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Xem lại từng câu" })).toBeNull();
    expect(screen.queryByText("Cấp (ước lượng)")).toBeNull();
    expect(screen.getByRole("heading", { name: "Bài Viết: so sánh và tự chấm" })).toBeVisible();
    // Thời gian làm bài vẫn hiện ở khối Viết vì không có khối cấp tự động.
    expect(screen.getByText("Thời gian làm bài: 20:00")).toBeInTheDocument();
  });

  it("chưa tự chấm câu nào: hiện 'Chưa tự chấm' và lời nhắc, không hiện cấp", () => {
    render(<ExamResultView {...writingBase} />);
    const summary = screen.getByTestId("writing-summary");
    expect(summary).toHaveTextContent("Điểm Viết (tự chấm)");
    expect(summary).toHaveTextContent("Chưa tự chấm");
    expect(summary).toHaveTextContent("chưa chấm AI");
    expect(summary).not.toHaveTextContent("급");
    expect(summary).not.toHaveTextContent("/100");
  });

  it("mỗi câu hiển thị bài đã nộp: từng chỗ trống W51–W52, bài W53–W54 kèm số ký tự và trạng thái khung", () => {
    render(<ExamResultView {...writingBase} />);
    const w51 = screen.getByTestId("writing-review-w51-0001");
    expect(within(w51).getByRole("heading", { name: "Câu 51 · W51" })).toBeInTheDocument();
    expect(within(w51).getByText("Chỗ trống ㉠")).toBeInTheDocument();
    expect(within(w51).getByText("참석할 수 없습니다.")).toHaveAttribute("lang", "ko");
    expect(within(w51).getByText("미리 말씀드립니다")).toBeInTheDocument();

    const w52 = screen.getByTestId("writing-review-w52-0001");
    expect(within(w52).getAllByText("Bạn chưa điền")).toHaveLength(2);

    // Khung của fixture W53: 10–20 ký tự; bài nộp 15 ký tự (không tính khoảng trắng cũng đủ) -> trong khung.
    const w53 = screen.getByTestId("writing-review-w53-0002");
    expect(within(w53).getByText("열다섯 글자짜리 글입니다 하나둘")).toHaveAttribute("lang", "ko");
    expect(within(w53).getByText(/^\d+ ký tự$/)).toBeInTheDocument();
    expect(within(w53).getByText("Trong khung ký tự")).toBeInTheDocument();
    expect(within(w53).getByText("Khung: 10–20 ký tự")).toBeInTheDocument();

    // W54: bài "짧은 글" (4 ký tự kể cả khoảng trắng) dưới khung 30–60.
    const w54 = screen.getByTestId("writing-review-w54-0001");
    expect(within(w54).getByText("4 ký tự")).toBeInTheDocument();
    expect(within(w54).getByText("Chưa đủ, cần ít nhất 30 ký tự")).toBeInTheDocument();
    // Bộ đếm tĩnh: không có vùng aria-live đọc lại ở trang kết quả.
    expect(within(w54).queryByRole("status")).toBeNull();
  });

  it("nút xem bài mẫu mở phần tự so sánh (đáp án mẫu, lỗi thường gặp, lời giải) và ẩn lại được", () => {
    render(<ExamResultView {...writingBase} />);
    const w51 = screen.getByTestId("writing-review-w51-0001");
    const toggle = within(w51).getByRole("button", { name: /Xem bài mẫu & tự so sánh/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(w51).queryByText("Đáp án đạt điểm tối đa")).toBeNull();

    fireEvent.click(toggle);
    const region = within(w51).getByRole("region", { name: "Bài mẫu và tự so sánh câu 51" });
    expect(within(region).getAllByText("Đáp án đạt điểm tối đa")).toHaveLength(2);
    expect(within(region).getAllByText("Trùng một đáp án đạt điểm tối đa.")).toHaveLength(2);
    expect(within(region).getByText("Dùng sai văn phong")).toBeInTheDocument();
    expect(within(region).getByText("Lời giải ngắn.")).toBeInTheDocument();
    expect(within(w51).getByRole("button", { name: /Ẩn bài mẫu/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(within(w51).getByRole("button", { name: /Ẩn bài mẫu/ }));
    expect(within(w51).queryByRole("region")).toBeNull();
  });

  it("câu essay mở bài mẫu: bài của bạn cạnh bài mẫu, ý bắt buộc và nhận xét theo 3 tiêu chí", () => {
    render(<ExamResultView {...writingBase} />);
    const w53 = screen.getByTestId("writing-review-w53-0002");
    fireEvent.click(within(w53).getByRole("button", { name: /Xem bài mẫu & tự so sánh/ }));
    expect(within(w53).getByText("Bài mẫu cấp 4")).toBeInTheDocument();
    expect(within(w53).getByText("Bài của bạn")).toBeInTheDocument();
    expect(within(w53).getByText("Tự kiểm tra các ý bắt buộc")).toBeInTheDocument();
    expect(within(w53).getByText("Nhận xét bài mẫu cấp 4 theo 3 tiêu chí")).toBeInTheDocument();
    expect(within(w53).getByText("Nội dung và thực hiện nhiệm vụ")).toBeInTheDocument();
    expect(within(w53).getByText("Cấu trúc triển khai bài viết")).toBeInTheDocument();
    expect(within(w53).getByText("Sử dụng ngôn ngữ")).toBeInTheDocument();
    // Ý bắt buộc đánh dấu được (chỉ trong phiên xem).
    const point = within(w53).getAllByRole("checkbox")[0]!;
    fireEvent.click(point);
    expect(point).toBeChecked();
  });

  it("tiêu đề trong khối so sánh nhúng được hạ cấp: không có h2 bên trong thẻ câu", () => {
    render(<ExamResultView {...writingBase} />);
    const w53 = screen.getByTestId("writing-review-w53-0002");
    fireEvent.click(within(w53).getByRole("button", { name: /Xem bài mẫu & tự so sánh/ }));
    expect(within(w53).queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(
      within(w53).getByRole("heading", { level: 3, name: "Câu 53 · W53" }),
    ).toBeInTheDocument();
  });

  it("ô tự chấm: nhãn rõ, kẹp theo điểm tối đa, gợi ý khác nhau cho điền chỗ trống và essay", () => {
    const onChange = vi.fn();
    render(<ExamResultView {...writingBase} onSelfPointsChange={onChange} />);
    const w51 = screen.getByTestId("writing-review-w51-0001");
    const input = within(w51).getByLabelText("Tự chấm (ước lượng)");
    expect(input).toHaveAttribute("max", "10");
    expect(within(w51).getByText("/ 10 điểm")).toBeInTheDocument();
    expect(within(w51).getByText(/mỗi chỗ trống tối đa 5 điểm/)).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription(/mỗi chỗ trống tối đa 5 điểm/);

    fireEvent.change(input, { target: { value: "99" } });
    expect(input).toHaveValue(10);
    expect(onChange).toHaveBeenLastCalledWith({ "w51-0001": 10 });

    const w54 = screen.getByTestId("writing-review-w54-0001");
    expect(within(w54).getByLabelText("Tự chấm (ước lượng)")).toHaveAttribute("max", "50");
    const hint = within(w54).getByText(/3 tiêu chí chấm/);
    expect(hint).toHaveTextContent("Nội dung và thực hiện nhiệm vụ");
    expect(hint).toHaveTextContent("tối đa 50 điểm");

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("nút chọn nhanh cho câu điền chỗ trống: 0, nửa điểm, trọn điểm", () => {
    const onChange = vi.fn();
    render(<ExamResultView {...writingBase} onSelfPointsChange={onChange} />);
    const w52 = screen.getByTestId("writing-review-w52-0001");
    const group = within(w52).getByRole("group", { name: "Chọn nhanh" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["0 điểm", "5 điểm", "10 điểm"]);
    fireEvent.click(within(group).getByRole("button", { name: "5 điểm" }));
    expect(within(group).getByRole("button", { name: "5 điểm" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onChange).toHaveBeenLastCalledWith({ "w52-0001": 5 });
    // Câu essay không có nút chọn nhanh.
    expect(
      within(screen.getByTestId("writing-review-w53-0002")).queryByRole("group", {
        name: "Chọn nhanh",
      }),
    ).toBeNull();
  });

  it("tự chấm cập nhật điểm Viết /100 và cấp ước lượng, ghi rõ chưa chấm AI", () => {
    render(<ExamResultView {...writingBase} />);
    const set = (id: string, value: string) =>
      fireEvent.change(
        within(screen.getByTestId(`writing-review-${id}`)).getByLabelText("Tự chấm (ước lượng)"),
        { target: { value } },
      );
    const summary = screen.getByTestId("writing-summary");

    set("w51-0001", "10");
    expect(summary).toHaveTextContent("10/100");
    expect(summary).toHaveTextContent("Chưa đạt cấp");
    expect(summary).toHaveTextContent("Đã tự chấm 1/4 câu");

    set("w52-0001", "10");
    set("w53-0002", "20");
    set("w54-0001", "30");
    // 70/100 -> 210/300 -> 5급, cần thêm 20 điểm lên 6급.
    expect(summary).toHaveTextContent("70/100");
    expect(summary).toHaveTextContent("5급");
    expect(summary).toHaveTextContent("Cấp (ước lượng)");
    expect(summary).toHaveTextContent("Đã tự chấm 4/4 câu");
    expect(summary).toHaveTextContent("tương đương 210/300 điểm");
    expect(summary).toHaveTextContent("Cần thêm 20 điểm (thang 300) để lên 6급.");
    expect(summary).toHaveTextContent("ước lượng do bạn tự chấm bằng bài mẫu, chưa chấm AI");
    expect(within(summary).getByRole("status")).toHaveTextContent(
      "Điểm Viết tự chấm 70 trên 100. Cấp ước lượng: 5급.",
    );

    // Xoá điểm một câu -> điểm giảm; xoá hết -> quay lại 'Chưa tự chấm'.
    set("w54-0001", "");
    expect(summary).toHaveTextContent("40/100");
    set("w51-0001", "");
    set("w52-0001", "");
    set("w53-0002", "");
    expect(summary).toHaveTextContent("Chưa tự chấm");
    expect(summary).not.toHaveTextContent("급");
  });

  it("điểm tự chấm đã lưu (initialSelfPoints) hiện lại khi mở kết quả", () => {
    render(
      <ExamResultView
        {...writingBase}
        initialSelfPoints={{ "w51-0001": 8, "w53-0002": 25, "w54-0001": 40 }}
      />,
    );
    expect(screen.getByTestId("writing-summary")).toHaveTextContent("73/100");
    expect(
      within(screen.getByTestId("writing-review-w53-0002")).getByLabelText("Tự chấm (ước lượng)"),
    ).toHaveValue(25);
    expect(
      within(screen.getByTestId("writing-review-w52-0001")).getByLabelText("Tự chấm (ước lượng)"),
    ).toHaveValue(null);
    expect(screen.getByTestId("writing-review-w51-0001")).toHaveTextContent("Tự chấm 8/10");
    expect(screen.getByTestId("writing-review-w52-0001")).toHaveTextContent("Chưa tự chấm");
  });

  it("đề có cả Đọc lẫn Viết: giữ khối điểm tự động và thêm khối Viết, tổng gồm cả hai", () => {
    const mixed = {
      ...RESULT,
      writing: {
        ...WRITING_RESULT.writing!,
        level_basis: {
          ...WRITING_RESULT.writing!.level_basis,
          auto_score: 50,
          auto_max_score: 100,
        },
      },
    };
    render(<ExamResultView {...base} result={mixed} initialSelfPoints={{ "w51-0001": 10 }} />);
    // Khối chấm tự động như cũ.
    expect(screen.getByRole("table", { name: "Kết quả theo phần" })).toBeInTheDocument();
    expect(screen.getByText("Cấp (ước lượng)")).toBeInTheDocument();
    // Khối Viết: 10/100 điểm Viết, tổng 60/200 -> 90/300 chiếu lên thang tổng.
    const summary = screen.getByTestId("writing-summary");
    expect(summary).toHaveTextContent("10/100");
    expect(summary).toHaveTextContent("Cấp ước lượng (gồm Viết tự chấm)");
    expect(summary).toHaveTextContent("Tổng điểm gồm Đọc/Nghe: 60/200");
    expect(summary).toHaveTextContent("tương đương 90/300 điểm");
    // Thời gian làm bài chỉ hiện một lần (ở khối tự động).
    expect(screen.getAllByText("Thời gian làm bài: 10:05")).toHaveLength(1);
  });
});
