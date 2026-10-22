/**
 * Nộp bài: tra đề, chấm, trả kết quả. Route handler chỉ lo HTTP; mọi quyết định nằm ở đây
 * (cùng phong cách lib/practice/check.ts).
 */
import { findProgram } from "@/lib/db/programs";
import { InvalidChoiceError, scoreExam } from "./score";
import { getFullExam, type ExamSourceOptions } from "./source";
import type { ExamApiErrorBody, ExamErrorCode, ExamResult, ExamSubmitRequest } from "./types";

export type SubmitOutcome =
  { ok: true; result: ExamResult } | { ok: false; status: 400 | 404; body: ExamApiErrorBody };

export function examApiError(
  status: 400 | 404,
  code: ExamErrorCode,
  message: string,
): Extract<SubmitOutcome, { ok: false }> {
  return { ok: false, status, body: { error: { code, message } } };
}

/**
 * Thứ tự lỗi: program lạ (404), đề không có (404), đáp án không thuộc ①–④ (400).
 * Khoá đáp án không thuộc đề bị bỏ qua. Câu thiếu khoá hoặc null = bỏ trống.
 *
 * TODO(supabase): ghi `attempts` (user_id/guest_id, program, kind, exam_id, started_at = request.startedAt,
 * submitted_at, time_spent_ms, timed_out, score, level) và `answers` từng câu (selected_choice_id,
 * is_correct, time_spent_ms nếu máy khách có) sau khi chấm, khi có CSDL + đăng nhập. Chế độ khách
 * hiện chưa lưu gì ở server.
 */
export function submitExam(
  request: ExamSubmitRequest,
  options: ExamSourceOptions = {},
  now: number = Date.now(),
): SubmitOutcome {
  const program = findProgram(request.program);
  if (!program) {
    return examApiError(
      404,
      "program_not_found",
      `Không tìm thấy chương trình "${request.program}".`,
    );
  }
  const exam = getFullExam(request.program, request.kind, request.examId, options);
  if (!exam) {
    return examApiError(
      404,
      "exam_not_found",
      `Không tìm thấy đề "${request.kind}/${request.examId}".`,
    );
  }
  try {
    const result = scoreExam(exam, request.answers, program, {
      submittedAt: now,
      ...(request.timeSpentMs !== undefined ? { timeSpentMs: request.timeSpentMs } : {}),
      timedOut: request.timedOut === true,
    });
    return { ok: true, result };
  } catch (err) {
    if (err instanceof InvalidChoiceError) {
      return examApiError(400, "invalid_choice", err.message);
    }
    throw err;
  }
}
