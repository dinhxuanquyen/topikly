import { findProgram } from "@/lib/db/programs";
import { searchLexicon } from "@/lib/lexicon/source";
import type { LexiconErrorBody, LexiconErrorCode } from "@/lib/lexicon/types";

/**
 * GET /api/lexicon/search?program=topik-ii&q=xã hội&limit=20  ->  200 LexiconSearchResponse
 * Tìm từ vựng (hangul, hanja, âm Hán-Việt, nghĩa) và ngữ pháp (pattern, biến thể, nghĩa);
 * không phân biệt dấu và hoa thường. `limit` mặc định 20, tối đa 50, áp cho từng nhóm kết quả.
 * 400 thiếu tham số hoặc `q` quá dài / `limit` sai; 404 program lạ.
 */

const MAX_QUERY_CHARS = 64;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function respond(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function fail(status: 400 | 404, code: LexiconErrorCode, message: string): Response {
  const body: LexiconErrorBody = { error: { code, message } };
  return respond(status, body);
}

export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  const program = params.get("program");
  const q = params.get("q");
  if (!program || q === null) return fail(400, "invalid_query", "Thiếu tham số program hoặc q.");
  if (Array.from(q).length > MAX_QUERY_CHARS) {
    return fail(400, "invalid_query", `Từ khoá tối đa ${MAX_QUERY_CHARS} ký tự.`);
  }
  let limit = DEFAULT_LIMIT;
  const rawLimit = params.get("limit");
  if (rawLimit !== null) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return fail(400, "invalid_query", `limit phải là số nguyên từ 1 đến ${MAX_LIMIT}.`);
    }
  }
  if (!findProgram(program)) {
    return fail(404, "program_not_found", `Không tìm thấy chương trình "${program}".`);
  }
  return respond(200, searchLexicon(program, q, limit));
}
