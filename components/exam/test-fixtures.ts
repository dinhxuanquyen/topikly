/**
 * Dữ liệu mẫu dùng chung cho test component của trình làm đề (không phải nội dung thật).
 * Đề 4 câu, 15 phút: khối 1 là hai câu đơn (R01-2), khối 2 là một bộ dùng chung ngữ liệu (R19-20).
 */
import type { PublicQuestion } from "@/lib/practice/types";
import type {
  ExamResult,
  ExamWritingAnswer,
  PublicExam,
  PublicExamQuestion,
  QuestionResult,
  WritingReviewItem,
} from "@/lib/exam/types";
import {
  charLimitStatus,
  countChars,
  type WritingPrompt,
  type WritingReveal,
} from "@/lib/practice/writing-types";
import {
  BLANKS_PROMPT,
  BLANKS_REVEAL,
  ESSAY_PROMPT,
  ESSAY_REVEAL,
} from "@/components/writing/writing-test-fixtures";

export const INSTRUCTION_1 = "※ [1~2] ( )에 들어갈 말로 가장 알맞은 것을 고르십시오.";
export const INSTRUCTION_2 = "※ [3~4] 다음 글을 읽고 물음에 답하십시오.";
export const SHARED_PASSAGE = "공유 지문입니다.";
export const SINGLE_STEM_1 = "단일 문항 줄거리 하나";
export const SINGLE_STEM_2 = "단일 문항 줄거리 둘";
export const GROUP_STEM_1 = "윗글에 나타난 '나'의 심정으로 알맞은 것을 고르십시오.";
export const GROUP_STEM_2 = "윗글의 내용으로 알 수 있는 것을 고르십시오.";

function question(
  id: string,
  typeCode: string,
  stem: string,
  extra: Partial<PublicQuestion> = {},
): PublicQuestion {
  return {
    id,
    program: "topik-ii",
    type_code: typeCode,
    skill: "reading",
    subskill: "main_idea",
    difficulty: 4,
    stem,
    choices: [
      { label: "①", text: `${id} 첫째` },
      { label: "②", text: `${id} 둘째` },
      { label: "③", text: `${id} 셋째` },
      { label: "④", text: `${id} 넷째` },
    ],
    ...extra,
  };
}

function item(number: number, q: PublicQuestion): PublicExamQuestion {
  return { number, question: q };
}

export const EXAM: PublicExam = {
  id: "doc-01",
  program: "topik-ii",
  kind: "mini",
  title: "Mini test Đọc 01",
  status: "draft",
  skills: ["reading"],
  question_count: 4,
  duration_sec: 900,
  sections: [
    {
      skill: "reading",
      order: 1,
      duration_sec: 900,
      question_count: 4,
      max_score: 100,
      blocks: [
        {
          type_group: "R01-2",
          first_number: 1,
          last_number: 2,
          instruction_ko: INSTRUCTION_1,
          shared_material: false,
          questions: [
            item(1, question("r01-0001", "R01", SINGLE_STEM_1, { passage: "첫 번째 지문입니다." })),
            item(2, question("r03-0001", "R02", SINGLE_STEM_2, { passage: "두 번째 지문입니다." })),
          ],
        },
        {
          type_group: "R19-20",
          first_number: 3,
          last_number: 4,
          instruction_ko: INSTRUCTION_2,
          shared_material: true,
          questions: [
            item(
              3,
              question("r19-0001", "R19", GROUP_STEM_1, {
                passage: SHARED_PASSAGE,
                group_key: "g1",
              }),
            ),
            item(
              4,
              question("r20-0001", "R20", GROUP_STEM_2, {
                passage: SHARED_PASSAGE,
                group_key: "g1",
              }),
            ),
          ],
        },
      ],
    },
  ],
};

function qr(
  id: string,
  number: number,
  typeCode: string,
  group: string,
  selected: QuestionResult["selectedLabel"],
  correctLabel: QuestionResult["correctLabel"],
): QuestionResult {
  return {
    questionId: id,
    number,
    skill: "reading",
    type_code: typeCode,
    type_group: group,
    subskill: "main_idea",
    correct: selected === correctLabel,
    selectedLabel: selected,
    correctLabel,
    explanation_vi: `Lời giải của ${id}.`,
    choices: (["①", "②", "③", "④"] as const).map((label) => ({
      label,
      correct: label === correctLabel,
      ...(label === correctLabel ? {} : { note_vi: `Vì sao ${label} của ${id} sai.` }),
    })),
  };
}

