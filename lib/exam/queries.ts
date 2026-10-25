"use cache";

/**
 * Truy vấn CÓ CACHE cho server component (Next 16, cacheComponents: true), cùng lý do và cách dùng
 * như lib/practice/queries.ts: đối số là chuỗi, kết quả là object thuần, profile `max`.
 *
 * Frontend gọi các hàm này từ page/layout. KHÔNG gọi ./source trực tiếp từ page.
 * Chỉ trả kiểu công khai (không đáp án). Chấm bài qua POST /api/exam/submit.
 */
import { cacheLife } from "next/cache";
import { getPlacementPublicExam, getPublicExam, listExams } from "./source";
import type { ExamKind, ExamSummary, PublicExam } from "./types";

/**
 * Danh sách đề của chương trình, sắp theo kind rồi id. `kind` bỏ trống = mọi loại trừ `placement`
 * (đề Test trình độ chỉ lấy khi truyền đúng `kind = "placement"` hoặc qua `getPlacementExam`).
 */
export async function getExams(program: string, kind?: ExamKind): Promise<ExamSummary[]> {
  cacheLife("max");
  return listExams(program, kind);
}

/** Một đề đầy đủ để làm bài (không đáp án); `null` nếu không có. */
export async function getExam(
  program: string,
  kind: string,
  examId: string,
): Promise<PublicExam | null> {
  cacheLife("max");
  return getPublicExam(program, kind, examId) ?? null;
}

/**
 * Đề Test trình độ đang dùng của chương trình (`ProgramConfig.placement.exam_id`), không đáp án;
 * `null` nếu chương trình lạ hoặc chưa có đề. Nộp bài: POST /api/exam/submit với kind "placement".
 */
export async function getPlacementExam(program: string): Promise<PublicExam | null> {
  cacheLife("max");
  return getPlacementPublicExam(program) ?? null;
}
