import type { AnswerRecord, ProgressRecord } from "@/components/practice/guest-stats";
import type { ExamResultRecord } from "@/components/exam/exam-state";
import type { PracticeSkill } from "./types";

export interface ReviewItem {
  id: string;
  type_code: string;
  skill: PracticeSkill;
  title: string;
}

interface QueueItem extends ReviewItem {
  marked: boolean;
  updatedAt: number;
  examTitle?: string;
  examNumber?: number;
}

export function examReviewQueue(
  catalog: readonly ReviewItem[],
  history: {
    exams: readonly ExamResultRecord[];
    answers: readonly AnswerRecord[];
    progress: readonly ProgressRecord[];
  },
  filter: { skill: string; type: string },
): QueueItem[] {
  const latestExam = new Map<
    string,
    { correct: boolean; time: number; title: string; number: number }
  >();
  for (const exam of history.exams) {
    for (const question of exam.result.questions) {
      const previous = latestExam.get(question.questionId);
      if (!previous || exam.submittedAt > previous.time) {
        latestExam.set(question.questionId, {
          correct: question.correct,
          time: exam.submittedAt,
          title: exam.result.title,
          number: question.number,
        });
      }
    }
  }
  const latestPractice = new Map<string, AnswerRecord>();
  for (const answer of history.answers) {
    const previous = latestPractice.get(answer.questionId);
    if (!previous || answer.answeredAt >= previous.answeredAt)
      latestPractice.set(answer.questionId, answer);
  }
  const marked = new Set(history.progress.filter((row) => row.marked).map((row) => row.questionId));
  return catalog
    .flatMap((item) => {
      if (filter.skill && item.skill !== filter.skill) return [];
      if (filter.type && item.type_code !== filter.type) return [];
      const exam = latestExam.get(item.id);
      if (!exam || exam.correct) return [];
      const practice = latestPractice.get(item.id);
      if (practice && practice.answeredAt > exam.time && practice.correct) return [];
      return [
        {
          ...item,
          marked: marked.has(item.id),
          updatedAt: exam.time,
          examTitle: exam.title,
          examNumber: exam.number,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.updatedAt - a.updatedAt || a.examNumber - b.examNumber || a.id.localeCompare(b.id),
    );
}

export function reviewQueue(
  catalog: readonly ReviewItem[],
  progress: readonly ProgressRecord[],
  filter: { mode: "wrong" | "marked"; skill: string; type: string },
): QueueItem[] {
  const records = new Map(progress.map((row) => [row.questionId, row]));
  return catalog
    .flatMap((item) => {
      const row = records.get(item.id);
      if (
        !row ||
        (filter.mode === "wrong" ? !row.answered || row.lastCorrect !== false : !row.marked)
      )
        return [];
      if (filter.skill && item.skill !== filter.skill) return [];
      if (filter.type && item.type_code !== filter.type) return [];
      return [{ ...item, marked: row.marked, updatedAt: row.updatedAt }];
    })
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
