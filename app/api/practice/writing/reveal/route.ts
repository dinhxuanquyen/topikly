import { findProgram } from "@/lib/db/programs";
import { apiError } from "@/lib/practice/check";
import { getWritingReveal } from "@/lib/practice/writing-source";

/**
 * GET /api/practice/writing/reveal?program=topik-ii&id=w53-0002  ->  200 WritingReveal
 * Phần "tự so sánh" của một đề Viết (bài mẫu, đáp án mẫu, ý bắt buộc, biểu hiện, lỗi thường gặp,
 * ghi chú chấm, lời giải). Frontend chỉ gọi SAU KHI người học bấm "Xem bài mẫu", không nhúng
 * sẵn vào trang. Không chấm bài của người học (Giai đoạn 2B).
 * 400 thiếu tham số; 404 program lạ hoặc không có đề.
 */

function respond(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const program = params.get("program");
  const id = params.get("id");
  if (!program || !id) {
    const e = apiError(400, "invalid_query", "Thiếu tham số program hoặc id.");
    return respond(e.status, e.body);
  }
  if (!findProgram(program)) {
    const e = apiError(404, "program_not_found", `Không tìm thấy chương trình "${program}".`);
    return respond(e.status, e.body);
  }
  const reveal = getWritingReveal(program, id);
  if (!reveal) {
    const e = apiError(404, "question_not_found", `Không tìm thấy đề Viết "${id}".`);
    return respond(e.status, e.body);
  }
  return respond(200, reveal);
}
