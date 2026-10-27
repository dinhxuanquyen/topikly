/**
 * Hợp đồng dữ liệu của trụ Đề thi (Giai đoạn 1: Mini test Đọc/Nghe/Viết, Full/Hard/IBT dùng lại sau).
 *
 * File này AN TOÀN CHO CLIENT: chỉ chứa kiểu thuần, không import fs/node, không import zod.
 * Frontend import kiểu từ đây; logic server nằm ở source.ts / score.ts / queries.ts.
 *
 * Nguyên tắc như Luyện tập: `PublicExam` gửi xuống trình duyệt TRƯỚC khi nộp bài nên chỉ chứa
 * `PublicQuestion` (không đáp án, không lời giải). Đáp án, lời giải và điểm chỉ có trong
 * `ExamResult`, do server trả về sau POST /api/exam/submit.
 *
 * Số câu, thời gian, thang điểm và ngưỡng cấp đều lấy từ cấu hình chương trình
 * (`ProgramConfig.sections`, `level_thresholds`, `exam_blueprints`, `writing_points`), không hard-code.
 *
 * Hai loại phần thi:
 *  - Trắc nghiệm (Đọc, Nghe): `PublicExamSection` có `blocks`; server CHẤM TỰ ĐỘNG, kết quả vào
 *    `ExamResult.sections` / `questions` / `by_*`.
 *  - Viết: `PublicExamSection` có `writing_items` (và `blocks: []`); server KHÔNG chấm. Kết quả trả
 *    `ExamResult.writing` (bài đã nộp + đếm ký tự + bài mẫu) để NGƯỜI HỌC TỰ CHẤM, rồi giao diện tính
 *    điểm ước lượng bằng các hàm thuần ở ./writing-self-score.ts. Đề nhiều phần (Full: Nghe + Viết +
 *    Đọc) cứ dựng phần theo thứ tự `order`; phần trắc nghiệm chấm như cũ, phần Viết ra riêng.
 */
import type { LevelThreshold } from "@/lib/db/programs/types";
import type {
  CheckResponse,
  ChoiceLabel,
  PracticeSkill,
  PublicQuestion,
} from "@/lib/practice/types";
import type {
  CharLimitStatus,
  WritingFormat,
  WritingPrompt,
  WritingReveal,
} from "@/lib/practice/writing-types";

/**
 * Kỹ năng của một phần thi: trắc nghiệm (`PracticeSkill`, chấm tự động) hoặc `writing` (tự chấm).
 * `PracticeSkill` vẫn chỉ gồm reading | listening nên Luyện tập không bị ảnh hưởng.
 */
export type ExamSkill = PracticeSkill | "writing";

/** `placement` = Test trình độ: đề ngắn, kết quả có thêm `placement` (ước lượng cấp xuất phát). */
export type ExamKind = "full" | "mini" | "hard" | "ibt" | "placement";

/** `draft` = đề mẫu/đang soạn: hiển thị được ở dev, luật phân bố nhãn đúng chỉ cảnh báo. */
export type ExamStatus = "draft" | "published";

// ------------------------------------------------------------------ danh sách đề

export interface ExamSummary {
  /** Khoá ổn định, dùng trong URL: /[program]/de-thi/[kind]/[id]. Ví dụ "doc-01". */
  id: string;
  program: string;
  kind: ExamKind;
  /** Tiêu đề tiếng Việt, ví dụ "Mini test Đọc 01". */
  title: string;
  status: ExamStatus;
  /** Các kỹ năng theo đúng thứ tự phần thi. Mini test có đúng 1 kỹ năng. Có thể chứa "writing". */
  skills: ExamSkill[];
  /** Tổng số câu các phần, gồm cả câu Viết (Mini Viết = 4). */
  question_count: number;
  /** Tổng thời gian các phần (giây), gồm cả phần Viết. */
  duration_sec: number;
}