/** Câu 1 đúng, câu 2 sai, câu 3 bỏ trống, câu 4 đúng. */
export const RESULT: ExamResult = {
  examId: "doc-01",
  program: "topik-ii",
  kind: "mini",
  title: "Mini test Đọc 01",
  submittedAt: 1_700_000_000_000,
  timeSpentMs: 605_000,
  timedOut: false,
  sections: [{ skill: "reading", correct: 2, total: 4, unanswered: 1, score: 50, max_score: 100 }],
  total_score: 50,
  total_max_score: 100,
  level: {
    level: 3,
    label: "3급",
    compared_score: 150,
    total_max_score: 300,
    is_estimate: true,
    next_level: { level: 4, label: "4급", points_needed: 30 },
  },
  by_type_group: [
    {
      code: "R01-2",
      name_vi: "Chọn từ điền vào chỗ trống",
      correct: 1,
      total: 2,
      type_codes: ["R01", "R02"],
    },
    {
      code: "R19-20",
      name_vi: "Đọc hiểu bộ câu",
      correct: 1,
      total: 2,
      type_codes: ["R19", "R20"],
    },
  ],
  by_subskill: [
    {
      code: "main_idea",
      name_vi: "Tìm ý chính",
      correct: 2,
      total: 4,
      type_codes: ["R01", "R02", "R19", "R20"],
    },
  ],
  questions: [
    qr("r01-0001", 1, "R01", "R01-2", "②", "②"),
    qr("r03-0001", 2, "R02", "R01-2", "①", "③"),
    qr("r19-0001", 3, "R19", "R19-20", null, "④"),
    qr("r20-0001", 4, "R20", "R19-20", "④", "④"),
  ],
};

// ------------------------------------------------------------------ Test trình độ

export const PLACEMENT_EXAM: PublicExam = { ...EXAM, kind: "placement", title: "Test trình độ 01" };

/** Kết quả placement: bậc 3 vững (2/2), bậc 4 chưa vững (1/3) -> ước lượng 3급. */
export const PLACEMENT_RESULT: ExamResult = {
  ...RESULT,
  kind: "placement",
  title: "Test trình độ 01",
  placement: {
    estimated_level: 3,
    estimated_label: "3급",
    start_level: 3,
    start_label: "3급",
    bands: [
      { difficulty: 3, correct: 2, total: 2, ratio: 1, passed: true },
      { difficulty: 4, correct: 1, total: 3, ratio: 0.33, passed: false },
    ],
    weak_subskills: [
      {
        code: "main_idea",
        name_vi: "Tìm ý chính",
        correct: 2,
        total: 4,
        type_codes: ["R01", "R02"],
      },
    ],
  },
};

// ------------------------------------------------------------------ đề Nghe

export const LISTEN_INSTRUCTION_1 = "※ [1~2] 다음을 듣고 알맞은 것을 고르십시오.";
export const LISTEN_INSTRUCTION_2 = "※ [3~4] 다음을 듣고 물음에 답하십시오.";
export const LISTEN_LINE_1 = "여자: 이 원피스 좀 맡기려고요.";
export const LISTEN_LINE_2 = "남자: 네, 그럼요.";
export const LISTEN_SHARED_LINE = "남자: 이번 주말에 등산 갈래요?";
const SPEAKERS = [
  { label: "여자", gender: "female" },
  { label: "남자", gender: "male" },
] as const;

function listeningQuestion(
  id: string,
  typeCode: string,
  extra: Partial<PublicQuestion> = {},
): PublicQuestion {
  return question(id, typeCode, "다음을 듣고 알맞은 것을 고르십시오.", {
    skill: "listening",
    subskill: "dialogue_gist",
    transcript_ko: `${LISTEN_LINE_1}\n${LISTEN_LINE_2}`,
    speakers: [...SPEAKERS],
    audio_url: null,
    ...extra,
  });
}

