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

  it("thẻ Mini test Nghe: kỹ năng 'Nghe', 20 câu, 25 phút, đề nháp", async () => {
    const listening: ExamSummary = {
      id: "nghe-01",
      program: "topik-ii",
      kind: "mini",
      title: "Mini test Nghe 01",
      status: "draft",
      skills: ["listening"],
      question_count: 20,
      duration_sec: 1500,
    };
    render(<ExamList program="topik-ii" kind="mini" exams={[listening]} label="Danh sách" />);
    const card = screen.getByRole("link", { name: /Mini test Nghe 01/ });
    expect(card).toHaveAttribute("href", "/topik-ii/de-thi/mini/nghe-01");
    expect(card).toHaveTextContent("20 câu");
    expect(card).toHaveTextContent("25 phút");
    expect(card).toHaveTextContent("Nghe");
    expect(card).not.toHaveTextContent("Đọc");
    expect(card).toHaveTextContent("Đề mẫu");
    expect(await screen.findByText("Chưa làm")).toBeInTheDocument();
  });
});

describe("ExamList: đề Viết", () => {
  const writing: ExamSummary = {
    id: "viet-01",
    program: "topik-ii",
    kind: "mini",
    title: "Mini test Viết 01",
    status: "draft",
    skills: ["writing"],
    question_count: 4,
    duration_sec: 3000,
  };

  it("thẻ hiện kỹ năng Viết, 4 câu, 50 phút và ghi chú tự chấm bằng bài mẫu", async () => {
    render(<ExamList program="topik-ii" kind="mini" exams={[writing]} label="Danh sách" />);
    const card = screen.getByRole("link", { name: /Mini test Viết 01/ });
    expect(card).toHaveAttribute("href", "/topik-ii/de-thi/mini/viet-01");
    expect(card).toHaveTextContent("4 câu");
    expect(card).toHaveTextContent("50 phút");
    expect(card).toHaveTextContent("Viết");
    expect(card).toHaveTextContent("Phần Viết tự chấm bằng bài mẫu, chưa chấm AI.");
    expect(await screen.findByText("Chưa làm")).toBeInTheDocument();
  });

  it("đã nộp nhưng chưa tự chấm: không in điểm 0/0 mà nói chưa tự chấm", async () => {
    vi.mocked(store.loadExamStatuses).mockResolvedValue({
      "viet-01": {
        draft: false,
        attempts: 1,
        latest: {
          score: 0,
          maxScore: 0,
          levelLabel: "",
          isEstimate: true,
          submittedAt: 1,
          writingPending: true,
        },
      },
    });
    render(<ExamList program="topik-ii" kind="mini" exams={[writing]} label="Danh sách" />);
    expect(await screen.findByText("Lần gần nhất: đã nộp, chưa tự chấm Viết")).toBeInTheDocument();
    expect(screen.queryByText(/0\/0/)).toBeNull();
  });

  it("đã tự chấm: hiện điểm Viết tự chấm và cấp ước lượng", async () => {
    vi.mocked(store.loadExamStatuses).mockResolvedValue({
      "viet-01": {
        draft: false,
        attempts: 2,
        latest: {
          score: 70,
          maxScore: 100,
          levelLabel: "5급",
          isEstimate: true,
          submittedAt: 2,
          selfScored: true,
        },
      },
    });
    render(<ExamList program="topik-ii" kind="mini" exams={[writing]} label="Danh sách" />);
    expect(
      await screen.findByText("Lần gần nhất: 70/100 · 5급 (ước lượng, Viết tự chấm)"),
    ).toBeInTheDocument();
  });

  it("đề có cả Đọc lẫn Viết chưa tự chấm: giữ điểm phần tự động và nhắc chưa tự chấm Viết", async () => {
    vi.mocked(store.loadExamStatuses).mockResolvedValue({
      "full-01": {
        draft: false,
        attempts: 1,
        latest: {
          score: 50,
          maxScore: 100,
          levelLabel: "3급",
          isEstimate: true,
          submittedAt: 3,
          writingPending: true,
        },
      },
    });
    const mixed: ExamSummary = { ...writing, id: "full-01", skills: ["reading", "writing"] };
    render(<ExamList program="topik-ii" kind="mini" exams={[mixed]} label="Danh sách" />);
    expect(await screen.findByText("Lần gần nhất: 50/100 · 3급 (ước lượng)")).toBeInTheDocument();
    expect(screen.getByText("Chưa tự chấm phần Viết")).toBeInTheDocument();
  });
});
