/**
 * Tự chấm phần Viết trong đề thi (MVP: KHÔNG chấm tự động). Người học đối chiếu bài của mình với bài
 * mẫu/rubric trong `ExamResult.writing`, tự nhập điểm từng câu (0..max_points); giao diện dùng các hàm
 * ở đây để ra điểm phần Viết và cấp ước lượng.
 *
 * File này AN TOÀN CHO CLIENT: hàm thuần, chỉ import kiểu và ./level (cũng thuần). Không import fs,
 * zod hay registry chương trình: mọi dữ kiện cần (thang điểm, ngưỡng cấp, điểm Đọc/Nghe) đã được
 * server nhúng vào `WritingReview` / `WritingReview.level_basis`.
 *
 * Quy ước điểm: điểm tự chấm làm tròn về số nguyên rồi kẹp vào [0, max_points] của từng câu; câu thiếu
 * hoặc không phải số hữu hạn tính 0 và không đếm vào `scored_count`.
 */
import { comparedScoreOf, levelFromThresholds } from "./level";
import type { LevelEstimate, WritingReview } from "./types";

/** Giới hạn ký tự của bài essay (W53–W54) khi nộp: chặn dữ liệu rác, rộng hơn nhiều so với khung 200–700. */
export const WRITING_TEXT_MAX_CHARS = 5000;
/** Giới hạn ký tự của một chỗ trống (W51–W52): đáp án là một câu. */
export const WRITING_BLANK_MAX_CHARS = 500;

/** Điểm tự chấm của từng câu Viết, khoá = id câu (`WritingReviewItem.id`). */
export type WritingSelfPoints = Readonly<Record<string, number | null | undefined>>;

/** Dữ kiện tối thiểu của phần Viết mà các hàm cần (đủ để test không cần dựng cả kết quả). */
export type WritingReviewScale = Pick<WritingReview, "items" | "max_score" | "max_points_total">;

export interface WritingScoreProjection {
  /** Tổng điểm tự chấm các câu (đã làm tròn và kẹp). */
  points: number;
  /** Tổng điểm tối đa các câu Viết có trong đề (`max_points_total`). */
  max_points: number;
  /** Số câu đã có điểm tự chấm hợp lệ. */
  scored_count: number;
  total_count: number;
  /** Điểm phần Viết trên thang `max_score` của chương trình: round(points / max_points × max_score). */
  score: number;
  max_score: number;
}

/** Làm tròn về số nguyên và kẹp vào [0, max]. Không phải số hữu hạn -> 0. */
export function clampSelfPoints(value: number | null | undefined, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), Math.max(max, 0));
}

/**
 * Điểm phần Viết từ điểm tự chấm từng câu. Đề đủ 4 câu thì `score` = `points` (10+10+30+50 = 100);
 * đề thiếu câu thì quy theo tỉ lệ, cùng quy ước với phần trắc nghiệm của Mini test.
 */
export function projectWritingScore(
  review: WritingReviewScale,
  selfPoints: WritingSelfPoints,
): WritingScoreProjection {
  let points = 0;
  let scored = 0;
  for (const item of review.items) {
    const raw = Object.prototype.hasOwnProperty.call(selfPoints, item.id)
      ? selfPoints[item.id]
      : undefined;
    if (typeof raw === "number" && Number.isFinite(raw)) scored += 1;
    points += clampSelfPoints(raw, item.max_points);
  }
  const score =
    review.max_points_total > 0
      ? Math.round((points / review.max_points_total) * review.max_score)
      : 0;
  return {
    points,
    max_points: review.max_points_total,
    scored_count: scored,
    total_count: review.items.length,
    score,
    max_score: review.max_score,
  };
}

export interface LevelWithWriting {
  writing: WritingScoreProjection;
  /** Điểm Đọc/Nghe tự động + điểm Viết tự chấm. */
  total_score: number;
  /** Tổng thang các phần có trong đề. */
  total_max_score: number;
  /**
   * Cấp ước lượng gồm cả Viết tự chấm. `is_estimate` lấy từ `level_basis` (Mini/đề thiếu phần = true:
   * điểm được chiếu lên thang tổng của chương trình). Nên hiển thị là ước lượng vì Viết do người học tự chấm.
   */
  level: LevelEstimate;
}

/**
 * Cấp ước lượng sau khi tự chấm Viết. Dùng lại cùng quy tắc với server (`levelFromThresholds`):
 *  - Mini Viết (chỉ Viết): điểm Viết chiếu lên thang tổng (vd. 70/100 -> 210/300 -> 5급).
 *  - Đề có Đọc/Nghe tự động + Viết: cộng điểm rồi chiếu (hoặc so thẳng nếu đề đủ).
 */
export function projectLevelWithWriting(
  review: WritingReview,
  selfPoints: WritingSelfPoints,
): LevelWithWriting {
  const writing = projectWritingScore(review, selfPoints);
  const basis = review.level_basis;
  const totalScore = basis.auto_score + writing.score;
  const totalMax = basis.auto_max_score + review.max_score;
  const compared = comparedScoreOf(totalScore, totalMax, basis.total_max_score, basis.is_estimate);
  return {
    writing,
    total_score: totalScore,
    total_max_score: totalMax,
    level: levelFromThresholds(
      compared,
      basis.thresholds,
      basis.total_max_score,
      basis.is_estimate,
    ),
  };
}
