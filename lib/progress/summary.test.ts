import { expect, it } from "vitest";
import { progressSummary } from "./summary";
import type { AnswerRecord } from "@/components/practice/guest-stats";

it("tách lượt làm lại khỏi số câu, tính đúng bằng kết quả mới nhất và giữ 7 ngày gồm số 0", () => {
  const now = new Date(2026, 10, 3, 12).getTime();
  const answer: AnswerRecord = {
    program: "topik-ii",
    questionId: "q1",
    type_code: "R01",
    skill: "reading",
    selectedLabel: "①",
    correct: false,
    timeSpentMs: 1,
    answeredAt: now - 1,
  };
  const summary = progressSummary(
    [answer, { ...answer, correct: true, answeredAt: now }, { ...answer, program: "other" }],
    "topik-ii",
    now,
  );
  expect(summary.attempts).toBe(2);
  expect(summary.attempted).toBe(1);
  expect(summary.rate).toBe(1);
  expect(summary.days).toHaveLength(7);
  expect(summary.days.at(-1)).toEqual({ date: "2026-11-03", attempts: 2, unique: 1 });
  expect(summary.days[0]!.attempts).toBe(0);
});
