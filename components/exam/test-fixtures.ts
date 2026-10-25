/**
 * Dữ liệu mẫu dùng chung cho test component của trình làm đề (không phải nội dung thật).
 * Đề 4 câu, 15 phút: khối 1 là hai câu đơn (R01-2), khối 2 là một bộ dùng chung ngữ liệu (R19-20).
 */
import type { PublicQuestion } from "@/lib/practice/types";
import type { ExamResult, PublicExam, PublicExamQuestion, QuestionResult } from "@/lib/exam/types";

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
