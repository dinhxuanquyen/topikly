import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlacementCard } from "./placement-card";
import * as store from "./exam-store";
import { PLACEMENT_RESULT, RESULT } from "./test-fixtures";

vi.mock("./exam-store", () => ({ loadLatestResult: vi.fn() }));

const EXAM = { id: "placement-01", question_count: 12, duration_sec: 900 };
const HREF = "/topik-ii/lo-trinh/test-trinh-do";

beforeEach(() => {
  vi.mocked(store.loadLatestResult).mockReset();
});

describe("PlacementCard", () => {
  it("chưa có kết quả: số câu, thời gian lấy từ dữ liệu đề, không cần đăng nhập, link làm test", async () => {
    vi.mocked(store.loadLatestResult).mockResolvedValue(null);
    render(<PlacementCard program="topik-ii" exam={EXAM} href={HREF} />);
    expect(screen.getByRole("heading", { level: 2, name: "Test trình độ" })).toBeInTheDocument();
    expect(document.body).toHaveTextContent("12 câu Đọc trong 15 phút");
    expect(document.body).toHaveTextContent("Không cần đăng nhập");
    const link = screen.getByRole("link", { name: "Làm test ngay" });
    expect(link).toHaveAttribute("href", HREF);
    await waitFor(() =>
      expect(store.loadLatestResult).toHaveBeenCalledWith("topik-ii", "placement", "placement-01"),
    );
    expect(screen.queryByTestId("placement-card-result")).toBeNull();
  });

  it("đã có kết quả lưu: hiện trình độ ước lượng, cấp nên bắt đầu và nút Làm lại", async () => {
    vi.mocked(store.loadLatestResult).mockResolvedValue({
      ...PLACEMENT_RESULT,
      placement: {
        ...PLACEMENT_RESULT.placement!,
        estimated_label: "4급",
        start_label: "4급",
      },
    });
    render(<PlacementCard program="topik-ii" exam={EXAM} href={HREF} />);
    const box = await screen.findByTestId("placement-card-result");
    expect(box).toHaveTextContent("Trình độ ước lượng: 4급 · nên bắt đầu ở 4급");
    const retry = screen.getByRole("link", { name: "Làm lại Test trình độ" });
    expect(retry).toHaveAttribute("href", HREF);
    expect(retry).toHaveTextContent("Làm lại");
  });

  it("kết quả lưu không có phần placement (dữ liệu lạ): coi như chưa làm", async () => {
    vi.mocked(store.loadLatestResult).mockResolvedValue(RESULT);
    render(<PlacementCard program="topik-ii" exam={EXAM} href={HREF} />);
    await waitFor(() => expect(store.loadLatestResult).toHaveBeenCalled());
    expect(screen.queryByTestId("placement-card-result")).toBeNull();
    expect(screen.getByRole("link", { name: "Làm test ngay" })).toBeInTheDocument();
  });

  it("đọc IndexedDB lỗi: vẫn hiện thẻ mời làm test, không ném lỗi", async () => {
    vi.mocked(store.loadLatestResult).mockRejectedValue(new Error("idb"));
    render(<PlacementCard program="topik-ii" exam={EXAM} href={HREF} />);
    await waitFor(() => expect(store.loadLatestResult).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Làm test ngay" })).toBeInTheDocument();
  });

  it("chưa có đề: báo đang biên soạn, không có link và không đọc IndexedDB", () => {
    render(<PlacementCard program="topik-ii" exam={null} href={HREF} />);
    expect(screen.getByText(/đang được biên soạn/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(store.loadLatestResult).not.toHaveBeenCalled();
  });
});
