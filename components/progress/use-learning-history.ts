"use client";

import { useEffect, useState } from "react";
import {
  loadAnswers,
  loadProgress,
  subscribeGuestChanges,
} from "@/components/practice/guest-store";
import { loadExamHistory } from "@/components/exam/exam-store";
import type { AnswerRecord, ProgressRecord } from "@/components/practice/guest-stats";
import type { ExamResultRecord } from "@/components/exam/exam-state";

interface History {
  program: string;
  ready: boolean;
  failed: boolean;
  answers: AnswerRecord[];
  progress: ProgressRecord[];
  exams: ExamResultRecord[];
}
export function useLearningHistory(program: string) {
  const [history, setHistory] = useState<History>({
    program,
    ready: false,
    failed: false,
    answers: [],
    progress: [],
    exams: [],
  });
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const refresh = () => {
      const request = ++sequence;
      void Promise.all([
        loadAnswers(program),
        loadProgress(program),
        loadExamHistory(program),
      ]).then(([answers, progress, exams]) => {
        if (active && request === sequence)
          setHistory({
            program,
            ready: true,
            failed: progress === null || exams === null,
            answers,
            progress: progress ?? [],
            exams: exams ?? [],
          });
      });
    };
    refresh();
    const unsubscribe = subscribeGuestChanges(refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("topikly:exam-changed", refresh);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("topikly:exam-changed", refresh);
    };
  }, [program]);
  return history.program === program
    ? history
    : { program, ready: false, failed: false, answers: [], progress: [], exams: [] };
}
