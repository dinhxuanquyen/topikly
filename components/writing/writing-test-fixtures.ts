import type { WritingPrompt, WritingReveal } from "@/lib/practice/writing-types";

/** Dữ liệu mẫu cho test component Viết (không phải nội dung thật). */
export const ESSAY_PROMPT: WritingPrompt = {
  id: "w53-0002",
  program: "topik-ii",
  type_code: "W53",
  skill: "writing",
  subskill: "data_description",
  difficulty: 4,
  format: "essay",
  stem: "다음은 '도서 대출 현황'에 대한 자료이다. 이 내용을 200~300자의 글로 설명하십시오.",
  task: "자료: △△시\n[연도별 대출 건수]\n· 종이책: 2016년 210만 건",
  data_is_fictional: true,
  chart_data: [
    {
      chart_type: "bar",
      title: "연도별 대출 건수",
      unit: "만 건",
      series: [{ name: "종이책", points: [{ x: "2016", y: 210 }] }],
    },
  ],
  char_limit: { min: 10, max: 20 },
};

export const ESSAY_REVEAL: WritingReveal = {
  id: "w53-0002",
  type_code: "W53",
  format: "essay",
  required_points: [
    { id: "p1", ko: "종이책 대출 건수의 변화", vi: "Xu hướng giảm của sách giấy" },
    { id: "p2", ko: "전자책 대출 건수의 변화", vi: "Xu hướng tăng của sách điện tử" },
  ],
  model_answers: [
    {
      level: 4,
      text: "첫째 문단입니다.\n둘째 문단입니다.",
      char_count: 17,
      manuscript_cells: 40,
      covers: ["p1", "p2"],
      rubric_notes_vi: {
        task_fulfillment: "Đủ ý bắt buộc, số liệu khớp.",
        organization: "Bốn câu theo trình tự.",
        language_use: "Văn phong -ㄴ다/-다 nhất quán.",
      },
    },
    {
      level: 5,
      text: "더 높은 수준의 문단입니다.",
      char_count: 14,
      manuscript_cells: 30,
      covers: ["p1"],
      rubric_notes_vi: {
        task_fulfillment: "Có diễn giải thêm.",
        organization: "Câu mở khái quát.",
        language_use: "Đa dạng biểu hiện hơn.",
      },
    },
  ],
  outline_vi: "1. Mở bài\n2. Thân bài",
  expression_bank: [{ ko: "-을 살펴보면", vi: "xem xét thì thấy" }],
  scoring_notes_vi: "- **Mức cao:** đủ ý\n- Mức thấp: thiếu ý",
  common_mistakes_vi: ["Viết sai số liệu"],
  explanation_vi: "**Phân tích đề.** Đề có hai ý.",
};

export const BLANKS_PROMPT: WritingPrompt = {
  id: "w51-0001",
  program: "topik-ii",
  type_code: "W51",
  skill: "writing",
  subskill: "practical_text",
  difficulty: 3,
  format: "fill_blanks",
  stem: "다음 글의 ㉠과 ㉡에 알맞은 말을 각각 한 문장으로 쓰십시오.",
  passage: "안녕하세요.\n모임에 ( ㉠ ). 그래서 ( ㉡ ).",
  blanks: [{ label: "㉠" }, { label: "㉡" }],
};

export const BLANKS_REVEAL: WritingReveal = {
  id: "w51-0001",
  type_code: "W51",
  format: "fill_blanks",
  register: "polite",
  blanks: [
    {
      label: "㉠",
      accepted_answers: ["참석할 수 없습니다.", "갈 수 없습니다"],
      partial_answers: ["못 갑니다"],
      rejected_answers: [{ text: "안 갑니다", reason_vi: "Sai nghĩa: không thể ≠ không muốn." }],
      required_elements_vi: ["Nêu lý do không tham dự"],
    },
    {
      label: "㉡",
      accepted_answers: ["미리 말씀드립니다"],
      partial_answers: [],
      rejected_answers: [],
      required_elements_vi: [],
      note_vi: "Chú ý **văn phong**.",
    },
  ],
  scoring_notes_vi: "Mỗi chỗ trống 5 điểm.",
  common_mistakes_vi: ["Dùng sai văn phong"],
  explanation_vi: "Lời giải ngắn.",
};
