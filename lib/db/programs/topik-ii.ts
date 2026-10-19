import { TOPIK_II_SUBSKILLS, TOPIK_II_TRAPS } from "./topik-ii-catalog";
import type { ProgramConfig, QuestionTypeConfig, Skill, TypeGroupConfig } from "./types";

/**
 * TOPIK II — cấu hình theo content-spec (mục 1.1–1.3 và bảng taxonomy mục 3).
 * type_code theo TỪNG vị trí câu (L01–L50, R01–R50, W51–W54 = 104 mã);
 * nhóm dạng (type_group) suy ra từ khoảng câu, dùng cho thẻ luyện tập và thống kê.
 */

const PREFIX: Record<Skill, string> = { listening: "L", reading: "R", writing: "W", speaking: "S" };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function codeOf(skill: Skill, n: number): string {
  return `${PREFIX[skill]}${pad(n)}`;
}

function groupCode(skill: Skill, from: number, to: number): string {
  return from === to ? codeOf(skill, from) : `${codeOf(skill, from)}-${to}`;
}

// ------------------------------------------------------------------ nhóm dạng

type RawGroup = readonly [from: number, to: number, name_vi: string, paired?: boolean];

function groups(skill: Skill, raw: readonly RawGroup[]): TypeGroupConfig[] {
  return raw.map(([from, to, name_vi, paired]) => ({
    group: groupCode(skill, from, to),
    skill,
    range: [from, to] as const,
    name_vi,
    paired: paired === true,
  }));
}

// Nghe: 1–20 là các nhóm riêng; 21–50 là 15 cặp bài dài (mỗi cặp dùng chung bài nghe).
const LISTENING_LONG_PAIRS: RawGroup[] = Array.from({ length: 15 }, (_, i): RawGroup => {
  const from = 21 + i * 2;
  return [from, from + 1, `Bài dài câu ${from}–${from + 1}`, true];
});

const LISTENING_GROUPS = groups("listening", [
  [1, 3, "Chọn tranh / biểu đồ phù hợp"],
  [4, 8, "Chọn câu nói tiếp theo"],
  [9, 12, "Chọn hành động tiếp theo"],
  [13, 16, "Chọn nội dung trùng khớp"],
  [17, 20, "Chọn suy nghĩ chính (중심 생각)"],
  ...LISTENING_LONG_PAIRS,
]);

const READING_GROUPS = groups("reading", [
  [1, 2, "Điền ngữ pháp vào chỗ trống"],
  [3, 4, "Chọn biểu hiện gần nghĩa"],
  [5, 8, "Văn bản nói về điều gì"],
  [9, 12, "Chọn nội dung trùng khớp (thông báo / biểu đồ / tin ngắn)"],
  [13, 15, "Sắp xếp thứ tự câu"],
  [16, 18, "Điền nội dung vào chỗ trống"],
  [19, 20, "Điền từ nối và chủ đề của đoạn", true],
  [21, 22, "Điền quán ngữ và nội dung trùng khớp", true],
  [23, 24, "Văn tự sự: tâm trạng nhân vật", true],
  [25, 27, "Giải thích tít báo"],
  [28, 31, "Điền nội dung vào chỗ trống (học thuật)"],
  [32, 34, "Chọn nội dung trùng khớp (học thuật)"],
  [35, 38, "Chủ đề của đoạn"],
  [39, 41, "Chèn câu <보기>"],
  [42, 43, "Trích đoạn tiểu thuyết", true],
  [44, 45, "Bài học thuật dài: chủ đề và điền nội dung", true],
  [46, 47, "Bài chính luận: thái độ tác giả", true],
  [48, 50, "Bài chính luận dài (bộ ba)", true],
]);

const WRITING_GROUPS = groups("writing", [
  [51, 51, "Viết câu vào chỗ trống (văn bản thực dụng)"],
  [52, 52, "Viết câu vào chỗ trống (đoạn văn giải thích)"],
  [53, 53, "Mô tả và phân tích số liệu (200–300 ký tự)"],
  [54, 54, "Nghị luận (600–700 ký tự)"],
]);

