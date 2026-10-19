/**
 * Cấu hình chương trình thi — DỮ LIỆU, không phải hằng số trong logic.
 * Mọi chương trình (topik-ii, topik-i, eps) cùng tuân theo kiểu này; code nghiệp vụ
 * (scoring, planner, validate…) chỉ đọc cấu hình qua `getProgram(code)`.
 * Nguồn nội dung của taxonomy: content-spec (mục 1–3).
 */

export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];

export const PROGRAM_CODES = ["topik-ii", "topik-i", "eps"] as const;
export type ProgramCode = (typeof PROGRAM_CODES)[number];

export interface SectionConfig {
  skill: Skill;
  /** Thứ tự phần thi trong đề (1-based). */
  order: number;
  question_count: number;
  duration_sec: number;
  max_score: number;
  /** Khoảng số câu của phần thi (gồm hai đầu). */
  range: readonly [number, number];
}

export interface LevelThreshold {
  /** Cấp, vd. 3 = 3급. */
  level: number;
  label: string;
  min_score: number;
}

/** Danh mục subskill (content-spec 2.1). */
export interface SubskillConfig {
  code: string;
  name_vi: string;
}

/** Danh mục kiểu bẫy cho phương án nhiễu (content-spec 2.2). */
export interface TrapConfig {
  code: string;
  name_vi: string;
}

/** Nhóm dạng = đơn vị của thẻ luyện tập và thống kê điểm yếu: R39-41, L21-22, W53. */
export interface TypeGroupConfig {
  /** Mã nhóm: `<tiền tố><đầu>-<cuối>` hoặc `W53` khi chỉ có một câu. */
  group: string;
  skill: Skill;
  /** Khoảng số câu [từ, đến] gồm hai đầu. */
  range: readonly [number, number];
  name_vi: string;
  /** Các câu trong nhóm dùng chung ngữ liệu (cặp / bộ ba) -> file có group_key. */
  paired: boolean;
}

export interface QuestionTypeConfig {
  /** Theo TỪNG vị trí câu: tiền tố 'L'/'R'/'W' + số câu 2 chữ số (L01, R40, W54). */
  code: string;
  skill: Skill;
  /** Mã nhóm dạng chứa code này (vd. "R39-41"). */
  type_group: string;
  /** Khoảng số câu của NHÓM [từ, đến]. */
  range: readonly [number, number];
  name_vi: string;
  /** subskill chính (mặc định). */
  subskill: string;
  /** Tập subskill cho phép = chính + phụ. */
  allowed_subskills: readonly string[];
  /** Độ khó điển hình [min, max] (thang 3–6). */
  typical_difficulty: readonly [number, number];
  /** Dạng trắc nghiệm (có choices) hay tự luận (Viết). */
  format: "multiple_choice" | "constructed";
  /** Thuộc bộ dùng chung ngữ liệu (cần group_key). */
  paired: boolean;
  /** Giới hạn ký tự bài viết (W53, W54) — file YAML phải khớp. */
  char_limit?: { min: number; max: number };
}

export interface ProgramConfig {
  code: ProgramCode;
  name: string;
  total_max_score: number;
  sections: readonly SectionConfig[];
  /** Ngưỡng cấp theo điểm tổng, sắp tăng dần theo min_score. Dưới ngưỡng thấp nhất = không đạt cấp. */
  level_thresholds: readonly LevelThreshold[];
  subskills: readonly SubskillConfig[];
  traps: readonly TrapConfig[];
  /** Thang độ khó của câu hỏi (content-spec 2.3). */
  difficulty_range: { min: number; max: number };
  type_groups: readonly TypeGroupConfig[];
  question_types: readonly QuestionTypeConfig[];
}