// ------------------------------------------------------------------ đề công khai

/** Một khối câu in chung lệnh đề: nhóm dạng (R01-02, R19-20…) hoặc một bộ dùng chung ngữ liệu. */
export interface PublicExamBlock {
  /** Mã nhóm dạng theo cấu hình, ví dụ "R19-20". */
  type_group: string;
  /** Vị trí câu đầu/cuối của khối TRONG ĐỀ NÀY (1-based, đánh số liên tục trong phần thi). */
  first_number: number;
  last_number: number;
  /**
   * Lệnh nhóm in một lần ở đầu khối, lấy từ cấu hình chương trình (content-spec 4.5),
   * đã thay số câu thật: "※ [19~20] 다음 글을 읽고 물음에 답하십시오.".
   * Câu đơn: giao diện LUÔN ẩn `stem` của từng câu và chỉ in lệnh này (content-spec mục 5, ghi chú `stem`).
   * Câu trong bộ (có `group_key`): in lệnh này, rồi ngữ liệu chung một lần, rồi `stem` riêng từng câu.
   */
  instruction_ko: string;
  /** true = các câu trong khối dùng chung `passage`/ngữ liệu (cùng `group_key`). */
  shared_material: boolean;
  questions: PublicExamQuestion[];
}

export interface PublicExamQuestion {
  /** Số câu trong đề (1-based, liên tục trong phần thi). Không nhất thiết trùng số trong type_code. */
  number: number;
  question: PublicQuestion;
}

interface PublicExamSectionBase {
  /** Thứ tự phần thi trong đề (1-based). */
  order: number;
  duration_sec: number;
  question_count: number;
  /** Thang điểm của phần (cấu hình chương trình, vd. Đọc TOPIK II = 100). */
  max_score: number;
}

/** Phần trắc nghiệm (Đọc, Nghe): `blocks` là các khối câu. */
export interface PublicChoiceSection extends PublicExamSectionBase {
  skill: PracticeSkill;
  blocks: PublicExamBlock[];
}

/**
 * Một câu Viết trong đề công khai: CHỈ đề (`WritingPrompt`), không bài mẫu, đáp án, ý bắt buộc hay
 * lời giải (những thứ đó nằm ở `WritingReviewItem.reveal` sau khi nộp).
 */
export interface PublicWritingItem {
  /** Vị trí trong phần Viết (1-based, liên tục: 1..4). Số hiển thị "51~54" suy ra từ `prompt.type_code`. */
  number: number;
  /** Mã nhóm dạng, ở Viết trùng type_code ("W53"). */
  type_group: string;
  /** Điểm tối đa của câu (`ProgramConfig.writing_points`), vd. W51 = 10, W54 = 50. */
  max_points: number;
  prompt: WritingPrompt;
}

/**
 * Phần Viết: `blocks` luôn rỗng (để code chỉ đọc `section.blocks` không vỡ), danh sách đề ở
 * `writing_items`, thứ tự W51 -> W54 tăng dần. Narrow bằng `section.skill === "writing"`.
 */
export interface PublicWritingSection extends PublicExamSectionBase {
  skill: "writing";
  blocks: [];
  writing_items: PublicWritingItem[];
}

export type PublicExamSection = PublicChoiceSection | PublicWritingSection;

export interface PublicExam extends ExamSummary {
  sections: PublicExamSection[];
}

// ------------------------------------------------------------------ nộp bài

