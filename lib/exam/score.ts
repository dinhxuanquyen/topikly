/**
 * Chấm đề thi ở server. Hàm thuần: nhận bản đầy đủ của đề (FullExam) + đáp án người học + cấu hình
 * chương trình, trả về `ExamResult`. Không đọc đĩa, không đọc đồng hồ (trừ `submittedAt` mặc định),
 * nên test được từng nhánh. Từng câu chấm bằng `gradeQuestion` của Luyện tập để hai trụ luôn cùng
 * một cách chấm.
 *
 * Điểm: phần thi quy theo thang `max_score` của phần: round(đúng / tổng × max_score), tính trên số
 * câu THẬT của đề (Mini ít câu hơn đề thật). Cấp: so điểm tổng (hoặc điểm chiếu lên thang tổng khi
 * đề không phủ hết các phần thi của chương trình) với `level_thresholds`.
 *
 * Phần Viết (`skill: "writing"`) KHÔNG được chấm: không vào `sections`, `questions`, `by_*`, điểm
 * tổng hay `level`. Server chỉ kiểm hình dạng bài nộp, đếm ký tự và trả `ExamResult.writing` (bài đã
 * nộp + bài mẫu) để người học tự chấm (./writing-self-score.ts). Đề không có phần tự động (Mini Viết)
 * có `sections: []` và `level: null`.
 *
 * Đề `placement` (Test trình độ) thêm `ExamResult.placement` (xem ./placement.ts).
 */
import type { ProgramConfig } from "@/lib/db/programs";
import { gradeQuestion } from "@/lib/practice/check";
import { CHOICE_LABELS, type ChoiceLabel } from "@/lib/practice/types";
import { comparedScoreOf, levelFromThresholds } from "./level";
import { estimatePlacement, type PlacementItem } from "./placement";
import type { FullExam, FullExamSection } from "./source";
import type {
  BreakdownRow,
  ExamResult,
  LevelEstimate,
  QuestionResult,
  SectionResult,
} from "./types";
import { buildWritingReview } from "./writing-review";

/** Đáp án không phải ①–④ (hoặc không phải chuỗi). Route đổi thành lỗi 400 `invalid_choice`. */
export class InvalidChoiceError extends Error {
  readonly code = "invalid_choice";
  constructor(
    readonly questionId: string,
    readonly value: unknown,
  ) {
    super(
      `Phương án "${String(value)}" của câu ${questionId} không hợp lệ, chỉ nhận ${CHOICE_LABELS.join(", ")}.`,
    );
    this.name = "InvalidChoiceError";
  }
}

export interface ScoreMeta {
  timeSpentMs?: number;
  timedOut?: boolean;
  /** Thời điểm nộp (ms epoch). Mặc định Date.now(). */
  submittedAt?: number;
  /**
   * Bài Viết thô (`ExamSubmitRequest.writing`), chưa tin cậy: kiểm hình dạng trong
   * `buildWritingReview`, sai thì ném `InvalidWritingAnswerError` (route đổi thành 400
   * `invalid_writing_answer`). Bỏ qua nếu đề không có phần Viết.
   */
  writing?: unknown;
}

function isChoiceLabel(value: unknown): value is ChoiceLabel {
  return typeof value === "string" && (CHOICE_LABELS as readonly string[]).includes(value);
}

// ------------------------------------------------------------------ quy đổi cấp

/**
 * Cấp theo điểm so sánh. `comparedScore` đã ở thang tổng của chương trình. Dưới ngưỡng thấp nhất
 * -> `level: null`. `next_level` là cấp kế tiếp (null nếu đã ở cấp cao nhất).
 */
export function estimateLevel(
  comparedScore: number,
  program: ProgramConfig,
  isEstimate: boolean,
): LevelEstimate {
  // Logic thuần nằm ở ./level để máy khách dùng chung khi tính cấp sau khi tự chấm Viết.
  return levelFromThresholds(
    comparedScore,
    program.level_thresholds,
    program.total_max_score,
    isEstimate,
  );
}

// ------------------------------------------------------------------ chấm đề

