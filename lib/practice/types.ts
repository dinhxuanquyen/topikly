/**
 * Hợp đồng dữ liệu của chế độ Luyện tập theo dạng (Giai đoạn 1).
 *
 * File này AN TOÀN CHO CLIENT: chỉ chứa kiểu và hằng số thuần, không import fs/node,
 * không import schema zod. Frontend import kiểu từ đây; logic server nằm ở source.ts / check.ts.
 *
 * Nguyên tắc: kiểu `Public*` là thứ được phép gửi xuống trình duyệt TRƯỚC khi người học trả lời,
 * nên tuyệt đối không có `correct`, `note_vi`, `trap`, `explanation_vi`, `transcript_vi`,
 * `notes_internal`, `reviewed_by`, `tts_notes`. Đáp án và lời giải chỉ trả về qua `CheckResponse`
 * sau khi server đã chấm.
 */

/** Kỹ năng có luyện tập theo dạng trắc nghiệm. Viết (tự luận) chưa nằm trong phạm vi này. */
export type PracticeSkill = "reading" | "listening";

export const PRACTICE_SKILLS: readonly PracticeSkill[] = ["reading", "listening"];

/** Nhãn phương án, đúng thứ tự trong đề. */
export const CHOICE_LABELS = ["①", "②", "③", "④"] as const;
export type ChoiceLabel = (typeof CHOICE_LABELS)[number];

// ------------------------------------------------------------------ biểu đồ

export type ChartType = "line" | "bar" | "pie" | "table";

export interface ChartPoint {
  /** Nhãn trục hoành (hoặc tên cột với `table`). Số trong YAML được đổi thành chuỗi. */
  x: string;
  /** Giá trị theo đơn vị `unit` của biểu đồ (`unit: 만 건`, `y: 210` nghĩa là 210만 건). */
  y: number;
}

export interface ChartSeries {
  /** Tên nhóm / tên hàng (với `table`). */
  name: string;
  points: ChartPoint[];
}

/** Khớp content-spec 5.3. `pie`: mỗi series cộng 100. `table`: mỗi series là MỘT HÀNG. */
export interface ChartData {
  chart_type: ChartType;
  /** Tiêu đề in trên biểu đồ (tiếng Hàn). */
  title: string;
  /** Dòng chú thích dưới tiêu đề: nguồn, đối tượng khảo sát. */
  caption?: string;
  /** Đơn vị hiển thị trên trục / nhãn "단위". */
  unit: string;
  series: ChartSeries[];
}

// ------------------------------------------------------------------ câu hỏi công khai

export interface PublicChoice {
  label: ChoiceLabel;
  /** Rỗng "" khi phương án là hình (L01–L03): khi đó dùng `image_desc` / `chart_data`. */
  text: string;
  /** Mô tả tranh bằng tiếng Việt; chỉ có với phương án là tranh. */
  image_desc?: string;
  chart_data?: ChartData[];
}

export interface PublicSpeaker {
  /** Nhãn trong transcript: "남자", "여자", "남자 1"… */
  label: string;
  gender: "male" | "female";
}

export interface PublicQuestion {
  /** Ví dụ "r10-0001". Khoá ổn định, dùng làm `questionId` khi chấm. */
  id: string;
  /** Slug chương trình, ví dụ "topik-ii". */
  program: string;
  /** Mã dạng theo từng vị trí câu: "R10", "L22". */
  type_code: string;
  skill: PracticeSkill;
  subskill: string;
  /** Thang 3–6. */
  difficulty: number;
  /**
   * Câu đơn: lệnh đề đầy đủ như in trên đề. Câu trong bộ (L21–L50, R19–R24, R42–R50): câu hỏi
   * riêng của câu đó. Ở chế độ luyện từng câu luôn hiển thị `stem`.
   */
  stem: string;
  /** Ngữ liệu Đọc (markdown; mỗi `\n` là một ngắt dòng cứng, quy ước content-spec 5.2). */
  passage?: string;
  /** Câu `<보기>` của R39–R41. */
  insert_sentence?: string;
  /** Mô tả hình/biểu đồ bằng tiếng Việt, đủ để hoạ sĩ vẽ lại. */
  image_desc?: string;
  /** null cho tới khi có ảnh. */
  image_url?: string | null;
  chart_data?: ChartData[];
  /** Có `chart_data` thì luôn true: số liệu giả định, UI nên ghi chú. */
  data_is_fictional?: boolean;
  /**
   * Chỉ câu Nghe. Vì `audio_url` đang null nên chế độ luyện hiển thị lời thoại tiếng Hàn.
   * Mỗi dòng một lượt/đoạn, có nhãn "남자: …" / "여자: …".
   */
  transcript_ko?: string;
  speakers?: PublicSpeaker[];
  /** null cho tới khi có audio; khi có thì frontend dùng trình phát audio, ẩn transcript. */
  audio_url?: string | null;
  /** Các câu cùng `group_key` dùng chung ngữ liệu (cặp/bộ): gom và hiển thị ngữ liệu một lần. */
  group_key?: string;
  /** Đúng 4 phương án ①–④, đúng thứ tự. */
  choices: PublicChoice[];
}

/** Một dạng câu (type_code) đang có ít nhất 1 câu luyện được. */
export interface PracticeTypeSummary {
  type_code: string;
  skill: PracticeSkill;
  /** Tên dạng theo từng vị trí câu (cấu hình chương trình). */
  name_vi: string;
  /** Mã nhóm dạng, ví dụ "R39-41": đơn vị của thẻ luyện tập. */
  type_group: string;
  /** Tên nhóm dạng. */
  group_name_vi: string;
  question_count: number;
}

// ------------------------------------------------------------------ chấm đáp án

export interface CheckRequest {
  /** Slug chương trình, ví dụ "topik-ii". */
  program: string;
  questionId: string;
  /** "①"–"④"; null = bỏ trống / hết giờ (chấm là sai, vẫn trả đáp án). */
  selectedLabel: string | null;
  /** Thời gian làm câu (ms). Dùng cho thống kê; server sẽ ghi vào `answers` khi có CSDL. */
  timeSpentMs?: number;
}

export interface CheckedChoice {
  label: ChoiceLabel;
  correct: boolean;
  /** Giải thích vì sao phương án này sai (hoặc ghi chú cho đáp án đúng, nếu có). */
  note_vi?: string;
  /** Mã kiểu bẫy, ví dụ "detail_swap". Chỉ phương án nhiễu. */
  trap?: string;
  /** Tên tiếng Việt của kiểu bẫy (từ cấu hình chương trình). */
  trap_name_vi?: string;
}

export interface CheckResponse {
  questionId: string;
  correct: boolean;
  /** Echo lại lựa chọn của người học (null = bỏ trống). */
  selectedLabel: ChoiceLabel | null;
  correctLabel: ChoiceLabel;
  /** Lời giải tiếng Việt (markdown). */
  explanation_vi: string;
  /** Câu Nghe: bản dịch transcript, mỗi dòng ứng với một dòng của `transcript_ko`. */
  transcript_vi?: string;
  /** Đủ 4 phương án, đúng thứ tự ①–④. */
  choices: CheckedChoice[];
}

// ------------------------------------------------------------------ lỗi API

export type PracticeErrorCode =
  | "invalid_json"
  | "invalid_body"
  | "invalid_query"
  | "program_not_found"
  | "type_not_found"
  | "question_not_found"
  | "invalid_choice";

/** Mọi lỗi của /api/practice/* đều có dạng này; `message` là tiếng Việt, hiển thị được cho người học. */
export interface ApiErrorBody {
  error: { code: PracticeErrorCode; message: string };
}