export interface ExamSubmitRequest {
  program: string;
  kind: ExamKind;
  examId: string;
  /**
   * Khoá = questionId. Câu không có khoá hoặc giá trị null = bỏ trống (chấm sai).
   * Server bỏ qua khoá không thuộc đề.
   */
  answers: Record<string, string | null>;
  /**
   * Bài Viết, khoá = questionId của câu Viết (w51-0001…). Chỉ cần khi đề có phần Viết; đề chỉ có Viết
   * vẫn gửi `answers: {}`. Hình dạng theo `WritingPrompt.format`:
   *  - essay (W53–W54): `{ text }`;
   *  - fill_blanks (W51–W52): `{ blanks: { "㉠": "...", "㉡": "..." } }`, khoá theo nhãn của đề.
   * Câu thiếu khoá = bỏ trống (chuỗi rỗng). Khoá không thuộc đề bị bỏ qua. Sai hình dạng hoặc quá dài
   * (`WRITING_TEXT_MAX_CHARS` / `WRITING_BLANK_MAX_CHARS`) -> 400 `invalid_writing_answer`.
   */
  writing?: Record<string, ExamWritingAnswer>;
  /** Thời điểm bắt đầu (ms epoch, đồng hồ máy khách). Dùng cho thống kê. */
  startedAt?: number;
  /** Tổng thời gian làm bài (ms). Chế độ khách chưa kiểm ở server; ghi vào `attempts` khi có CSDL. */
  timeSpentMs?: number;
  /** true = hết giờ, máy khách tự nộp. */
  timedOut?: boolean;
}

/** Bài làm của một câu Viết (máy khách gửi lên, và server trả lại đã chuẩn hoá trong kết quả). */
export interface ExamWritingAnswer {
  /** essay (W53–W54): nội dung bài viết. */
  text?: string;
  /** fill_blanks (W51–W52): đáp án từng chỗ trống, khoá = nhãn "㉠" / "㉡" của đề. */
  blanks?: Record<string, string>;
}

/** Thống kê đúng/tổng cho một nhóm (nhóm dạng, kỹ năng con…). */
export interface BreakdownRow {
  /** Mã: type_group ("R39-41") hoặc subskill ("insert_sentence"). */
  code: string;
  /** Tên tiếng Việt lấy từ cấu hình chương trình. */
  name_vi: string;
  correct: number;
  total: number;
  /** Danh sách type_code có trong nhóm này (để giao diện dẫn sang Luyện tập theo dạng). */
  type_codes: string[];
}

export interface SectionResult {
  skill: PracticeSkill;
  correct: number;
  total: number;
  /** Câu bỏ trống. */
  unanswered: number;
  /**
   * Điểm của phần trên thang `max_score`, đã quy đổi theo số câu thật của đề
   * (Mini test ít câu hơn đề thật): round(correct / total × max_score).
   */
  score: number;
  max_score: number;
}

export interface LevelEstimate {
  /** Cấp, vd. 4. null = dưới ngưỡng thấp nhất (không đạt cấp). */
  level: number | null;
  /** "4급" hoặc "Chưa đạt cấp". */
  label: string;
  /**
   * Điểm tổng dùng để so ngưỡng. Full test: tổng điểm thật. Mini test (một kỹ năng): điểm phần
   * chiếu lên thang tổng của chương trình, round(score / max_score × total_max_score).
   */
  compared_score: number;
  total_max_score: number;
  /** true khi chỉ là ước lượng (Mini test, hoặc đề ít câu hơn cấu hình phần thi). */
  is_estimate: boolean;
  /** Điểm cần thêm để lên cấp kế tiếp; null nếu đã ở cấp cao nhất. */
  next_level?: { level: number; label: string; points_needed: number } | null;
}

/**
 * Một câu trong kết quả, kèm đáp án/lời giải để xem lại. Câu Nghe có thêm `transcript_vi` (kế thừa từ
 * CheckResponse: bản dịch, mỗi dòng ứng với một dòng `transcript_ko` của đề); CHỈ có sau khi nộp.
 */
export interface QuestionResult extends CheckResponse {
  number: number;
  skill: PracticeSkill;
  type_code: string;
  type_group: string;
  subskill: string;
}

// ------------------------------------------------------------------ test trình độ

