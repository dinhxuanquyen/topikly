/**
 * Hợp đồng dữ liệu của trụ Đề thi (Giai đoạn 1: Mini test Đọc trước, Full/Hard/IBT dùng lại sau).
 *
 * File này AN TOÀN CHO CLIENT: chỉ chứa kiểu thuần, không import fs/node, không import zod.
 * Frontend import kiểu từ đây; logic server nằm ở source.ts / score.ts / queries.ts.
 *
 * Nguyên tắc như Luyện tập: `PublicExam` gửi xuống trình duyệt TRƯỚC khi nộp bài nên chỉ chứa
 * `PublicQuestion` (không đáp án, không lời giải). Đáp án, lời giải và điểm chỉ có trong
 * `ExamResult`, do server trả về sau POST /api/exam/submit.
 *
 * Số câu, thời gian, thang điểm và ngưỡng cấp đều lấy từ cấu hình chương trình
 * (`ProgramConfig.sections`, `level_thresholds`, `exam_blueprints`), không hard-code.
 */
import type {
  CheckResponse,
  ChoiceLabel,
  PracticeSkill,
  PublicQuestion,
} from "@/lib/practice/types";

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
  /** Các kỹ năng theo đúng thứ tự phần thi. Mini test có đúng 1 kỹ năng. */
  skills: PracticeSkill[];
  question_count: number;
  /** Tổng thời gian các phần (giây). */
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

export interface PublicExamSection {
  skill: PracticeSkill;
  /** Thứ tự phần thi trong đề (1-based). */
  order: number;
  duration_sec: number;
  question_count: number;
  /** Thang điểm của phần (cấu hình chương trình, vd. Đọc TOPIK II = 100). */
  max_score: number;
  blocks: PublicExamBlock[];
}

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
  /** Thời điểm bắt đầu (ms epoch, đồng hồ máy khách). Dùng cho thống kê. */
  startedAt?: number;
  /** Tổng thời gian làm bài (ms). Chế độ khách chưa kiểm ở server; ghi vào `attempts` khi có CSDL. */
  timeSpentMs?: number;
  /** true = hết giờ, máy khách tự nộp. */
  timedOut?: boolean;
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

export interface ExamResult {
  examId: string;
  program: string;
  kind: ExamKind;
  title: string;
  submittedAt: number;
  timeSpentMs?: number;
  timedOut: boolean;
  sections: SectionResult[];
  /** Tổng điểm các phần đã làm (thang = tổng max_score các phần trong đề). */
  total_score: number;
  total_max_score: number;
  level: LevelEstimate;
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
  "invalid_json" | "invalid_body" | "program_not_found" | "exam_not_found" | "invalid_choice";

/** Mọi lỗi của /api/exam/* đều có dạng này; `message` là tiếng Việt, hiển thị được cho người học. */
export interface ExamApiErrorBody {
  error: { code: ExamErrorCode; message: string };
}

export type { ChoiceLabel };