const TYPE_GROUPS: readonly TypeGroupConfig[] = [
  ...LISTENING_GROUPS,
  ...READING_GROUPS,
  ...WRITING_GROUPS,
];

// ------------------------------------------------------------------ dạng theo từng vị trí câu

/** [từ, đến] vị trí câu -> cùng tên dạng, subskill, độ khó. Nguồn: content-spec bảng mục 3. */
type RawType = readonly [
  from: number,
  to: number,
  name_vi: string,
  subskill: string,
  extras: readonly string[],
  difficulty: readonly [number, number],
];

const NONE: readonly string[] = [];

const LISTENING_TYPES: RawType[] = [
  [1, 2, "Chọn tranh khớp tình huống", "picture_match", NONE, [3, 3]],
  [3, 3, "Chọn biểu đồ đúng", "chart_reading", ["detail_match"], [3, 4]],
  [4, 8, "Chọn câu nói tiếp theo", "next_response", NONE, [3, 3]],
  [9, 12, "Hành động tiếp theo của 여자", "next_action", NONE, [3, 3]],
  [13, 13, "Nội dung trùng khớp: hội thoại đời sống", "detail_match", NONE, [3, 3]],
  [14, 14, "Nội dung trùng khớp: thông báo, 안내 방송", "detail_match", NONE, [3, 4]],
  [15, 15, "Nội dung trùng khớp: bản tin", "detail_match", NONE, [4, 4]],
  [16, 16, "Nội dung trùng khớp: phỏng vấn ngắn", "detail_match", NONE, [4, 4]],
  [17, 19, "중심 생각 của 남자", "central_thought", NONE, [3, 4]],
  [20, 20, "중심 생각 qua phỏng vấn ngắn", "central_thought", NONE, [4, 4]],
  [21, 21, "중심 생각 của 남자 (hội thoại công việc)", "central_thought", NONE, [4, 4]],
  [22, 22, "Nội dung trùng khớp (cặp 21–22)", "detail_match", NONE, [4, 4]],
  [23, 23, "Người nói đang làm gì", "speech_act", ["purpose"], [4, 4]],
  [24, 24, "Nội dung trùng khớp (cặp 23–24)", "detail_match", NONE, [4, 4]],
  [25, 25, "중심 생각 của người được phỏng vấn", "central_thought", NONE, [4, 4]],
  [26, 26, "Nội dung trùng khớp (cặp 25–26)", "detail_match", NONE, [4, 4]],
  [27, 27, "Ý định khi nói (의도)", "purpose", ["speech_act"], [4, 4]],
  [28, 28, "Nội dung trùng khớp (cặp 27–28)", "detail_match", NONE, [4, 4]],
  [29, 29, "Người nói là ai", "speaker_identity", NONE, [4, 5]],
  [30, 30, "Nội dung trùng khớp (cặp 29–30)", "detail_match", NONE, [4, 5]],
  [31, 31, "중심 생각 của 남자 (토론)", "central_thought", NONE, [5, 5]],
  [32, 32, "Thái độ / cách nói của 남자", "speaker_strategy", ["attitude"], [5, 5]],
  [33, 33, "Nội dung bài giảng về cái gì", "main_idea", NONE, [5, 5]],
  [34, 34, "Nội dung trùng khớp (cặp 33–34)", "detail_match", NONE, [5, 5]],
  [35, 35, "Người nói đang làm gì (diễn văn)", "speech_act", ["purpose"], [5, 5]],
  [36, 36, "Nội dung trùng khớp (cặp 35–36)", "detail_match", NONE, [5, 5]],
  [37, 37, "중심 생각 của chuyên gia", "central_thought", NONE, [5, 5]],
  [38, 38, "Nội dung trùng khớp (cặp 37–38)", "detail_match", NONE, [5, 5]],
  [39, 39, "Nội dung đứng trước đoạn nghe", "inference_before", NONE, [5, 5]],
  [40, 40, "Nội dung trùng khớp (cặp 39–40)", "detail_match", NONE, [5, 5]],
  [41, 41, "Nội dung trung tâm của bài giảng", "main_idea", ["central_thought"], [5, 6]],
  [42, 42, "Nội dung trùng khớp (cặp 41–42)", "detail_match", NONE, [5, 6]],
  [43, 43, "Nội dung phim tài liệu về cái gì", "main_idea", NONE, [5, 6]],
  [44, 44, "Câu hỏi chi tiết: lý do, cách thức", "detail_specific", ["detail_match"], [5, 6]],
  [45, 45, "Nội dung trùng khớp: bài giảng chuyên sâu", "detail_match", NONE, [6, 6]],
  [46, 46, "Cách nói của người giảng", "speaker_strategy", ["attitude"], [6, 6]],
  [47, 47, "Nội dung trùng khớp: đối đàm chuyên gia", "detail_match", NONE, [6, 6]],
  [48, 48, "Thái độ của 남자", "attitude", ["speaker_strategy"], [6, 6]],
  [49, 49, "Nội dung trùng khớp: bài giảng học thuật", "detail_match", NONE, [6, 6]],
  [50, 50, "Thái độ của người giảng", "attitude", ["speaker_strategy"], [6, 6]],
];

