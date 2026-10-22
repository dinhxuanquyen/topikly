import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamResultView } from "./exam-result-view";
import { EXAM, RESULT } from "./test-fixtures";

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
          level: { ...RESULT.level, is_estimate: false, next_level: null },
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
