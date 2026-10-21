import { z } from "zod";
import { apiError, checkPracticeAnswer } from "@/lib/practice/check";
import type { CheckRequest } from "@/lib/practice/types";

/**
 * POST /api/practice/check — chấm một câu trắc nghiệm ở server.
 *   body: CheckRequest  ->  200 CheckResponse | 400/404 ApiErrorBody
 * POST không bị cache theo Next 16 (Route Handlers chỉ cache GET), nên không cần cấu hình thêm.
 */

const MAX_BODY_CHARS = 2048;
/** 24 giờ: chặn giá trị rác làm bẩn thống kê thời gian làm bài. */
const MAX_TIME_SPENT_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  program: z.string().min(1).max(64),
  questionId: z.string().min(1).max(64),
  // Bắt buộc có khoá; null = bỏ trống / hết giờ.
  selectedLabel: z.string().max(8).nullable(),
  timeSpentMs: z.number().int().min(0).max(MAX_TIME_SPENT_MS).optional(),
});

function respond(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    const e = apiError(400, "invalid_body", "Dữ liệu gửi lên quá lớn.");
    return respond(e.status, e.body);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const e = apiError(400, "invalid_json", "Nội dung gửi lên không phải JSON hợp lệ.");
    return respond(e.status, e.body);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const e = apiError(
      400,
      "invalid_body",
      "Dữ liệu không hợp lệ: cần program, questionId, selectedLabel (①–④ hoặc null) và timeSpentMs (số nguyên ms, tuỳ chọn).",
    );
    return respond(e.status, e.body);
  }

  const outcome = checkPracticeAnswer(parsed.data satisfies CheckRequest);
  return outcome.ok ? respond(200, outcome.response) : respond(outcome.status, outcome.body);
}