const READING_TYPES: RawType[] = [
  [1, 2, "Điền ngữ pháp vào chỗ trống", "fill_blank_grammar", NONE, [3, 3]],
  [3, 4, "Biểu hiện gần nghĩa với phần gạch chân", "similar_expression", NONE, [3, 3]],
  [5, 6, "Văn bản nói về cái gì: quảng cáo", "text_identification", NONE, [3, 3]],
  [7, 7, "Văn bản nói về cái gì: quảng cáo công ích", "text_identification", NONE, [3, 3]],
  [8, 8, "Văn bản nói về cái gì: hướng dẫn, lưu ý", "text_identification", NONE, [3, 3]],
  [9, 9, "Nội dung trùng khớp: thông báo, poster", "detail_match", NONE, [3, 3]],
  [10, 10, "Nội dung trùng khớp với biểu đồ", "chart_reading", ["detail_match"], [3, 4]],
  [11, 12, "Nội dung trùng khớp: tin ngắn", "detail_match", NONE, [4, 4]],
  [13, 15, "Sắp xếp thứ tự câu", "sentence_order", NONE, [4, 4]],
  [16, 18, "Điền nội dung vào chỗ trống", "fill_blank_content", ["fill_blank_connector"], [4, 4]],
  [19, 19, "Điền phó từ / từ nối", "fill_blank_connector", NONE, [4, 4]],
  [20, 20, "Chủ đề của đoạn (cặp 19–20)", "main_idea", ["central_thought"], [4, 4]],
  [21, 21, "Điền quán ngữ (관용 표현)", "fill_blank_idiom", NONE, [4, 4]],
  [22, 22, "Nội dung trùng khớp (cặp 21–22)", "detail_match", ["central_thought"], [4, 4]],
  [23, 23, "Tâm trạng nhân vật ở phần gạch chân", "emotion", NONE, [4, 5]],
  [24, 24, "Nội dung trùng khớp (cặp 23–24)", "detail_match", NONE, [4, 5]],
  [25, 27, "Giải thích đúng tít báo", "headline", NONE, [5, 5]],
  [28, 31, "Điền nội dung vào chỗ trống (học thuật)", "fill_blank_content", NONE, [5, 6]],
  [32, 34, "Nội dung trùng khớp (học thuật)", "detail_match", NONE, [5, 5]],
  [35, 38, "Chủ đề của đoạn", "main_idea", NONE, [5, 5]],
  [39, 41, "Chèn câu <보기>", "insert_sentence", NONE, [5, 5]],
  [42, 42, "Tâm trạng / thái độ nhân vật ở phần gạch chân", "emotion", ["attitude"], [5, 5]],
  [43, 43, "Nội dung trùng khớp (cặp 42–43)", "detail_match", NONE, [5, 5]],
  [44, 44, "Chủ đề của bài học thuật dài", "main_idea", NONE, [6, 6]],
  [45, 45, "Điền nội dung (cặp 44–45)", "fill_blank_content", NONE, [6, 6]],
  [46, 46, "Thái độ của tác giả", "attitude", NONE, [6, 6]],
  [47, 47, "Nội dung trùng khớp (cặp 46–47)", "detail_match", NONE, [6, 6]],
  [48, 48, "Mục đích viết", "purpose", NONE, [6, 6]],
  [49, 49, "Điền nội dung (bộ ba 48–50)", "fill_blank_content", NONE, [6, 6]],
  [50, 50, "Thái độ của tác giả ở phần gạch chân", "attitude", NONE, [6, 6]],
];

