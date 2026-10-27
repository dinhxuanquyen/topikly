"use cache";

/**
 * Dữ liệu cho trang chủ (marketing): lấy từ chính kho nội dung và cấu hình chương trình,
 * không viết tay lại. Lý do dùng "use cache" và `cacheLife("max")`: xem ../practice/queries.ts.
 *
 * Câu mẫu trả CẢ đáp án và lời giải phương án nhiễu: đây là câu trình diễn để khách làm thử
 * ngay trên trang chủ, không phải câu trong bài làm, nên không đi qua quy tắc "không gửi đáp án
 * xuống client" của trình luyện tập.
 */
import { cacheLife } from "next/cache";
import { findProgram } from "@/lib/db/programs";
import { getHanjaFamily } from "@/lib/lexicon/source";
import { getFullQuestion, listPracticeTypes } from "@/lib/practice/source";
import { listWritingTypes } from "@/lib/practice/writing-source";

/** Câu làm thử ở màn đầu trang chủ. */
const SHOWCASE_QUESTION_ID = "r26-0001";
/** Chữ Hán của ví dụ 경제 · 經濟 · kinh tế ở thẻ "Từ vựng qua âm Hán-Việt". */
const SHOWCASE_HANJA = "經";

export interface LandingChoice {
  label: string;
  text: string;
  correct: boolean;
  trap_name_vi: string | null;
  note_vi: string | null;
}

export interface LandingQuestion {
  id: string;
  type_code: string;
  skill_slug: "doc" | "nghe";
  type_name_vi: string;
  stem: string;
  passage: string | null;
  choices: LandingChoice[];
}

export interface LandingFamilyWord {
  id: string;
  hangul: string;
  hanja: string | null;
  han_viet: string | null;
  meaning_vi: string;
}

export interface LandingData {
  question: LandingQuestion | null;
  hanja: { hanja: string; ko: string; hv: string; words: LandingFamilyWord[] } | null;
  typeCount: number;
  trapCount: number;
  levels: { level: number; label: string; min_score: number }[];
  totalMaxScore: number;
  sections: { skill: string; max_score: number }[];
}

export async function getLandingData(program: string): Promise<LandingData | null> {
  cacheLife("max");
  const config = findProgram(program);
  if (!config) return null;

  const trapName = new Map(config.traps.map((t) => [t.code, t.name_vi]));
  const full = getFullQuestion(program, SHOWCASE_QUESTION_ID);
  const question: LandingQuestion | null = full
    ? {
        id: full.id,
        type_code: full.type_code,
        skill_slug: full.skill === "listening" ? "nghe" : "doc",
        type_name_vi:
          config.question_types.find((q) => q.code === full.type_code)?.name_vi ?? full.type_code,
        stem: full.stem,
        passage: full.passage?.trim() ?? null,
        choices: full.choices.map((c) => ({
          label: c.label,
          text: c.text,
          correct: c.correct,
          trap_name_vi: c.trap ? (trapName.get(c.trap) ?? null) : null,
          note_vi: c.note_vi ?? null,
        })),
      }
    : null;

  const family = getHanjaFamily(program, SHOWCASE_HANJA);
  const reading = family?.readings[0];
  const hanja =
    family && reading
      ? {
          hanja: family.hanja,
          ko: reading.ko,
          hv: reading.hv,
          words: family.words.slice(0, 4).map((w) => ({
            id: w.id,
            hangul: w.hangul,
            hanja: w.hanja,
            han_viet: w.han_viet,
            meaning_vi: w.meaning_vi,
          })),
        }
      : null;

  return {
    question,
    hanja,
    typeCount:
      listPracticeTypes(program, "listening").length +
      listPracticeTypes(program, "reading").length +
      listWritingTypes(program).length,
    trapCount: config.traps.length,
    levels: config.level_thresholds.map((l) => ({ ...l })),
    totalMaxScore: config.total_max_score,
    sections: config.sections.map((s) => ({ skill: s.skill, max_score: s.max_score })),
  };
}