/** Kết quả một bậc độ khó trong đề `placement`. */
export interface PlacementBand {
  /** Bậc độ khó = cấp TOPIK mà câu phân hoá (content-spec §2.3). */
  difficulty: number;
  correct: number;
  total: number;
  /** correct / total, làm tròn 2 chữ số. */
  ratio: number;
  /** ratio >= `placement.band_pass_ratio` của chương trình. */
  passed: boolean;
}

/**
 * Ước lượng trình độ từ đề `placement` (hàm `estimatePlacement`, lib/exam/placement.ts).
 * Quy tắc: câu được gom theo `difficulty`; chuỗi bậc liên tục từ `difficulty_range.min`, bậc trống hay
 * bậc trượt đều dừng chuỗi; `estimated_level` = bậc cao nhất mà nó và MỌI bậc thấp hơn đều `passed`.
 */
export interface PlacementEstimate {
  /** Trình độ hiện tại ước lượng = bậc cao nhất mà nó và MỌI bậc thấp hơn có câu đều passed. null = chưa vững bậc thấp nhất. */
  estimated_level: number | null;
  /** "4급" hoặc "Chưa đạt 3급" — lấy nhãn từ level_thresholds của chương trình, không hard-code. */
  estimated_label: string;
  /** Cấp nên bắt đầu học trong Lộ trình: estimated_level ?? difficulty_range.min. */
  start_level: number;
  start_label: string;
  /** Theo độ khó tăng dần; chỉ các bậc có câu trong đề. */
  bands: PlacementBand[];
  /**
   * Tối đa weak_subskill_count kỹ năng con làm sai (tỉ lệ đúng < 1), yếu nhất trước. Chỉ tính các câu
   * có độ khó <= start_level + 1 (kỹ năng chỉ xuất hiện ở bậc cao hơn nữa không bị gọi là yếu). Hoà tỉ
   * lệ đúng thì kỹ năng có câu độ khó thấp hơn đứng trước, rồi tới thứ tự cấu hình/mã. Số liệu
   * correct/total chỉ tính trong các câu được xét; đề mỗi kỹ năng thường chỉ 1–2 câu nên nên gọi là
   * "dạng câu bạn làm sai" hơn là "kỹ năng yếu".
   */
  weak_subskills: BreakdownRow[];
}

// ------------------------------------------------------------------ phần Viết trong kết quả

/**
 * Dữ kiện server nhúng sẵn để máy khách quy điểm tự chấm Viết sang cấp mà KHÔNG phải import cấu hình
 * chương trình (xem `projectLevelWithWriting`, ./writing-self-score.ts).
 */
export interface LevelProjectionBasis {
  /** Ngưỡng cấp theo điểm tổng, sắp tăng dần theo min_score. */
  thresholds: LevelThreshold[];
  /** Thang điểm tổng của chương trình (TOPIK II = 300). */
  total_max_score: number;
  /** Điểm các phần chấm tự động (Đọc/Nghe) của đề này; 0 nếu đề chỉ có Viết. */
  auto_score: number;
  /** Tổng thang điểm các phần chấm tự động; 0 nếu đề chỉ có Viết. */
  auto_max_score: number;
  /**
   * true = đề không phủ hết phần thi của chương trình hoặc ít câu hơn cấu hình (Mini…): điểm được chiếu
   * lên thang tổng. false = đề đủ (Full), so thẳng điểm thật với ngưỡng.
   */
  is_estimate: boolean;
}

