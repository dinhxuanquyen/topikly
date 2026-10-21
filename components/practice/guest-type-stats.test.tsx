import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TypeStats } from "./guest-stats";
import { GuestTypeStats } from "./guest-type-stats";
import * as store from "./guest-store";

vi.mock("./guest-store", () => ({
  loadStatsByType: vi.fn(),
  invalidateStatsCache: vi.fn(),
  subscribeGuestChanges: vi.fn(() => () => undefined),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function mockStats(map: Record<string, TypeStats>) {
  vi.mocked(store.loadStatsByType).mockResolvedValue(map);
}

describe("GuestTypeStats", () => {
  it("chưa làm câu nào: hiện 'Chưa làm'", async () => {
    mockStats({});
    render(<GuestTypeStats program="topik-ii" typeCode="R10" questionCount={1} />);
    expect(await screen.findByText("Chưa làm")).toBeInTheDocument();
  });

  it("đã làm: hiện số câu đúng / đã làm và tỉ lệ đúng", async () => {
    mockStats({ R10: { attempted: 3, correct: 2, rate: 2 / 3 } });
    render(<GuestTypeStats program="topik-ii" typeCode="R10" questionCount={5} />);
    expect(await screen.findByText("Đúng 2/3 câu · 67%")).toBeInTheDocument();
    expect(screen.getByText("Đã làm 3/5 câu")).toBeInTheDocument();
    expect(store.loadStatsByType).toHaveBeenCalledWith("topik-ii");
  });

  it("chỉ lấy thống kê của đúng dạng câu", async () => {
    mockStats({ L01: { attempted: 1, correct: 1, rate: 1 } });
    render(<GuestTypeStats program="topik-ii" typeCode="R10" questionCount={1} />);
    expect(await screen.findByText("Chưa làm")).toBeInTheDocument();
  });

  it("cập nhật khi có thay đổi dữ liệu khách (vd. vừa nộp bài ở tab này)", async () => {
    let notify: () => void = () => undefined;
    vi.mocked(store.subscribeGuestChanges).mockImplementation((listener) => {
      notify = listener;
      return () => undefined;
    });
    mockStats({});
    render(<GuestTypeStats program="topik-ii" typeCode="R10" questionCount={1} />);
    await screen.findByText("Chưa làm");

    mockStats({ R10: { attempted: 1, correct: 1, rate: 1 } });
    await act(async () => {
      notify();
    });
    expect(await screen.findByText("Đúng 1/1 câu · 100%")).toBeInTheDocument();
  });

  it("đọc lại khi tab hiện lại hoặc trang được khôi phục từ bộ nhớ đệm", async () => {
    mockStats({});
    render(<GuestTypeStats program="topik-ii" typeCode="R10" questionCount={1} />);
    await screen.findByText("Chưa làm");

    mockStats({ R10: { attempted: 2, correct: 0, rate: 0 } });
    await act(async () => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(await screen.findByText("Đúng 0/2 câu · 0%")).toBeInTheDocument();
    expect(store.invalidateStatsCache).toHaveBeenCalled();
  });
});
