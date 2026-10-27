/**
 * Quy đổi điểm tổng sang cấp — hàm THUẦN, AN TOÀN CHO CLIENT (chỉ import kiểu, không fs/zod/registry
 * chương trình). Server (score.ts) và giao diện (tính cấp sau khi tự chấm Viết) dùng chung một logic.
 */
import type { LevelThreshold } from "@/lib/db/programs/types";
import type { LevelEstimate } from "./types";

/**
 * Cấp theo điểm so sánh. `comparedScore` đã ở thang tổng của chương trình. Dưới ngưỡng thấp nhất ->
 * `level: null`. `next_level` là cấp kế tiếp (null nếu đã ở cấp cao nhất). Không đòi `thresholds`
 * đã sắp.
 */
export function levelFromThresholds(
  comparedScore: number,
  thresholds: readonly LevelThreshold[],
  totalMaxScore: number,
  isEstimate: boolean,
): LevelEstimate {
  const sorted = [...thresholds].sort((a, b) => a.min_score - b.min_score);
  let reached: LevelThreshold | undefined;
  for (const t of sorted) if (comparedScore >= t.min_score) reached = t;
  const next = sorted.find((t) => t.min_score > comparedScore);
  return {
    level: reached?.level ?? null,
    label: reached?.label ?? "Chưa đạt cấp",
    compared_score: comparedScore,
    total_max_score: totalMaxScore,
    is_estimate: isEstimate,
    next_level: next
      ? { level: next.level, label: next.label, points_needed: next.min_score - comparedScore }
      : null,
  };
}

/**
 * Điểm dùng để so ngưỡng. Đề đủ (`isEstimate` = false) so thẳng điểm thật; đề ngắn/thiếu phần chiếu lên
 * thang tổng: round(score / maxScore × totalMaxScore). `maxScore` = 0 (không có điểm nào) -> 0.
 */
export function comparedScoreOf(
  score: number,
  maxScore: number,
  totalMaxScore: number,
  isEstimate: boolean,
): number {
  if (!isEstimate) return score;
  return maxScore === 0 ? 0 : Math.round((score / maxScore) * totalMaxScore);
}