/** Một câu Viết để xem lại: đề + bài đã nộp + bài mẫu. Chỉ có trong kết quả, sau khi nộp. */
export interface WritingReviewItem {
  /** Vị trí trong phần Viết (1-based). */
  number: number;
  /** id câu Viết (khoá của `selfPoints` khi tự chấm). */
  id: string;
  type_code: string;
  type_group: string;
  subskill: string;
  format: WritingFormat;
  prompt: WritingPrompt;
  /** Bài đã nộp, chuẩn hoá: essay có `text`; fill_blanks có `blanks` đủ mọi nhãn (rỗng = ""). */
  answer: ExamWritingAnswer;
  /** essay: số ký tự đếm bằng `countChars` ở server. Không có với fill_blanks. */
  char_count?: number;
  /** essay có `prompt.char_limit`: dưới / trong / vượt khung. */
  char_status?: CharLimitStatus;
  /** Điểm tối đa của câu; ô nhập điểm tự chấm của giao diện chặn trong [0, max_points]. */
  max_points: number;
  /** Bài mẫu, đáp án chấp nhận, rubric, lời giải để người học tự so sánh. */
  reveal: WritingReveal;
}

/**
 * Phần Viết của kết quả. Không chấm tự động: `ExamResult.sections`, `questions`, `by_type_group`,
 * `by_subskill` KHÔNG chứa câu Viết. Người học tự chấm từng câu (0..max_points), giao diện gọi
 * `projectWritingScore` / `projectLevelWithWriting` để ra điểm phần Viết và cấp ước lượng.
 */
export interface WritingReview {
  /** Thứ tự phần Viết trong đề (1-based). */
  order: number;
  duration_sec: number;
  /** Theo thứ tự trong đề (W51 -> W54). */
  items: WritingReviewItem[];
  /** Thang điểm phần Viết của chương trình (TOPIK II = 100). */
  max_score: number;
  /** Tổng `max_points` các câu Viết có trong đề (đề đủ 4 câu = `max_score`; đề thiếu câu thì nhỏ hơn). */
  max_points_total: number;
  level_basis: LevelProjectionBasis;
}

export interface ExamResult {
  examId: string;
  program: string;
  kind: ExamKind;
  title: string;
  submittedAt: number;
  timeSpentMs?: number;
  timedOut: boolean;
  /** Các phần CHẤM TỰ ĐỘNG (Đọc/Nghe). Phần Viết không nằm đây: xem `writing`. Đề chỉ có Viết = []. */
  sections: SectionResult[];
  /**
   * Tổng điểm các phần chấm tự động (thang = tổng max_score các phần đó). Không gồm Viết; đề chỉ có
   * Viết thì cả hai bằng 0.
   */
  total_score: number;
  total_max_score: number;
  /**
   * Cấp ước lượng từ các phần chấm tự động. `null` khi đề không có phần chấm tự động (Mini Viết): khi
   * đó cấp chỉ có sau khi người học tự chấm (`projectLevelWithWriting`). Đề có cả Viết: cấp ở đây chiếu
   * riêng điểm Đọc/Nghe lên thang tổng (`is_estimate` = true) vì Viết chưa có điểm.
   */
  level: LevelEstimate | null;
  /** Có khi đề có phần Viết. Xem `WritingReview`. */
  writing?: WritingReview;
  /** Chỉ có khi kind = "placement". Frontend của Test trình độ dùng trường này thay vì `level`. */
  placement?: PlacementEstimate;
  /** Sắp theo thứ tự nhóm dạng trong cấu hình. */
  by_type_group: BreakdownRow[];
  /** Sắp theo tỉ lệ đúng tăng dần (yếu nhất trước). */
  by_subskill: BreakdownRow[];
  /** Mọi câu theo thứ tự trong đề, kèm đáp án và lời giải để xem lại. */
  questions: QuestionResult[];
}

export type ExamErrorCode =
  | "invalid_json"
  | "invalid_body"
  | "program_not_found"
  | "exam_not_found"
  | "invalid_choice"
  /** `writing` sai hình dạng so với đề (essay cần text, fill_blanks cần blanks) hoặc quá dài. */
  | "invalid_writing_answer";

/** Mọi lỗi của /api/exam/* đều có dạng này; `message` là tiếng Việt, hiển thị được cho người học. */
export interface ExamApiErrorBody {
  error: { code: ExamErrorCode; message: string };
}

export type { ChoiceLabel };
