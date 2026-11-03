import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { StudyPlanner } from "./study-planner";
import { readPlan, writePlan } from "./plan-store";
import { addDays, dateKey, type PlannerCatalog } from "@/lib/planner/plan";
import { loadAnswers } from "@/components/practice/guest-store";

vi.mock("@/components/practice/guest-store", () => ({
  loadAnswers: vi.fn(),
  loadProgress: vi.fn(async () => []),
  subscribeGuestChanges: vi.fn(() => () => {}),
}));
vi.mock("@/components/exam/exam-store", () => ({
  loadExamHistory: vi.fn(async () => []),
  loadLatestResult: vi.fn(async () => null),
}));

it("quay lại lộ trình tự ghi nhận kết quả; vẫn cho bỏ dấu thủ công", async () => {
  const program = "auto-plan-ui";
  const now = Date.now();
  const today = dateKey(new Date(now));
  const catalog: PlannerCatalog = {
    levels: [{ level: 3, label: "3급" }],
    resources: [
      {
        id: "R01",
        kind: "practice",
        title: "Đọc câu ngắn",
        href: "/practice",
        level: 3,
        questionIds: ["q1"],
      },
    ],
  };
  writePlan(program, {
    version: 1,
    program,
    createdAt: now - 1000,
    startDate: today,
    examDate: addDays(today, 3),
    targetLevel: 3,
    minutesPerDay: 15,
    weakTypeCodes: [],
    completed: {},
  });
  vi.mocked(loadAnswers).mockResolvedValue([
    {
      program,
      questionId: "q1",
      type_code: "R01",
      skill: "reading",
      correct: false,
      selectedLabel: "①",
      timeSpentMs: 1000,
      answeredAt: now,
    },
  ]);
  render(<StudyPlanner program={program} catalog={catalog} placementExamId={null} />);
  const checkbox = await screen.findByRole("checkbox", { name: "Hoàn thành: Đọc câu ngắn" });
  await waitFor(() => expect(checkbox).toBeChecked());
  expect(Object.keys(readPlan(program).plan!.completed)).toEqual([`${today}:practice:R01`]);
  fireEvent.click(checkbox);
  expect(checkbox).not.toBeChecked();
  expect(readPlan(program).plan!.completed).toEqual({});
});
