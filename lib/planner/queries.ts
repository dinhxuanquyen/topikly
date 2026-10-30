"use cache";

import { cacheLife } from "next/cache";
import { findProgram } from "@/lib/db/programs";
import { getExams, getExam } from "@/lib/exam/queries";
import { getVocabList, getGrammarList } from "@/lib/lexicon/queries";
import { getPracticeTypes, getPracticeQuestions } from "@/lib/practice/queries";
import type { PlannerCatalog, PlanResource } from "./plan";

/** Dữ liệu công khai đã có truy vấn cache; không gửi đáp án hay bài mẫu cho trình lập lịch. */
export async function getPlannerCatalog(program: string): Promise<PlannerCatalog> {
  cacheLife("max");
  const config = findProgram(program);
  if (!config) return { levels: [], resources: [] };
  const [words, grammar, types, exams] = await Promise.all([
    getVocabList(program),
    getGrammarList(program),
    getPracticeTypes(program),
    getExams(program, "mini"),
  ]);
  const base = `/${program}`;
  const resources: PlanResource[] = [
    ...words.map((word) => ({
      id: word.id,
      kind: "vocab" as const,
      title: `${word.hangul} — ${word.meaning_vi}`,
      href: `${base}/ly-thuyet/tu-vung/${word.id}`,
      level: word.level,
    })),
    ...grammar.map((point) => ({
      id: point.id,
      kind: "grammar" as const,
      title: `${point.pattern} — ${point.meaning_vi}`,
      href: `${base}/ly-thuyet/ngu-phap/${point.slug}`,
      level: point.level,
    })),
  ];
  const practice = await Promise.all(
    types.map(async (type): Promise<PlanResource | null> => {
      const questions = await getPracticeQuestions(program, type.type_code);
      if (!questions.length) return null;
      const transcriptOnly = type.skill === "listening" && !questions.some((q) => q.audio_url);
      return {
        id: type.type_code,
        kind: "practice",
        title: `${transcriptOnly ? "Đọc lời thoại: " : ""}${type.name_vi}`,
        href: `${base}/luyen-tap/${type.skill === "reading" ? "doc" : "nghe"}/${type.type_code}`,
        level: Math.min(...questions.map((q) => q.difficulty)),
        typeCodes: [type.type_code],
      };
    }),
  );
  resources.push(...practice.filter((r): r is PlanResource => r !== null));
  const mini = await Promise.all(exams.map((exam) => getExam(program, "mini", exam.id)));
  for (const exam of mini) {
    if (!exam) continue;
    // Đề Nghe nháp không có audio: chưa xếp lịch thi nghe như một đề hoàn chỉnh.
    const missingAudio = exam.sections.some(
      (section) =>
        section.skill === "listening" &&
        section.blocks.some((block) => block.questions.some((item) => !item.question.audio_url)),
    );
    if (missingAudio) continue;
    resources.push({
      id: exam.id,
      kind: "mini_test",
      title: exam.title,
      href: `${base}/de-thi/mini/${exam.id}`,
      level: config.difficulty_range.min,
      durationMinutes: Math.ceil(exam.duration_sec / 60),
    });
  }
  return {
    levels: config.level_thresholds.map(({ level, label }) => ({ level, label })),
    resources,
  };
}