const WRITING_TYPES: RawType[] = [
  [51, 51, "Viết 2 câu vào chỗ trống: văn bản thực dụng", "practical_completion", NONE, [3, 4]],
  [52, 52, "Viết 2 câu vào chỗ trống: đoạn văn giải thích", "expository_completion", NONE, [4, 4]],
  [53, 53, "Mô tả và phân tích số liệu", "data_description", NONE, [4, 5]],
  [54, 54, "Nghị luận", "argumentative_essay", NONE, [5, 6]],
];

const CHAR_LIMITS: Record<string, { min: number; max: number }> = {
  W53: { min: 200, max: 300 },
  W54: { min: 600, max: 700 },
};

function expand(
  skill: Skill,
  format: QuestionTypeConfig["format"],
  rows: readonly RawType[],
): QuestionTypeConfig[] {
  const out: QuestionTypeConfig[] = [];
  for (const [from, to, name_vi, subskill, extras, difficulty] of rows) {
    for (let n = from; n <= to; n++) {
      const group = TYPE_GROUPS.find(
        (g) => g.skill === skill && n >= g.range[0] && n <= g.range[1],
      );
      if (!group) throw new Error(`Không có nhóm dạng chứa ${codeOf(skill, n)}`);
      const code = codeOf(skill, n);
      out.push({
        code,
        skill,
        type_group: group.group,
        range: group.range,
        name_vi,
        subskill,
        allowed_subskills: [subskill, ...extras],
        typical_difficulty: difficulty,
        format,
        paired: group.paired,
        ...(CHAR_LIMITS[code] ? { char_limit: CHAR_LIMITS[code] } : {}),
      });
    }
  }
  return out;
}

export const topikII: ProgramConfig = {
  code: "topik-ii",
  name: "TOPIK II (3–6급)",
  total_max_score: 300,
  sections: [
    {
      skill: "listening",
      order: 1,
      question_count: 50,
      duration_sec: 60 * 60,
      max_score: 100,
      range: [1, 50],
    },
    {
      skill: "writing",
      order: 2,
      question_count: 4,
      duration_sec: 50 * 60,
      max_score: 100,
      range: [51, 54],
    },
    {
      skill: "reading",
      order: 3,
      question_count: 50,
      duration_sec: 70 * 60,
      max_score: 100,
      range: [1, 50],
    },
  ],
  level_thresholds: [
    { level: 3, label: "3급", min_score: 120 },
    { level: 4, label: "4급", min_score: 150 },
    { level: 5, label: "5급", min_score: 190 },
    { level: 6, label: "6급", min_score: 230 },
  ],
  subskills: TOPIK_II_SUBSKILLS,
  traps: TOPIK_II_TRAPS,
  difficulty_range: { min: 3, max: 6 },
  type_groups: TYPE_GROUPS,
  question_types: [
    ...expand("listening", "multiple_choice", LISTENING_TYPES),
    ...expand("reading", "multiple_choice", READING_TYPES),
    ...expand("writing", "constructed", WRITING_TYPES),
  ],
};
