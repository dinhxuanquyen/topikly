"use cache";

/**
 * Truy vấn CÓ CACHE cho server component — Luyện tập Viết (xem lý do ở ./queries.ts).
 *
 * Frontend gọi các hàm này từ page/layout. KHÔNG gọi ./writing-source trực tiếp từ page.
 * Phần đề (`WritingPrompt`) nhúng được vào trang. Phần tự so sánh (`WritingReveal`) KHÔNG có hàm
 * ở đây để page không lỡ nhúng sẵn: lấy qua GET /api/practice/writing/reveal sau khi người học bấm.
 */
import { cacheLife } from "next/cache";
import { listWritingPrompts, listWritingTypes, getWritingPrompt } from "./writing-source";
import type { WritingPrompt, WritingTypeSummary } from "./writing-types";

/** Các dạng Viết đang có đề, sắp theo type_code (W51…W54). */
export async function getWritingTypes(program: string): Promise<WritingTypeSummary[]> {
  cacheLife("max");
  return listWritingTypes(program);
}

/** Các đề của một dạng, sắp theo id. Rỗng nghĩa là dạng không tồn tại hoặc chưa có đề. */
export async function getWritingPrompts(
  program: string,
  typeCode: string,
): Promise<WritingPrompt[]> {
  cacheLife("max");
  return listWritingPrompts(program, typeCode);
}

/** Một đề theo id; `null` nếu không có (cache không lưu được `undefined` ổn định). */
export async function getWritingPromptById(
  program: string,
  id: string,
): Promise<WritingPrompt | null> {
  cacheLife("max");
  return getWritingPrompt(program, id) ?? null;
}
