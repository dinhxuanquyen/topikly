import { describe, expect, it } from "vitest";
import {
  applyAnswerToProgress,
  applyMarkToProgress,
  computeTypeStats,
  groupStatsByType,
  latestAnswerByQuestion,
  progressKey,
  ratePercent,
  type AnswerRecord,
  type ProgressRecord,
} from "./guest-stats";

function answer(partial: Partial<AnswerRecord> & { questionId: string }): AnswerRecord {
  return {
    program: "topik-ii",
    type_code: "R10",
    skill: "reading",
    selectedLabel: "③",
    correct: true,
    timeSpentMs: 5000,
    answeredAt: 1000,
    ...partial,
  };
}

describe("computeTypeStats", () => {
  it("chưa làm câu nào: 0 câu, tỉ lệ null", () => {
    expect(computeTypeStats([])).toEqual({ attempted: 0, correct: 0, rate: null });
  });

  it("đếm câu khác nhau và tính tỉ lệ đúng", () => {
    const stats = computeTypeStats([
      answer({ questionId: "r10-0001", correct: true }),
      answer({ questionId: "r10-0002", correct: false }),
      answer({ questionId: "r10-0003", correct: true }),
      answer({ questionId: "r10-0004", correct: true }),
    ]);
    expect(stats.attempted).toBe(4);
    expect(stats.correct).toBe(3);
    expect(stats.rate).toBeCloseTo(0.75);
  });

  it("làm lại một câu: chỉ tính lượt mới nhất, không đếm trùng", () => {
    const stats = computeTypeStats([
      answer({ questionId: "r10-0001", correct: false, answeredAt: 1000 }),
      answer({ questionId: "r10-0001", correct: true, answeredAt: 2000 }),
    ]);
    expect(stats).toEqual({ attempted: 1, correct: 1, rate: 1 });

    const worse = computeTypeStats([
      answer({ questionId: "r10-0001", correct: true, answeredAt: 1000 }),
      answer({ questionId: "r10-0001", correct: false, answeredAt: 2000 }),
    ]);
    expect(worse).toEqual({ attempted: 1, correct: 0, rate: 0 });
  });

  it("không phụ thuộc thứ tự mảng: lượt có answeredAt lớn hơn thắng", () => {
    const stats = computeTypeStats([
      answer({ questionId: "q", correct: true, answeredAt: 2000 }),
      answer({ questionId: "q", correct: false, answeredAt: 1000 }),
    ]);
    expect(stats.correct).toBe(1);
  });

  it("cùng answeredAt: lượt đứng sau thắng", () => {
    const latest = latestAnswerByQuestion([
      answer({ questionId: "q", correct: false, answeredAt: 5 }),
      answer({ questionId: "q", correct: true, answeredAt: 5 }),
    ]);
    expect(latest.get(progressKey("topik-ii", "q"))?.correct).toBe(true);
  });
});

describe("groupStatsByType", () => {
  it("gom theo type_code và tính riêng từng dạng", () => {
    const stats = groupStatsByType([
      answer({ questionId: "r10-0001", type_code: "R10", correct: true }),
      answer({ questionId: "l01-0001", type_code: "L01", skill: "listening", correct: false }),
      answer({ questionId: "l01-0002", type_code: "L01", skill: "listening", correct: true }),
    ]);
    expect(stats.R10).toEqual({ attempted: 1, correct: 1, rate: 1 });
    expect(stats.L01).toEqual({ attempted: 2, correct: 1, rate: 0.5 });
    expect(stats.R01).toBeUndefined();
  });
});

describe("ratePercent", () => {
  it("làm tròn thành phần trăm nguyên", () => {
    expect(ratePercent(null)).toBe(0);
    expect(ratePercent(0)).toBe(0);
    expect(ratePercent(1 / 3)).toBe(33);
    expect(ratePercent(2 / 3)).toBe(67);
    expect(ratePercent(1)).toBe(100);
  });
});

describe("tiến độ theo câu", () => {
  const meta = {
    program: "topik-ii",
    questionId: "r10-0001",
    type_code: "R10",
    skill: "reading" as const,
  };

  it("nộp bài ghi lại lựa chọn, kết quả và giữ cờ đánh dấu", () => {
    const marked: ProgressRecord = applyMarkToProgress(undefined, meta, true, 10);
    const next = applyAnswerToProgress(marked, answer({ questionId: "r10-0001", correct: false }));
    expect(next).toMatchObject({
      key: "topik-ii:r10-0001",
      answered: true,
      lastSelected: "③",
      lastCorrect: false,
      marked: true,
    });
  });

  it("chỉ đánh dấu (chưa làm) không tính là đã làm", () => {
    const rec = applyMarkToProgress(undefined, meta, true, 10);
    expect(rec).toMatchObject({ answered: false, lastSelected: null, lastCorrect: null });
  });

  it("bỏ đánh dấu không xoá kết quả đã làm", () => {
    const answered = applyAnswerToProgress(undefined, answer({ questionId: "r10-0001" }));
    const unmarked = applyMarkToProgress(answered, meta, false, 99);
    expect(unmarked).toMatchObject({ answered: true, lastSelected: "③", marked: false });
    expect(unmarked.updatedAt).toBe(99);
  });

  it("nộp bài trống lưu lastSelected null nhưng vẫn là đã làm", () => {
    const rec = applyAnswerToProgress(
      undefined,
      answer({ questionId: "r10-0001", selectedLabel: null, correct: false }),
    );
    expect(rec).toMatchObject({ answered: true, lastSelected: null, lastCorrect: false });
  });
});
