import { findProgram } from "@/lib/db/programs";
import { apiError } from "@/lib/practice/check";
import { getWritingPrompts } from "@/lib/practice/writing-queries";

/**
 * GET /api/practice/writing/prompts?program=topik-ii&type=W53  ->  200 WritingPrompt[]
 * Chỉ trả phần hiển thị TRƯỚC khi viết (không bài mẫu, không đáp án). Trang chủ yếu lấy qua
 * server component; endpoint này cho client cần lấy đề động.
 * 400 thiếu tham số; 404 program lạ hoặc dạng chưa có đề.
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
  const prompts = await getWritingPrompts(program, type);
  if (prompts.length === 0) {
    const e = apiError(404, "type_not_found", `Dạng "${type}" chưa có đề Viết.`);
    return respond(e.status, e.body);
  }
  return respond(200, prompts);
}