/** Mini test Nghe nháp: 4 câu, 25 phút; khối 1 hai câu đơn (L01-2), khối 2 một bộ dùng chung bài nghe (L21-22). Mọi audio_url null. */
export const LISTENING_EXAM: PublicExam = {
  id: "nghe-01",
  program: "topik-ii",
  kind: "mini",
  title: "Mini test Nghe 01",
  status: "draft",
  skills: ["listening"],
  question_count: 4,
  duration_sec: 1500,
  sections: [
    {
      skill: "listening",
      order: 1,
      duration_sec: 1500,
      question_count: 4,
      max_score: 100,
      blocks: [
        {
          type_group: "L01-3",
          first_number: 1,
          last_number: 2,
          instruction_ko: LISTEN_INSTRUCTION_1,
          shared_material: false,
          questions: [
            item(1, listeningQuestion("l10-0001", "L10")),
            item(2, listeningQuestion("l11-0001", "L11")),
          ],
        },
        {
          type_group: "L21-22",
          first_number: 3,
          last_number: 4,
          instruction_ko: LISTEN_INSTRUCTION_2,
          shared_material: true,
          questions: [
            item(
              3,
              listeningQuestion("l21-0001", "L21", {
                transcript_ko: LISTEN_SHARED_LINE,
                group_key: "lg1",
              }),
            ),
            item(
              4,
              listeningQuestion("l22-0001", "L22", {
                transcript_ko: LISTEN_SHARED_LINE,
                group_key: "lg1",
              }),
            ),
          ],
        },
      ],
    },
  ],
};

/** Bản có đủ audio của LISTENING_EXAM. */
export function withAudio(
  exam: PublicExam,
  urlFor = (id: string) => `/audio/${id}.mp3`,
): PublicExam {
  return {
    ...exam,
    sections: exam.sections.map((section) =>
      section.skill === "writing"
        ? section
        : {
            ...section,
            blocks: section.blocks.map((block) => ({
              ...block,
              questions: block.questions.map((entry) => ({
                ...entry,
                question: { ...entry.question, audio_url: urlFor(entry.question.id) },
              })),
            })),
          },
    ),
  };
}

export const LISTEN_TRANSLATION_1 = "Tôi muốn gửi chiếc váy này.";
export const LISTEN_TRANSLATION_2 = "Vâng, được ạ.";

/** Kết quả đề Nghe: mọi câu bỏ trống; câu 1 có bản dịch đủ hai lượt thoại. */
export const LISTENING_RESULT: ExamResult = {
  ...RESULT,
  examId: "nghe-01",
  title: "Mini test Nghe 01",
  sections: [{ skill: "listening", correct: 0, total: 4, unanswered: 4, score: 0, max_score: 100 }],
  total_score: 0,
  questions: LISTENING_EXAM.sections[0]!.blocks.flatMap((block) => block.questions).map(
    (entry) => ({
      ...qr(entry.question.id, entry.number, entry.question.type_code, "L01-3", null, "①"),
      skill: "listening" as const,
      subskill: "dialogue_gist",
      ...(entry.number === 1
        ? { transcript_vi: `${LISTEN_TRANSLATION_1}\n${LISTEN_TRANSLATION_2}` }
        : {}),
    }),
  ),
};

// ------------------------------------------------------------------ đề Viết

export const WRITING_POINTS = { W51: 10, W52: 10, W53: 30, W54: 50 } as const;

const W51_PROMPT: WritingPrompt = { ...BLANKS_PROMPT };
const W52_PROMPT: WritingPrompt = {
  ...BLANKS_PROMPT,
  id: "w52-0001",
  type_code: "W52",
  difficulty: 4,
  passage: "낮잠은 ( ㉠ ). 그러나 ( ㉡ ).",
};
const W53_PROMPT: WritingPrompt = { ...ESSAY_PROMPT };
const W54_PROMPT: WritingPrompt = {
  ...ESSAY_PROMPT,
  id: "w54-0001",
  type_code: "W54",
  difficulty: 5,
  stem: "다음을 주제로 하여 자신의 생각을 600~700자로 글을 쓰십시오.",
  task: "속도를 중시하는 문화에 대해 쓰십시오.",
  chart_data: undefined,
  data_is_fictional: undefined,
  char_limit: { min: 30, max: 60 },
};

