import { findProgram } from "@/lib/db/programs";
import { apiError } from "@/lib/practice/check";
import { getPracticeQuestions } from "@/lib/practice/queries";

/**
 * GET /api/practice/questions?program=topik-ii&type=R10  ->  200 PublicQuestion[] (không đáp án)
 * Tuỳ chọn cho client cần lấy câu hỏi động; trang chủ yếu lấy qua server component.
 * 400 thiếu tham số; 404 program lạ hoặc dạng chưa có câu.
 */

function respond(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const program = params.get("program");
  const type = params.get("type");
  if (!program || !type) {
    const e = apiError(400, "invalid_query", "Thiếu tham số program hoặc type.");
    return respond(e.status, e.body);
  }
  if (!findProgram(program)) {
    const e = apiError(404, "program_not_found", `Không tìm thấy chương trình "${program}".`);
    return respond(e.status, e.body);
  }
  const questions = await getPracticeQuestions(program, type);
  if (questions.length === 0) {
    const e = apiError(404, "type_not_found", `Dạng "${type}" chưa có câu luyện tập.`);
    return respond(e.status, e.body);
  }
  return respond(200, questions);
}
