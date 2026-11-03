import { describe, expect, it } from "vitest";
import { autoCompletePlan } from "./auto-complete";
import { generateDays, type StudyPlan, type PlannerCatalog } from "./plan";
import type { AnswerRecord } from "@/components/practice/guest-stats";
import type { ExamResultRecord } from "@/components/exam/exam-state";
import { scheduleReview } from "@/lib/lexicon/review-schedule";

const now = new Date(2026, 10, 3, 12).getTime();
const plan: StudyPlan = {
  version: 1,
  program: "topik-ii",
  createdAt: now - 1000,
  startDate: "2026-11-03",
  examDate: "2026-11-13",
  targetLevel: 3,
  minutesPerDay: 30,
  weakTypeCodes: [],
  completed: {},
};
const catalog: PlannerCatalog = {
  levels: [{ level: 3, label: "3급" }],
  resources: [
    { id: "v1", kind: "vocab", href: "/v1", title: "Từ", level: 3 },
    { id: "g1", kind: "grammar", href: "/g1", title: "Ngữ pháp", level: 3 },
    { id: "R01", kind: "practice", href: "/r1", title: "Đọc", level: 3, questionIds: ["q1", "q2"] },
  ],
};
const answer = (id: string, overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  program: plan.program,
  questionId: id,
  type_code: "R01",
  skill: "reading",
  correct: false,
  selectedLabel: "①",
  answeredAt: now,
  timeSpentMs: 1000,
  ...overrides,
});
describe("tự ghi nhận nhiệm vụ", () => {
  it("đếm câu khác nhau, không tính lượt trùng, câu bỏ trống, ngày cũ hoặc chương trình khác", () => {
    for (const rows of [
      [answer("q1"), answer("q1")],
      [answer("q1"), answer("q2", { selectedLabel: null })],
      [answer("q1"), answer("q2", { answeredAt: now - 86400000 })],
      [answer("q1"), answer("q2", { program: "other" })],
      [answer("q1"), answer("q2", { answeredAt: now - 2000 })],
    ])
      expect(autoCompletePlan(plan, catalog, rows, [], {}, now)).toBe(plan);
  });
  it("chỉ hoàn thành hôm nay, giữ dấu thủ công, không đánh dấu ngữ pháp vì chỉ mở trang", () => {
    const withManual = { ...plan, completed: { "manual-task": "2026-11-02" } };
    const next = autoCompletePlan(
      withManual,
      catalog,
      [answer("q1"), answer("q2")],
      [],
      { v1: scheduleReview("v1", undefined, "again", now) },
      now,
    );
    expect(next.completed).toEqual({
      "manual-task": "2026-11-02",
      "2026-11-03:practice:R01": "2026-11-03",
      "2026-11-03:vocab:v1": "2026-11-03",
    });
    expect(autoCompletePlan(next, catalog, [answer("q1"), answer("q2")], [], {}, now)).toBe(next);
  });
  it("Mini test khớp đúng đề và ngày, không hoàn thành lịch lặp trong tương lai", () => {
    const miniCatalog: PlannerCatalog = {
      ...catalog,
      resources: [
        ...catalog.resources,
        {
          id: "mini-01",
          kind: "mini_test",
          title: "Mini",
          href: "/mini",
          level: 3,
          durationMinutes: 15,
        },
      ],
    };
    const miniPlan = { ...plan, startDate: "2026-10-28" };
    const tasks = generateDays(miniPlan, miniCatalog).find((d) => d.date === "2026-11-03")!.tasks;
    expect(tasks.some((task) => task.kind === "mini_test")).toBe(true);
    const exam = {
      program: plan.program,
      kind: "mini",
      examId: "mini-01",
      submittedAt: now,
    } as ExamResultRecord;
    expect(autoCompletePlan(miniPlan, miniCatalog, [], [exam], {}, now).completed).toEqual({
      "2026-11-03:mini_test:mini-01": "2026-11-03",
    });
    expect(
      autoCompletePlan(miniPlan, miniCatalog, [], [{ ...exam, examId: "other" }], {}, now),
    ).toBe(miniPlan);
  });
});