const WRITING_PROMPTS = [W51_PROMPT, W52_PROMPT, W53_PROMPT, W54_PROMPT];

/** Mini test Viết nháp: 4 câu W51~W54, 50 phút. `number` chỉ là vị trí 1..4; số câu thật suy từ type_code. */
export const WRITING_EXAM: PublicExam = {
  id: "viet-01",
  program: "topik-ii",
  kind: "mini",
  title: "Mini test Viết 01",
  status: "draft",
  skills: ["writing"],
  question_count: 4,
  duration_sec: 3000,
  sections: [
    {
      skill: "writing",
      order: 1,
      duration_sec: 3000,
      question_count: 4,
      max_score: 100,
      blocks: [],
      writing_items: WRITING_PROMPTS.map((prompt, index) => ({
        number: index + 1,
        type_group: prompt.type_code,
        max_points: WRITING_POINTS[prompt.type_code as keyof typeof WRITING_POINTS],
        prompt,
      })),
    },
  ],
};

const REVEALS: Record<string, WritingReveal> = {
  "w51-0001": BLANKS_REVEAL,
  "w52-0001": { ...BLANKS_REVEAL, id: "w52-0001", type_code: "W52" },
  "w53-0002": ESSAY_REVEAL,
  "w54-0001": { ...ESSAY_REVEAL, id: "w54-0001", type_code: "W54" },
};

/** Bài đã nộp mặc định của WRITING_RESULT: câu 51 đúng một đáp án mẫu, 52 bỏ trống, 53 trong khung, 54 dưới khung. */
export const WRITING_SUBMITTED: Record<string, ExamWritingAnswer> = {
  "w51-0001": { blanks: { "㉠": "참석할 수 없습니다.", "㉡": "미리 말씀드립니다" } },
  "w52-0001": { blanks: { "㉠": "", "㉡": "" } },
  "w53-0002": { text: "열다섯 글자짜리 글입니다 하나둘" },
  "w54-0001": { text: "짧은 글" },
};

function reviewItem(prompt: WritingPrompt, index: number): WritingReviewItem {
  const answer = WRITING_SUBMITTED[prompt.id]!;
  const charCount = answer.text !== undefined ? countChars(answer.text) : undefined;
  return {
    number: index + 1,
    id: prompt.id,
    type_code: prompt.type_code,
    type_group: prompt.type_code,
    subskill: prompt.subskill,
    format: prompt.format,
    prompt,
    answer,
    ...(charCount !== undefined ? { char_count: charCount } : {}),
    ...(charCount !== undefined && prompt.char_limit
      ? { char_status: charLimitStatus(charCount, prompt.char_limit) }
      : {}),
    max_points: WRITING_POINTS[prompt.type_code as keyof typeof WRITING_POINTS],
    reveal: REVEALS[prompt.id]!,
  };
}

/** Kết quả Mini Viết: không có phần chấm tự động nên `level` là null và các bảng theo phần/dạng rỗng. */
export const WRITING_RESULT: ExamResult = {
  examId: "viet-01",
  program: "topik-ii",
  kind: "mini",
  title: "Mini test Viết 01",
  submittedAt: 1_700_000_100_000,
  timeSpentMs: 1_200_000,
  timedOut: false,
  sections: [],
  total_score: 0,
  total_max_score: 0,
  level: null,
  writing: {
    order: 1,
    duration_sec: 3000,
    items: WRITING_PROMPTS.map(reviewItem),
    max_score: 100,
    max_points_total: 100,
    level_basis: {
      thresholds: [
        { level: 3, label: "3급", min_score: 120 },
        { level: 4, label: "4급", min_score: 150 },
        { level: 5, label: "5급", min_score: 190 },
        { level: 6, label: "6급", min_score: 230 },
      ],
      total_max_score: 300,
      auto_score: 0,
      auto_max_score: 0,
      is_estimate: true,
    },
  },
  by_type_group: [],
  by_subskill: [],
  questions: [],
};
