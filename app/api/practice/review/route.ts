import { findProgram } from "@/lib/db/programs";
import { getPracticeQuestion } from "@/lib/practice/queries";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const program = params.get("program") ?? "";
  const ids = params.getAll("id");
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (!findProgram(program)) return reply({ error: "Chương trình không tồn tại." }, 404);
  if (
    !ids.length ||
    ids.length > 10 ||
    ids.some((id) => !/^[\w-]{1,64}$/.test(id)) ||
    new Set(ids).size !== ids.length
  )
    return reply({ error: "Chọn từ 1 đến 10 câu khác nhau." }, 400);
  const questions = await Promise.all(ids.map((id) => getPracticeQuestion(program, id)));
  if (questions.some((q) => !q))
    return reply({ error: "Một số câu đã thay đổi. Hãy tải lại trang." }, 404);
  return reply(questions);
}
