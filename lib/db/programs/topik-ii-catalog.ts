import type { SubskillConfig, TrapConfig } from "./types";

/** content-spec 2.1 — danh mục subskill (cố định; thêm mới phải sửa spec qua PR). */
export const TOPIK_II_SUBSKILLS: readonly SubskillConfig[] = [
  { code: "picture_match", name_vi: "Nghe tình huống, chọn tranh khớp" },
  { code: "chart_reading", name_vi: "Đọc/nghe số liệu, đối chiếu biểu đồ hoặc bảng" },
  { code: "next_response", name_vi: "Chọn lời đáp tiếp theo phù hợp nội dung và ngữ dụng" },
  { code: "next_action", name_vi: "Suy ra hành động ngay sau hội thoại" },
  { code: "detail_match", name_vi: "Chọn phương án trùng khớp nội dung (일치)" },
  { code: "detail_specific", name_vi: "Trả lời câu hỏi chi tiết có mục tiêu cụ thể" },
  { code: "central_thought", name_vi: "Suy nghĩ chính của một người nói/nhân vật (중심 생각)" },
  { code: "main_idea", name_vi: "Chủ đề / nội dung trung tâm của cả văn bản" },
  { code: "text_identification", name_vi: "Văn bản thực dụng ngắn nói về cái gì" },
  { code: "purpose", name_vi: "Mục đích, ý định của người nói hoặc tác giả" },
  { code: "speech_act", name_vi: "Người nói đang làm gì bằng lời" },
  { code: "speaker_identity", name_vi: "Suy ra người nói là ai" },
  { code: "attitude", name_vi: "Thái độ của người nói/tác giả" },
  { code: "speaker_strategy", name_vi: "Cách nói/cách lập luận (말하는 방식)" },
  { code: "emotion", name_vi: "Tâm trạng/cảm xúc nhân vật (심정)" },
  { code: "inference_before", name_vi: "Suy ra nội dung đứng trước đoạn nghe" },
  { code: "fill_blank_grammar", name_vi: "Điền cấu trúc ngữ pháp vào chỗ trống" },
  { code: "similar_expression", name_vi: "Biểu hiện gần nghĩa với phần gạch chân" },
  { code: "fill_blank_connector", name_vi: "Điền phó từ/từ nối theo quan hệ logic" },
  { code: "fill_blank_idiom", name_vi: "Điền quán ngữ/thành ngữ (관용 표현)" },
  { code: "fill_blank_content", name_vi: "Điền cụm/mệnh đề theo mạch lập luận" },
  { code: "sentence_order", name_vi: "Sắp xếp thứ tự câu" },
  { code: "headline", name_vi: "Hiểu tít báo" },
  { code: "insert_sentence", name_vi: "Chọn vị trí chèn câu <보기>" },
  { code: "practical_completion", name_vi: "Viết câu vào chỗ trống trong văn bản thực dụng" },
  { code: "expository_completion", name_vi: "Viết câu vào chỗ trống trong đoạn văn giải thích" },
  { code: "data_description", name_vi: "Mô tả và phân tích biểu đồ/bảng (200–300 ký tự)" },
  { code: "argumentative_essay", name_vi: "Viết bài nghị luận (600–700 ký tự)" },
];

/** content-spec 2.2 (v0.3) — kiểu bẫy cho phương án nhiễu. */
export const TOPIK_II_TRAPS: readonly TrapConfig[] = [
  { code: "detail_swap", name_vi: "Sai một chi tiết: số, thời gian, địa điểm, đối tượng, thứ tự" },
  {
    code: "speaker_swap",
    name_vi:
      "Gán lời, hành động hay quan điểm của người này cho người kia (trong số những người có mặt)",
  },
  {
    code: "concession_point",
    name_vi:
      "Trình bày quan điểm ngữ liệu có nhắc tới nhưng người nói/tác giả không giữ (nhượng bộ, ý bị trích dẫn rồi phản bác)",
  },
  { code: "time_shift", name_vi: "Lẫn đã/đang/sẽ làm, hoặc trước/sau" },
  { code: "negation_flip", name_vi: "Đảo khẳng định ↔ phủ định" },
  { code: "degree_shift", name_vi: "Sai mức độ hoặc phạm vi" },
  { code: "reverse_causality", name_vi: "Đảo quan hệ nhân quả hoặc gán sai nguyên nhân" },
  { code: "logic_mismatch", name_vi: "Sai quan hệ logic giữa các câu" },
  { code: "cohesion_break", name_vi: "Vị trí/thứ tự phá vỡ liên kết" },
  { code: "overgeneralization", name_vi: "Quá khái quát, tuyệt đối hoá" },
  { code: "too_narrow", name_vi: "Quá hẹp: chỉ là một chi tiết hoặc ví dụ" },
  {
    code: "true_not_main",
    name_vi: "Đúng theo ý của chính người nói/tác giả nhưng không phải điều câu hỏi hỏi",
  },
  { code: "outside_text", name_vi: "Hợp lý theo hiểu biết chung nhưng văn bản không nói tới" },
  { code: "keyword_echo", name_vi: "Lặp từ khoá nhưng ghép sai nghĩa/ngữ dụng" },
  { code: "near_synonym_grammar", name_vi: "Ngữ pháp gần nghĩa nhưng sai sắc thái/điều kiện" },
  { code: "collocation_error", name_vi: "Kết hợp từ không tự nhiên hoặc sai quán ngữ" },
  { code: "register_mismatch", name_vi: "Sai văn phong, kính ngữ hoặc tình huống" },
  { code: "attitude_mismatch", name_vi: "Đúng đối tượng sai thái độ (hoặc ngược lại)" },
];
