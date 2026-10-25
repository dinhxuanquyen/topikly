import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamResultView } from "./exam-result-view";
import { EXAM, PLACEMENT_EXAM, PLACEMENT_RESULT, RESULT } from "./test-fixtures";

const base = {
  result: PLACEMENT_RESULT,
  exam: PLACEMENT_EXAM,
  listHref: "/topik-ii/lo-trinh",
  saved: true as boolean | null,
  passRatio: 0.6,
  onRetry: vi.fn(),
};

describe("ExamResultView: Test trình độ", () => {
  it("nhấn cấp nên bắt đầu, ghi rõ ước lượng sơ bộ và thay khối điểm/cấp của Mini", () => {
    render(<ExamResultView {...base} />);
    const heading = screen.getByRole("heading", { level: 2, name: "Kết quả Test trình độ" });
    expect(heading).toHaveFocus();
    expect(screen.getByTestId("placement-start")).toHaveTextContent("3급");
    expect(screen.getByText("Nên bắt đầu ở")).toBeInTheDocument();
    expect(screen.getByText("Trình độ ước lượng sơ bộ")).toBeInTheDocument();
    expect(screen.getByTestId("placement-estimated")).toHaveTextContent("3급");
    expect(screen.getByText(/lưu tạm trên thiết bị này \(chế độ khách\)/)).toBeInTheDocument();
    // Không có khối điểm/quy đổi cấp của Mini, không có bảng theo phần.
    expect(screen.queryByText("Điểm")).toBeNull();
    expect(screen.queryByRole("table", { name: "Kết quả theo phần" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Theo nhóm dạng câu" })).toBeNull();
  });

  it("nêu ngưỡng vững lấy từ prop passRatio; không có prop thì diễn đạt không kèm số", () => {
    const { unmount } = render(<ExamResultView {...base} />);
    expect(document.body).toHaveTextContent("làm đúng từ 60% số câu");
    unmount();
    render(<ExamResultView {...base} passRatio={undefined} />);
    expect(document.body).toHaveTextContent("làm đúng phần lớn số câu của bậc đó");
    expect(document.body).not.toHaveTextContent("60%");
  });

  it("bảng theo bậc có caption, đúng/tổng và trạng thái bằng chữ (không chỉ màu)", () => {
    render(<ExamResultView {...base} />);
    const table = screen.getByRole("table", { name: "Kết quả theo bậc độ khó" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("3급");
    expect(rows[1]).toHaveTextContent("2/2");
    expect(rows[1]).toHaveTextContent("100%");
    expect(rows[1]).toHaveTextContent("Vững");
    expect(rows[2]).toHaveTextContent("1/3");
    expect(rows[2]).toHaveTextContent("33%");
    expect(rows[2]).toHaveTextContent("Chưa vững");
    expect(within(rows[2]!).getByTestId("band-bar")).toHaveStyle({ width: "33%" });
  });

  it("chưa vững bậc thấp nhất: báo Lộ trình bắt đầu từ cấp thấp nhất", () => {
    render(
      <ExamResultView
        {...base}
        result={{
          ...PLACEMENT_RESULT,
          placement: {
            ...PLACEMENT_RESULT.placement!,
            estimated_level: null,
            estimated_label: "Chưa đạt 3급",
            bands: [{ difficulty: 3, correct: 0, total: 2, ratio: 0, passed: false }],
          },
        }}
      />,
    );
    expect(screen.getByTestId("placement-estimated")).toHaveTextContent("Chưa đạt 3급");
    expect(screen.getByText(/chưa vững bậc thấp nhất/)).toBeInTheDocument();
  });

  it("kỹ năng yếu có link Luyện dạng này chỉ khi dạng đó có câu luyện", () => {
    const { unmount } = render(<ExamResultView {...base} practiceTypeCodes={["R02"]} />);
    const list = screen.getByRole("list", { name: "Kỹ năng nên luyện trước" });
    expect(within(list).getByRole("link", { name: /Luyện dạng này/ })).toHaveAttribute(
      "href",
      "/topik-ii/luyen-tap/doc/R02",
    );
    unmount();
    render(<ExamResultView {...base} practiceTypeCodes={["R19"]} />);
    expect(screen.queryByRole("link", { name: /Luyện dạng này/ })).toBeNull();
    expect(screen.getByText("Chưa có câu luyện cho nhóm này")).toBeInTheDocument();
  });

  it("weak_subskills rỗng: câu trung tính, không có danh sách", () => {
    render(
      <ExamResultView
        {...base}
        result={{
          ...PLACEMENT_RESULT,
          placement: { ...PLACEMENT_RESULT.placement!, weak_subskills: [] },
        }}
      />,
    );
    expect(screen.queryByRole("list", { name: "Kỹ năng nên luyện trước" })).toBeNull();
    expect(screen.getByText(/chưa có kỹ năng nào cần ưu tiên/)).toBeInTheDocument();
  });

  it("có lời nhắn Lộ trình theo ngày, nút Làm lại test và Về Lộ trình; ẩn xem lại từng câu", () => {
    const onRetry = vi.fn();
    render(<ExamResultView {...base} onRetry={onRetry} />);
    expect(document.body).toHaveTextContent("Lộ trình theo ngày sẽ dùng kết quả này");
    fireEvent.click(screen.getByRole("button", { name: /Làm lại test/ }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Về Lộ trình" })).toHaveAttribute(
      "href",
      "/topik-ii/lo-trinh",
    );
    expect(screen.queryByRole("heading", { level: 2, name: "Xem lại từng câu" })).toBeNull();
    expect(document.body).toHaveTextContent("không hiện đáp án và lời giải từng câu");
  });

  it("Mini không đổi: không có phần Test trình độ", () => {
    render(
      <ExamResultView {...base} result={RESULT} exam={EXAM} listHref="/topik-ii/de-thi/mini" />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Kết quả bài làm" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Xem lại từng câu" })).toBeInTheDocument();
    expect(screen.queryByTestId("placement-start")).toBeNull();
    expect(screen.getByRole("link", { name: "Về danh sách đề" })).toBeInTheDocument();
  });
});
