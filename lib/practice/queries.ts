"use cache";

/**
 * Truy vấn CÓ CACHE cho server component (Next 16, cacheComponents: true).
 *
 * Vì sao có file này: trang server component đọc dữ liệu từ đĩa nên phải nằm trong một phạm vi
 * "use cache" (hoặc Suspense), nếu không prerender báo lỗi / rơi vào dynamic. Mọi hàm ở đây đều
 * async, đối số là chuỗi nên khoá cache ổn định, kết quả là object thuần nên tuần tự hoá được.
 * Nội dung đổi theo build nên dùng profile `max`; khoá cache đã gồm Build ID, deploy mới là tươi.
 *
 * Frontend gọi các hàm này từ page/layout. KHÔNG gọi ./source trực tiếp từ page.
 * Chỉ trả kiểu Public* (không đáp án). Chấm đáp án qua POST /api/practice/check.
 */
import { cacheLife } from "next/cache";
import { listPracticeTypes, listPublicQuestions, getPublicQuestion } from "./source";
import type { PracticeSkill, PracticeTypeSummary, PublicQuestion } from "./types";

/** Các dạng đang có câu, sắp theo type_code. `skill` bỏ trống = cả Đọc và Nghe. */
export async function getPracticeTypes(
  program: string,
  skill?: PracticeSkill,
): Promise<PracticeTypeSummary[]> {
  cacheLife("max");
  return listPracticeTypes(program, skill);
}

/** Các câu của một dạng, sắp theo id. Rỗng nghĩa là dạng không tồn tại hoặc chưa có câu. */
export async function getPracticeQuestions(
  program: string,
  typeCode: string,
): Promise<PublicQuestion[]> {
  cacheLife("max");
  return listPublicQuestions(program, typeCode);
}

/** Một câu theo id; `null` nếu không có (cache không lưu được `undefined` ổn định). */
export async function getPracticeQuestion(
  program: string,
  id: string,
): Promise<PublicQuestion | null> {
  cacheLife("max");
  return getPublicQuestion(program, id) ?? null;
}
