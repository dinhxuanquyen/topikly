import { z } from "zod";
import { EXAM_KINDS } from "@/lib/db/programs";
import { examApiError, submitExam } from "@/lib/exam/submit";
import type { ExamSubmitRequest } from "@/lib/exam/types";

/**
 * POST /api/exam/submit — chấm cả đề ở server.
 *   body: ExamSubmitRequest  ->  200 ExamResult | 400/404 ExamApiErrorBody
 * Đáp án đúng và lời giải chỉ có trong kết quả này, không có trong đề gửi xuống trước khi nộp.
 * POST không bị cache theo Next 16 (Route Handlers chỉ cache GET).
 */

/** Đề 50 câu x ~25 ký tự cho mỗi cặp id: đáp án cũng dưới 4KB; để dư cho đề Full 2 phần. */
const MAX_BODY_CHARS = 16 * 1024;
const MAX_ANSWERS = 200;
/** 24 giờ: chặn giá trị rác làm bẩn thống kê thời gian làm bài. */
const MAX_TIME_SPENT_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  program: z.string().min(1).max(64),
  kind: z.enum(EXAM_KINDS),
  examId: z.string().min(1).max(64),
  // Giá trị nhãn kiểm ở lib/exam/score.ts để trả mã invalid_choice riêng.
  answers: z
    .record(z.string().min(1).max(64), z.string().max(8).nullable())
    .refine((a) => Object.keys(a).length <= MAX_ANSWERS, { error: "quá nhiều đáp án" }),
  startedAt: z.number().int().min(0).optional(),
  timeSpentMs: z.number().int().min(0).max(MAX_TIME_SPENT_MS).optional(),
  timedOut: z.boolean().optional(),
});

function respond(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    const e = examApiError(400, "invalid_body", "Dữ liệu gửi lên quá lớn.");
    return respond(e.status, e.body);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const e = examApiError(400, "invalid_json", "Nội dung gửi lên không phải JSON hợp lệ.");
    return respond(e.status, e.body);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const e = examApiError(
      400,
      "invalid_body",
      "Dữ liệu không hợp lệ: cần program, kind (full|mini|hard|ibt), examId, answers (questionId -> ①–④ hoặc null), và tuỳ chọn startedAt, timeSpentMs, timedOut.",
    );
    return respond(e.status, e.body);
  }

  const outcome = submitExam(parsed.data satisfies ExamSubmitRequest);
  return outcome.ok ? respond(200, outcome.result) : respond(outcome.status, outcome.body);
}
