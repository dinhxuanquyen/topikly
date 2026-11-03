import type { AnswerRecord } from "@/components/practice/guest-stats";
import type { ExamResultRecord } from "@/components/exam/exam-state";
import type { ReviewCards } from "@/lib/lexicon/review-schedule";
import { dateKey, generateDays, type PlannerCatalog, type StudyPlan } from "./plan";

/** Only today's tasks: a single attempt must never complete repeated lessons on other days. */
export function autoCompletePlan(
  plan: StudyPlan,
  catalog: PlannerCatalog,
  answers: readonly AnswerRecord[],
  exams: readonly ExamResultRecord[],
  cards: ReviewCards,
  now: number,
): StudyPlan {
  const today = dateKey(new Date(now));
  const day = generateDays(plan, catalog).find((item) => item.date === today);
  if (!day) return plan;
  const inWindow = (time: number) =>
    time >= (plan.createdAt ?? 0) && time <= now && dateKey(new Date(time)) === today;
  const completed = { ...plan.completed };
  let changed = false;
  for (const task of day.tasks) {
    if (completed[task.taskId]) continue;
    let done = false;
    if (task.kind === "practice" && task.questionIds?.length) {
      const ids = new Set(task.questionIds);
      const answered = new Set(
        answers
          .filter(
            (answer) =>
              answer.program === plan.program &&
              ids.has(answer.questionId) &&
              answer.selectedLabel !== null &&
              inWindow(answer.answeredAt),
          )
          .map((answer) => answer.questionId),
      );
      done = answered.size >= Math.min(5, ids.size);
    } else if (task.kind === "mini_test") {
      done = exams.some(
        (exam) =>
          exam.program === plan.program &&
          exam.kind === "mini" &&
          exam.examId === task.id &&
          inWindow(exam.submittedAt),
      );
    } else if (task.kind === "vocab") {
      done = !!cards[task.id] && inWindow(cards[task.id]!.lastReviewedAt);
    }
    if (done) {
      completed[task.taskId] = today;
      changed = true;
    }
  }
  return changed ? { ...plan, completed } : plan;
}
