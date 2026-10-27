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

/**
 * Loại đề thi. Trùng `ExamKind` ở lib/exam/types.ts (khai báo lại để lib/db không phụ thuộc lib/exam)
 * và enum Postgres `exam_kind`. `placement` = Test trình độ (đề ngắn ước lượng cấp xuất phát, không
 * nằm trong danh sách đề của trụ Đề thi).
 */
export const EXAM_KINDS = ["full", "mini", "hard", "ibt", "placement"] as const;
export type ExamKindCode = (typeof EXAM_KINDS)[number];

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
  /**
   * Lệnh nhóm tiếng Hàn in một lần ở đầu khối khi lắp đề (content-spec 4.5, mục 5.2).
   * Mẫu có chỗ thay số câu: `{from}` và `{to}` là số câu đầu/cuối của khối TRONG ĐỀ (khi from == to,
   * "n~n" được rút thành "n"). Ví dụ `※ [{from}~{to}] (   )에 들어갈 가장 알맞은 것을 고르십시오.`
   * Hiện có cho Đọc; Nghe/Viết chưa có (tuỳ chọn).
   */
  instruction_ko?: string;
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

/** Danh sách đóng của tag (content-spec §6). */
export interface TagVocabulary {
  topic: readonly string[];
  genre: readonly string[];
  setting: readonly string[];
  /** Tiền tố cho giá trị tự do (grammar, connector, idiom, vocab). */
  free_prefixes: readonly string[];
  /** Quá số này thì cảnh báo. */
  max_tags: number;
}

/** Ước tính ô 원고지 (content-spec §5.7). */
export interface ManuscriptConfig {
  cells_per_line: number;
  indent_cells: number;
}

/** Giới hạn mềm cho bài mẫu Viết (content-spec §4.6): vượt thì cảnh báo. */
export interface SampleSoftLimit {
  max_chars: number;
  max_cells: number;
}

/** Cấu trúc một phần thi của đề theo loại (số câu, thời gian). Giá trị cấu hình, không hard-code. */
export interface ExamBlueprint {
  question_count: number;
  duration_sec: number;
}

/** Cấu trúc đề theo loại rồi theo kỹ năng. Loại không khai báo (vd. Full) lấy theo `sections`. */
export type ExamBlueprints = Partial<Record<ExamKindCode, Partial<Record<Skill, ExamBlueprint>>>>;

/** Một mã trong danh sách đóng kèm nhãn tiếng Việt (tên hiển thị lấy từ cấu hình, không hard-code ở UI). */
export interface LabelConfig {
  code: string;
  name_vi: string;
  /** Tên tiếng Hàn (nếu có), ví dụ "명사" cho `noun`. */
  name_ko?: string;
}

/**
 * Cấu hình từ vựng & ngữ pháp (vocab-grammar-spec §3.4, §5.2, content-spec §6): danh sách đóng
 * và nhãn hiển thị. Validator và UI cùng đọc từ đây.
 */
export interface LexiconConfig {
  /** Từ loại (vocab-grammar-spec §3.4). */
  pos: readonly LabelConfig[];
  /** Chức năng ngữ pháp (vocab-grammar-spec §5.2). */
  grammar_functions: readonly LabelConfig[];
  /** Chủ đề của từ (giá trị `topic:` ở content-spec §6, trùng `tag_vocabulary.topic`). */
  topics: readonly LabelConfig[];
  /** Cấp từ vựng / ngữ pháp của chương trình (gồm hai đầu). Ngoài khoảng này chỉ cảnh báo. */
  level_range: { min: number; max: number };
}

/**
 * Cấu hình Test trình độ (loại đề `placement`) của chương trình. Số câu và thời gian nằm ở
 * `exam_blueprints.placement`, không lặp lại ở đây.
 */
export interface PlacementConfig {
  /** Id đề test trình độ đang dùng (file content/<program>/exams/placement/<id>.yaml). */
  exam_id: string;
  /** Tỉ lệ đúng tối thiểu để coi là vững một bậc độ khó (content-spec §2.3: vững cấp đó làm đúng ~60–70%). */
  band_pass_ratio: number;
  /** Số kỹ năng con yếu nhất trả về để Lộ trình ưu tiên. */
  weak_subskill_count: number;
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
  /** Giá trị cho phép của speakers[].age_range (content-spec §5.4). */
  speaker_age_ranges: readonly string[];
  tag_vocabulary: TagVocabulary;
  lexicon: LexiconConfig;
  manuscript: ManuscriptConfig;
  /** Theo type_code Viết (W53, W54). */
  writing_sample_limits: Readonly<Record<string, SampleSoftLimit>>;
  /**
   * Điểm tối đa của từng câu Viết trong đề, theo type_code (W51–W54). DỮ LIỆU cấu hình: tổng các câu
   * Viết của một đề đủ bốn dạng = `max_score` của phần Viết trong `sections` (TOPIK II: 10+10+30+50 =
   * 100). Đề ít câu hơn thì điểm phần Viết được quy theo tỉ lệ (xem lib/exam/writing-self-score.ts).
   * Chương trình không có phần Viết để `{}`.
   */
  writing_points: Readonly<Record<string, number>>;
  /** Các subskill được miễn quy tắc "ít nhất 2 kiểu trap" (content-spec §2.2). */
  multi_trap_exempt_subskills: readonly string[];
  /**
   * Cấu trúc đề rút gọn theo loại (Mini test…). Full không cần khai báo: dùng `sections`.
   * Tra qua `getExamBlueprint(program, kind, skill)`.
   */
  exam_blueprints: ExamBlueprints;
  /** Test trình độ (đề `placement`): đề đang dùng, ngưỡng vững một bậc, số kỹ năng yếu trả về. */
  placement: PlacementConfig;
  type_groups: readonly TypeGroupConfig[];
  question_types: readonly QuestionTypeConfig[];
}
