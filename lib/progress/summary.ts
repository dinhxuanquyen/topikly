import { addDays, dateKey } from "@/lib/planner/plan";
import {
  computeTypeStats,
  groupStatsByType,
  type AnswerRecord,
} from "@/components/practice/guest-stats";

export function progressSummary(answers: readonly AnswerRecord[], program: string, now: number) {
  const relevant = answers.filter(
    (answer) => answer.program === program && answer.answeredAt <= now,
  );
  const today = dateKey(new Date(now));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const daily = relevant.filter((a) => dateKey(new Date(a.answeredAt)) === date);
    return { date, attempts: daily.length, unique: new Set(daily.map((a) => a.questionId)).size };
  });
  return {
    ...computeTypeStats(relevant),
    attempts: relevant.length,
    days,
    byType: groupStatsByType(relevant),
  };
}
