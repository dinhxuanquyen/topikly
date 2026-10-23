import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamSummary } from "@/lib/exam/types";
import { ExamList } from "./exam-list";
import * as store from "./exam-store";

vi.mock("./exam-store", () => ({ loadExamStatuses: vi.fn() }));

const EXAMS: ExamSummary[] = [
  {
    id: "doc-01",
    program: "topik-ii",
    kind: "mini",
    title: "Mini test Đọc 01",
    status: "draft",
    skills: ["reading"],
    question_count: 9,
    duration_sec: 900,
  },
  {
    id: "doc-02",
    program: "topik-ii",
    kind: "mini",
    title: "Mini test Đọc 02",
    status: "published",
    skills: ["reading"],
    question_count: 10,
    duration_sec: 1200,
  },
];

beforeEach(() => {
  vi.mocked(store.loadExamStatuses).mockResolvedValue({});
});

describe("ExamList", () => {
  it("thẻ đề có số câu, thời gian, nhãn Đề mẫu cho draft và link tới đề", async () => {
    render(
      <ExamList program="topik-ii" kind="mini" exams={EXAMS} label="Danh sách đề Mini test" />,
    );
    const list = screen.getByRole("list", { name: "Danh sách đề Mini test" });
    expect(list).toBeInTheDocument();
    const first = screen.getByRole("link", { name: /Mini test Đọc 01/ });
    expect(first).toHaveAttribute("href", "/topik-ii/de-thi/mini/doc-01");
    expect(first).toHaveTextContent("9 câu");
    expect(first).toHaveTextContent("15 phút");
    expect(first).toHaveTextContent("Đề mẫu");
    const second = screen.getByRole("link", { name: /Mini test Đọc 02/ });
    expect(second).toHaveTextContent("20 phút");
    expect(second).not.toHaveTextContent("Đề mẫu");
    expect(await screen.findAllByText("Chưa làm")).toHaveLength(2);
  });

  it("hiện trạng thái làm dở và điểm gần nhất từ chế độ khách", async () => {
    vi.mocked(store.loadExamStatuses).mockResolvedValue({
      "doc-01": { draft: true, attempts: 1 },
      "doc-02": {
        draft: false,
        attempts: 2,
        latest: { score: 70, maxScore: 100, levelLabel: "4급", isEstimate: true, submittedAt: 1 },
      },
    });
    render(<ExamList program="topik-ii" kind="mini" exams={EXAMS} label="Danh sách" />);
    expect(await screen.findByText("Đang làm dở")).toBeInTheDocument();
    expect(screen.getByText("Lần gần nhất: 70/100 · 4급 (ước lượng)")).toBeInTheDocument();
    expect(screen.getByText("2 lần làm")).toBeInTheDocument();
    expect(store.loadExamStatuses).toHaveBeenCalledWith("topik-ii", "mini");
  });
});
