/**
 * Hợp đồng dữ liệu của Luyện tập Viết (W51–W54), phạm vi MVP: đề + ô viết có đếm ký tự +
 * bài mẫu để tự so sánh. Không chấm AI, không rule check (đó là Giai đoạn 2B của lib/writing).
 *
 * File này AN TOÀN CHO CLIENT: chỉ chứa kiểu, hằng số và hàm thuần, không import fs/node.
 *
 * Hai lớp dữ liệu, giống nguyên tắc `Public*` ở ./types.ts:
 *  - `WritingPrompt`: phần hiển thị TRƯỚC khi viết (lệnh đề, ngữ liệu, dữ liệu biểu đồ, giới hạn
 *    ký tự). Được phép nhúng vào trang. KHÔNG có bài mẫu, đáp án, ý bắt buộc, bảng biểu hiện, lỗi
 *    thường gặp, ghi chú chấm điểm, lời giải.
 *  - `WritingReveal`: phần "tự so sánh", chỉ lấy qua API sau khi người học bấm xem
 *    (GET /api/practice/writing/reveal). Không nhúng vào trang trước.
 * Không kiểu nào có `notes_internal`, `reviewed_by`, `reviewed_at`, `authored_by`, `source`, `tags`.
 */
import type { ChartData } from "./types";

// `countChars` thuần (không import node), nên client import thẳng được; re-export để frontend chỉ
// cần một nơi. Cách đếm theo content-spec 5.7: tính cả khoảng trắng, bỏ ký tự xuống dòng.
export { countChars } from "@/lib/db/char-count";

/** Các dạng Viết có luyện tập. */
export const WRITING_TYPE_CODES = ["W51", "W52", "W53", "W54"] as const;
export type WritingTypeCode = (typeof WRITING_TYPE_CODES)[number];

/**
 * `fill_blanks` (W51–W52): viết MỘT câu vào mỗi chỗ trống ㉠ ㉡ -> mỗi ô là một ô nhập ngắn.
 * `essay` (W53–W54): viết một bài, có giới hạn ký tự -> một ô nhập lớn kèm bộ đếm ký tự.
 */
export type WritingFormat = "fill_blanks" | "essay";

/** Văn phong của đáp án (W51–W52). W52 luôn là `written_plain`. */
export type WritingRegister = "formal_polite" | "polite" | "written_plain";

export const WRITING_REGISTER_NAME_VI: Record<WritingRegister, string> = {
  formal_polite: "Trang trọng (-습니다/-ㅂ니다)",
  polite: "Lịch sự thân mật (-아요/-어요)",
  written_plain: "Văn viết (-ㄴ다/-다)",
};

/** Ba tiêu chí chấm chính thức của W53–W54, đúng thứ tự khoá trong `rubric_notes_vi`. */
export const WRITING_RUBRIC_CRITERIA = [
  {
    key: "task_fulfillment",
    name_ko: "내용 및 과제 수행",
    name_vi: "Nội dung và thực hiện nhiệm vụ",
  },
  { key: "organization", name_ko: "글의 전개 구조", name_vi: "Cấu trúc triển khai bài viết" },
  { key: "language_use", name_ko: "언어 사용", name_vi: "Sử dụng ngôn ngữ" },
] as const;
export type WritingRubricKey = (typeof WRITING_RUBRIC_CRITERIA)[number]["key"];

/** Giới hạn ký tự của bài viết (đếm bằng `countChars`). Chỉ W53 (200–300) và W54 (600–700). */
export interface WritingCharLimit {
  min: number;
  max: number;
}

export type CharLimitStatus = "below" | "within" | "above";

/** Trạng thái bộ đếm: dưới `min`, trong khung, hay vượt `max`. Hàm thuần cho client. */
export function charLimitStatus(count: number, limit: WritingCharLimit): CharLimitStatus {
  if (count < limit.min) return "below";
  if (count > limit.max) return "above";
  return "within";
}

// ------------------------------------------------------------------ trước khi viết

/** Một chỗ trống cần điền (W51–W52). Chỉ có nhãn: đáp án nằm ở `WritingReveal.blanks`. */
export interface WritingBlankSlot {
  /** "㉠" hoặc "㉡", đúng nhãn trong `passage`. */
  label: string;
}

