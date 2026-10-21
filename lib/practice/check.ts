/**
 * Chấm câu trắc nghiệm ở server. Hàm thuần (trừ việc tra câu hỏi qua ./source), dễ test.
 * Route handler chỉ lo HTTP; mọi quyết định chấm nằm ở đây.
 */
import { findProgram } from "@/lib/db/programs";
import type { ProgramConfig } from "@/lib/db/programs";
import { getFullQuestion, type FullQuestion, type PracticeSourceOptions } from "./source";
import {
  CHOICE_LABELS,
  type ApiErrorBody,
  type CheckRequest,
  type CheckResponse,
  type ChoiceLabel,
  type PracticeErrorCode,
} from "./types";

export type CheckOutcome =
  { ok: true; response: CheckResponse } | { ok: false; status: 400 | 404; body: ApiErrorBody };

export function apiError(
  status: 400 | 404,
  code: PracticeErrorCode,
  message: string,
): Extract<CheckOutcome, { ok: false }> {
  return { ok: false, status, body: { error: { code, message } } };
}

function isChoiceLabel(value: string): value is ChoiceLabel {
  return (CHOICE_LABELS as readonly string[]).includes(value);
}

/** Chấm một câu đã tìm được. `selected` đã được kiểm là nhãn hợp lệ hoặc null. */
export function gradeQuestion(
  question: FullQuestion,
  selected: ChoiceLabel | null,
  program: ProgramConfig,
): CheckResponse {
  return {
    questionId: question.id,
    correct: selected !== null && selected === question.correctLabel,
    selectedLabel: selected,
    correctLabel: question.correctLabel,
    explanation_vi: question.explanation_vi,
    ...(question.transcript_vi !== undefined ? { transcript_vi: question.transcript_vi } : {}),
    choices: question.choices.map((c) => {
      const trapName = c.trap ? program.traps.find((t) => t.code === c.trap)?.name_vi : undefined;
      return {
        label: c.label,
        correct: c.correct,
        ...(c.note_vi !== undefined ? { note_vi: c.note_vi } : {}),
        ...(c.trap !== undefined ? { trap: c.trap } : {}),
        ...(trapName !== undefined ? { trap_name_vi: trapName } : {}),
      };
    }),
  };
}

/**
 * Chấm theo CheckRequest đã qua kiểm kiểu. Thứ tự lỗi: program lạ (404), câu không có (404),
 * nhãn không thuộc ①–④ (400).
 *
 * TODO(supabase): ghi `answers` (user_id/guest_id, question_id, selected_choice_id, is_correct,
 * time_spent_ms = request.timeSpentMs, answered_at) tại đây, sau khi chấm, khi có CSDL + đăng nhập.
 * Chế độ khách hiện chưa lưu gì ở server.
 */
export function checkPracticeAnswer(
  request: CheckRequest,
  options: PracticeSourceOptions = {},
): CheckOutcome {
  const program = findProgram(request.program);
  if (!program) {
    return apiError(404, "program_not_found", `Không tìm thấy chương trình "${request.program}".`);
  }
  const question = getFullQuestion(request.program, request.questionId, options);
  if (!question) {
    return apiError(404, "question_not_found", `Không tìm thấy câu hỏi "${request.questionId}".`);
  }

  let selected: ChoiceLabel | null = null;
  if (request.selectedLabel !== null) {
    if (!isChoiceLabel(request.selectedLabel)) {
      return apiError(
        400,
        "invalid_choice",
        `Phương án "${request.selectedLabel}" không hợp lệ, chỉ nhận ${CHOICE_LABELS.join(", ")}.`,
      );
    }
    selected = request.selectedLabel;
  }
  return { ok: true, response: gradeQuestion(question, selected, program) };
}
