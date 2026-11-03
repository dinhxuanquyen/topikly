"use client";

import { useEffect } from "react";
import { useLearningHistory } from "@/components/progress/use-learning-history";
import { useReviewCards } from "@/components/lexicon/review-store";
import { autoCompletePlan } from "@/lib/planner/auto-complete";
import type { PlannerCatalog, StudyPlan } from "@/lib/planner/plan";
import { readPlan, writePlan } from "./plan-store";

export function useAutoComplete(
  program: string,
  catalog: PlannerCatalog,
  plan: StudyPlan | null,
  today: string,
) {
  const history = useLearningHistory(program);
  const review = useReviewCards(program);
  // Ignore completion-only changes: a manual uncheck should remain until the next learning event.
  const identity = plan
    ? JSON.stringify([
        plan.createdAt,
        plan.startDate,
        plan.examDate,
        plan.targetLevel,
        plan.minutesPerDay,
        plan.weakTypeCodes,
      ])
    : "";
  useEffect(() => {
    if (!history.ready || !review.ready || !today || !identity) return;
    const latest = readPlan(program).plan;
    if (!latest) return;
    const updated = autoCompletePlan(
      latest,
      catalog,
      history.answers,
      history.exams,
      review.cards,
      Date.now(),
    );
    if (updated !== latest) writePlan(program, updated);
  }, [program, catalog, history, review, today, identity]);
}