export interface WritingPrompt {
  /** Ví dụ "w53-0002". Khoá ổn định. */
  id: string;
  /** Slug chương trình, ví dụ "topik-ii". */
  program: string;
  type_code: WritingTypeCode;
  skill: "writing";
  subskill: string;
  /** Thang 3–6. */
  difficulty: number;
  format: WritingFormat;
  /** Lệnh đề đầy đủ như in trên đề (tiếng Hàn). */
  stem: string;
  /** W51–W52: văn bản có ( ㉠ ), ( ㉡ ). Mỗi `\n` là một ngắt dòng cứng. */
  passage?: string;
  /** W51–W52: các chỗ trống theo thứ tự (luôn có khi `format` = "fill_blanks"). */
  blanks?: WritingBlankSlot[];
  /** W53–W54: nội dung đề (tên chủ đề, dữ liệu dạng chữ, đoạn dẫn + câu hỏi gợi ý). */
  task?: string;
  /** Mô tả hình/biểu đồ bằng tiếng Việt, đủ để hoạ sĩ vẽ lại. */
  image_desc?: string;
  /** null cho tới khi có ảnh. */
  image_url?: string | null;
  /** W53: dữ liệu để vẽ biểu đồ ở client (cùng kiểu với câu Đọc). */
  chart_data?: ChartData[];
  /** Có `chart_data` thì luôn true: số liệu giả định, UI nên ghi chú "Số liệu giả định". */
  data_is_fictional?: boolean;
  /** W53–W54: khung ký tự. Không có với W51–W52 (mỗi chỗ trống đúng một câu). */
  char_limit?: WritingCharLimit;
}

/** Một dạng Viết đang có ít nhất 1 đề. */
export interface WritingTypeSummary {
  type_code: WritingTypeCode;
  skill: "writing";
  /** Tên dạng (cấu hình chương trình). */
  name_vi: string;
  /** Mã nhóm dạng, ở Viết trùng `type_code`. */
  type_group: string;
  group_name_vi: string;
  format: WritingFormat;
  char_limit?: WritingCharLimit;
  question_count: number;
}

// ------------------------------------------------------------------ sau khi bấm xem (tự so sánh)

/** Ý bắt buộc của đề: W53 mỗi khối dữ liệu; W54 mỗi câu hỏi gợi ý. */
export interface WritingRequiredPoint {
  /** "p1", "p2"… khớp `covers` của bài mẫu. */
  id: string;
  ko: string;
  vi: string;
}

export interface WritingExpression {
  ko: string;
  vi: string;
}

/** Nhận xét bài mẫu theo ba tiêu chí chính thức (`WRITING_RUBRIC_CRITERIA`). */
export type WritingRubricNotes = Record<WritingRubricKey, string>;

export interface WritingModelAnswer {
  /** Cấp mục tiêu của bài mẫu (độ khó của đề và độ khó + 1). */
  level: number;
  /** Mỗi đoạn một dòng (`\n`), không thụt đầu dòng; thụt đầu dòng 원고지 do giao diện xử lý. */
  text: string;
  /** Số ký tự, ĐÃ đếm lại bằng `countChars` (không tin số ghi tay trong YAML). */
  char_count: number;
  /** Ước tính số ô 원고지 theo cấu hình chương trình (content-spec 5.7). */
  manuscript_cells: number;
  /** id các ý bắt buộc bài mẫu đã bao quát. */
  covers: string[];
  rubric_notes_vi: WritingRubricNotes;
}

export interface WritingRejectedAnswer {
  text: string;
  reason_vi: string;
}

/** Đáp án mẫu của một chỗ trống (W51–W52). */
export interface WritingBlankReveal {
  label: string;
  /** ≥ 3 đáp án đạt điểm tối đa, khác nhau về cách diễn đạt. */
  accepted_answers: string[];
  /** Đúng ý nhưng sai văn phong / ngữ pháp nhỏ / thiếu một yếu tố. */
  partial_answers: string[];
  /** Đáp án sai kèm lý do. */
  rejected_answers: WritingRejectedAnswer[];
  /** Yếu tố nội dung và ngữ pháp bắt buộc để đạt điểm tối đa. */
  required_elements_vi: string[];
  note_vi?: string;
}

export interface WritingReveal {
  id: string;
  type_code: WritingTypeCode;
  format: WritingFormat;
  /** W51–W52. */
  register?: WritingRegister;
  /** W51–W52: đáp án mẫu từng chỗ trống, đúng thứ tự `WritingPrompt.blanks`. */
  blanks?: WritingBlankReveal[];
  /** W53–W54: ý bắt buộc, để người học tự đối chiếu bài của mình. */
  required_points?: WritingRequiredPoint[];
  /** W53–W54: bài mẫu (cấp mục tiêu và cao hơn một bậc), sắp tăng dần theo cấp. */
  model_answers?: WritingModelAnswer[];
  /** Dàn ý gợi ý (nếu đề có). */
  outline_vi?: string;
  /** Biểu hiện nên dùng cho đề này. */
  expression_bank?: WritingExpression[];
  /** Điều kiện đạt mức cao / thấp theo từng tiêu chí (markdown). */
  scoring_notes_vi: string;
  /** Lỗi người Việt hay mắc ở đề này. */
  common_mistakes_vi: string[];
  /** Lời giải (markdown). */
  explanation_vi: string;
}