export function scoreExam(
  exam: FullExam,
  answers: Readonly<Record<string, string | null | undefined>>,
  program: ProgramConfig,
  meta: ScoreMeta = {},
): ExamResult {
  const sections: SectionResult[] = [];
  const questions: QuestionResult[] = [];
  const groupAcc = new Map<string, { correct: number; total: number; codes: Set<string> }>();
  const subskillAcc = new Map<string, { correct: number; total: number; codes: Set<string> }>();
  const placementItems: PlacementItem[] = [];
  let anySectionShort = false;
  let writingSection: FullExamSection | undefined;

  const bump = (
    map: Map<string, { correct: number; total: number; codes: Set<string> }>,
    key: string,
    correct: boolean,
    typeCode: string,
  ) => {
    const acc = map.get(key) ?? { correct: 0, total: 0, codes: new Set<string>() };
    acc.total += 1;
    if (correct) acc.correct += 1;
    acc.codes.add(typeCode);
    map.set(key, acc);
  };

  for (const section of exam.sections) {
    if (section.skill === "writing") {
      // Không chấm: chỉ ghi nhận để dựng `writing` sau khi biết điểm các phần tự động.
      writingSection = section;
      const writingConfig = program.sections.find((s) => s.skill === "writing");
      if (writingConfig && section.question_count < writingConfig.question_count) {
        anySectionShort = true;
      }
      continue;
    }
    let correct = 0;
    let unanswered = 0;

    for (const item of section.questions) {
      const { question } = item;
      const raw = Object.prototype.hasOwnProperty.call(answers, question.id)
        ? answers[question.id]
        : null;
      let selected: ChoiceLabel | null = null;
      if (raw !== null && raw !== undefined) {
        if (!isChoiceLabel(raw)) throw new InvalidChoiceError(question.id, raw);
        selected = raw;
      }
      if (selected === null) unanswered += 1;

      const graded = gradeQuestion(question, selected, program);
      if (graded.correct) correct += 1;
      placementItems.push({
        difficulty: question.difficulty,
        correct: graded.correct,
        subskill: question.subskill,
        type_code: question.type_code,
      });
      bump(groupAcc, item.type_group, graded.correct, question.type_code);
      bump(subskillAcc, question.subskill, graded.correct, question.type_code);
      questions.push({
        ...graded,
        number: item.number,
        skill: section.skill,
        type_code: question.type_code,
        type_group: item.type_group,
        subskill: question.subskill,
      });
    }

    const total = section.questions.length;
    const programSection = program.sections.find((s) => s.skill === section.skill);
    if (programSection && total < programSection.question_count) anySectionShort = true;
    sections.push({
      skill: section.skill,
      correct,
      total,
      unanswered,
      score: total > 0 ? Math.round((correct / total) * section.max_score) : 0,
      max_score: section.max_score,
    });
  }

  const totalScore = sections.reduce((n, s) => n + s.score, 0);
  const totalMax = sections.reduce((n, s) => n + s.max_score, 0);

  // Phủ hết các phần thi của chương trình và đủ số câu -> điểm thật; còn lại chiếu lên thang tổng.
  const coversProgram = program.sections.every((ps) =>
    exam.sections.some((s) => s.skill === ps.skill),
  );
  const isEstimate = !coversProgram || anySectionShort;
  // Đề có Viết: điểm tự động chưa gồm Viết nên luôn chiếu lên thang tổng và coi là ước lượng; cấp
  // chính thức hơn do giao diện tính sau khi người học tự chấm (projectLevelWithWriting).
  const levelIsEstimate = isEstimate || writingSection !== undefined;
  const level =
    sections.length === 0
      ? null
      : estimateLevel(
          comparedScoreOf(totalScore, totalMax, program.total_max_score, levelIsEstimate),
          program,
          levelIsEstimate,
        );
  const writing = writingSection
    ? buildWritingReview(writingSection, meta.writing, {
        thresholds: [...program.level_thresholds].sort((a, b) => a.min_score - b.min_score),
        total_max_score: program.total_max_score,
        auto_score: totalScore,
        auto_max_score: totalMax,
        is_estimate: isEstimate,
      })
    : undefined;

  const groupOrder = new Map(program.type_groups.map((g, i) => [g.group, i]));
  const by_type_group: BreakdownRow[] = [...groupAcc]
    .map(([code, acc]) => ({
      code,
      name_vi: program.type_groups.find((g) => g.group === code)?.name_vi ?? code,
      correct: acc.correct,
      total: acc.total,
      type_codes: [...acc.codes].sort(),
    }))
    .sort((a, b) => (groupOrder.get(a.code) ?? 1e9) - (groupOrder.get(b.code) ?? 1e9));

  const by_subskill: BreakdownRow[] = [...subskillAcc]
    .map(([code, acc]) => ({
      code,
      name_vi: program.subskills.find((s) => s.code === code)?.name_vi ?? code,
      correct: acc.correct,
      total: acc.total,
      type_codes: [...acc.codes].sort(),
    }))
    .sort(
      (a, b) =>
        a.correct / a.total - b.correct / b.total ||
        b.total - a.total ||
        a.code.localeCompare(b.code),
    );

  return {
    examId: exam.id,
    program: exam.program,
    kind: exam.kind,
    title: exam.title,
    submittedAt: meta.submittedAt ?? Date.now(),
    ...(meta.timeSpentMs !== undefined ? { timeSpentMs: meta.timeSpentMs } : {}),
    timedOut: meta.timedOut === true,
    sections,
    total_score: totalScore,
    total_max_score: totalMax,
    level,
    ...(writing ? { writing } : {}),
    // Test trình độ: ước lượng cấp xuất phát + kỹ năng con yếu; `level` ở trên chỉ để không vỡ kiểu.
    ...(exam.kind === "placement" ? { placement: estimatePlacement(placementItems, program) } : {}),
    by_type_group,
    by_subskill,
    questions,
  };
}
