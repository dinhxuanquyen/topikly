/**
 * Ước lượng trình độ từ đề `placement` (Test trình độ). Hàm thuần, không đọc đĩa; được `scoreExam`
 * gọi khi `kind === "placement"` và test được riêng.
 *
 * Quy tắc (số liệu lấy từ `ProgramConfig.placement` và `difficulty_range`, không hard-code):
 *  1. Câu được gom theo `difficulty` (bậc độ khó = cấp TOPIK mà câu phân hoá, content-spec §2.3).
 *  2. Một bậc "vững" (`passed`) khi tỉ lệ đúng (đã làm tròn 2 chữ số, đúng như giao diện hiển thị)
 *     >= `placement.band_pass_ratio`.
 *  3. Chuỗi bậc LIÊN TỤC từ `difficulty_range.min`: đi từ bậc thấp lên, dừng ở bậc đầu tiên không
 *     vững HOẶC không có câu trong đề (bậc trống không được bỏ qua, vì chưa hề được kiểm). Validator
 *     (lib/db/exam-validation.ts) chặn đề có bậc trống; luật ở đây là lớp phòng thủ.
 *  4. `estimated_level` = bậc cuối cùng của chuỗi trên; bậc thấp nhất không vững -> null.
 *  5. `start_level` = `estimated_level` ?? `difficulty_range.min`; nhãn lấy từ `level_thresholds`.
 *  6. `weak_subskills`: chỉ xét câu có độ khó <= `(estimated_level ?? difficulty_range.min) + 1`
 *     (không gán "yếu" cho kỹ năng chỉ xuất hiện ở bậc quá xa trình độ). Xếp theo tỉ lệ đúng tăng
 *     dần; hoà thì subskill có câu độ khó nhỏ nhất thấp hơn đứng trước, rồi tới thứ tự trong
 *     `program.subskills`, cuối cùng theo mã.
 */
import type { ProgramConfig } from "@/lib/db/programs";
import type { BreakdownRow, PlacementBand, PlacementEstimate } from "./types";

/** Một câu đã chấm, đủ để gom theo bậc độ khó và theo subskill. */
export interface PlacementItem {
  difficulty: number;
  correct: boolean;
  /** Subskill của câu (mã trong `program.subskills`). */
  subskill: string;
  /** type_code của câu, để dẫn từ kỹ năng yếu sang Luyện tập theo dạng. */
  type_code: string;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Nhãn cấp từ `level_thresholds`; cấp không có ngưỡng thì "Cấp N" (không bịa hậu tố "급"). */
function levelLabel(program: ProgramConfig, level: number): string {
  return program.level_thresholds.find((t) => t.level === level)?.label ?? `Cấp ${level}`;
}

/** Kỹ năng con yếu nhất trong các câu độ khó <= `maxDifficulty` (xem quy tắc 6). */
function weakSubskills(
  items: readonly PlacementItem[],
  maxDifficulty: number,
  program: ProgramConfig,
): BreakdownRow[] {
  const acc = new Map<
    string,
    { correct: number; total: number; minDifficulty: number; codes: Set<string> }
  >();
  for (const item of items) {
    if (item.difficulty > maxDifficulty) continue;
    const row = acc.get(item.subskill) ?? {
      correct: 0,
      total: 0,
      minDifficulty: item.difficulty,
      codes: new Set<string>(),
    };
    row.total += 1;
    if (item.correct) row.correct += 1;
    row.minDifficulty = Math.min(row.minDifficulty, item.difficulty);
    row.codes.add(item.type_code);
    acc.set(item.subskill, row);
  }
  const configOrder = new Map(program.subskills.map((s, i) => [s.code, i]));
  return [...acc]
    .filter(([, r]) => r.correct < r.total)
    .sort(
      ([ca, a], [cb, b]) =>
        a.correct / a.total - b.correct / b.total ||
        a.minDifficulty - b.minDifficulty ||
        (configOrder.get(ca) ?? 1e9) - (configOrder.get(cb) ?? 1e9) ||
        ca.localeCompare(cb),
    )
    .slice(0, program.placement.weak_subskill_count)
    .map(([code, r]) => ({
      code,
      name_vi: program.subskills.find((s) => s.code === code)?.name_vi ?? code,
      correct: r.correct,
      total: r.total,
      type_codes: [...r.codes].sort(),
    }));
}

/** @param items mọi câu của đề đã chấm (mọi phần thi), kèm độ khó, subskill và type_code */
export function estimatePlacement(
  items: readonly PlacementItem[],
  program: ProgramConfig,
): PlacementEstimate {
  const { band_pass_ratio } = program.placement;
  const { min, max } = program.difficulty_range;

  const acc = new Map<number, { correct: number; total: number }>();
  for (const item of items) {
    const band = acc.get(item.difficulty) ?? { correct: 0, total: 0 };
    band.total += 1;
    if (item.correct) band.correct += 1;
    acc.set(item.difficulty, band);
  }

  const bands: PlacementBand[] = [...acc]
    .sort((a, b) => a[0] - b[0])
    .map(([difficulty, { correct, total }]) => {
      const ratio = round2(correct / total);
      return { difficulty, correct, total, ratio, passed: ratio >= band_pass_ratio };
    });

  // Chuỗi liên tục từ bậc thấp nhất: bậc trống hay bậc trượt đều dừng chuỗi.
  let estimated_level: number | null = null;
  for (let d = min; d <= max; d++) {
    const band = bands.find((b) => b.difficulty === d);
    if (!band?.passed) break;
    estimated_level = d;
  }

  const lowestThreshold = [...program.level_thresholds].sort(
    (a, b) => a.min_score - b.min_score,
  )[0];
  const lowestLabel = lowestThreshold?.label ?? levelLabel(program, min);
  const start_level = estimated_level ?? min;

  return {
    estimated_level,
    estimated_label:
      estimated_level === null ? `Chưa đạt ${lowestLabel}` : levelLabel(program, estimated_level),
    start_level,
    start_label: levelLabel(program, start_level),
    bands,
    weak_subskills: weakSubskills(items, start_level + 1, program),
  };
}
