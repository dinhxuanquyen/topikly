import { describe, expect, it } from "vitest";
import { topikII, type ProgramConfig } from "@/lib/db/programs";
import { estimateLevel, InvalidChoiceError, scoreExam } from "@/lib/exam/score";
import type { FullExam, FullExamQuestion } from "@/lib/exam/source";
import type { FullQuestion } from "@/lib/practice/source";
import { CHOICE_LABELS } from "@/lib/practice/types";

/** Câu giả: đáp án đúng ở chỉ số `correctIndex`. */
function q(
  id: string,
  typeCode: string,
  subskill: string,
  correctIndex: number,
  groupKey?: string,
): FullQuestion {
  return {
    id,
    program: "topik-ii",
    type_code: typeCode,
    skill: "reading",
    subskill,
    difficulty: 3,
    stem: "stem",
    ...(groupKey ? { group_key: groupKey } : {}),
    choices: CHOICE_LABELS.map((label, i) => ({
      label,
      text: `p${i + 1}`,
      correct: i === correctIndex,
      ...(i === correctIndex ? {} : { note_vi: `vì sao ${label} sai`, trap: "detail_swap" }),
    })),
    correctLabel: CHOICE_LABELS[correctIndex]!,
    explanation_vi: `giải ${id}`,
  };
}

function item(number: number, typeGroup: string, question: FullQuestion): FullExamQuestion {
  return { number, type_group: typeGroup, question };
}

/** Đề Mini Đọc 6 câu: 3 nhóm dạng, 3 subskill. Đáp án đúng: ①②③④①②. */
function miniExam(overrides: Partial<FullExam> = {}): FullExam {
  return {
    id: "doc-t",
    program: "topik-ii",
    kind: "mini",
    title: "Mini test thử",
    status: "published",
    sections: [
      {
        skill: "reading",
        order: 1,
        duration_sec: 900,
        question_count: 6,
        max_score: 100,
        questions: [
          item(1, "R01-2", q("r01-0001", "R01", "fill_blank_grammar", 0)),
          item(2, "R01-2", q("r02-0001", "R02", "fill_blank_grammar", 1)),
          item(3, "R35-38", q("r35-0001", "R35", "main_idea", 2)),
          item(4, "R35-38", q("r36-0001", "R36", "main_idea", 3)),
          item(5, "R13-15", q("r14-0001", "R14", "sentence_order", 0)),
          item(6, "R13-15", q("r15-0001", "R15", "sentence_order", 1)),
        ],
      },
    ],
    ...overrides,
  };
}

const ALL_RIGHT = {
  "r01-0001": "①",
  "r02-0001": "②",
  "r35-0001": "③",
  "r36-0001": "④",
  "r14-0001": "①",
  "r15-0001": "②",
};

describe("estimateLevel: ngưỡng cấp lấy từ cấu hình", () => {
  const level = (score: number) => estimateLevel(score, topikII, false);

  it("biên 120/150/190/230 và ngay dưới biên", () => {
    expect(level(119).level).toBeNull();
    expect(level(119).label).toBe("Chưa đạt cấp");
    expect([120, 149].map((s) => level(s).level)).toEqual([3, 3]);
    expect([150, 189].map((s) => level(s).level)).toEqual([4, 4]);
    expect([190, 229].map((s) => level(s).level)).toEqual([5, 5]);
    expect([230, 300].map((s) => level(s).level)).toEqual([6, 6]);
    expect(level(150).label).toBe("4급");
  });

  it("dưới ngưỡng: next_level là 3급; cấp cao nhất: next_level null", () => {
    expect(level(0).next_level).toEqual({ level: 3, label: "3급", points_needed: 120 });
    expect(level(100).next_level?.points_needed).toBe(20);
    expect(level(149).next_level).toEqual({ level: 4, label: "4급", points_needed: 1 });
    expect(level(230).next_level).toBeNull();
  });

  it("ghi lại điểm so sánh, thang tổng và cờ ước lượng", () => {
    expect(estimateLevel(200, topikII, true)).toMatchObject({
      level: 5,
      compared_score: 200,
      total_max_score: 300,
      is_estimate: true,
    });
  });

  it("đọc ngưỡng từ cấu hình chứ không hard-code", () => {
    const custom: ProgramConfig = {
      ...topikII,
      level_thresholds: [
        { level: 1, label: "1급", min_score: 80 },
        { level: 2, label: "2급", min_score: 140 },
      ],
    };
    expect(estimateLevel(79, custom, false).level).toBeNull();
    expect(estimateLevel(80, custom, false).level).toBe(1);
    expect(estimateLevel(140, custom, false)).toMatchObject({ level: 2, next_level: null });
  });
});

describe("scoreExam: chấm điểm", () => {
  it("đúng hết: điểm phần = max, Mini chiếu lên thang 300 và là ước lượng", () => {
    const r = scoreExam(miniExam(), ALL_RIGHT, topikII, { submittedAt: 123 });
    expect(r.sections).toEqual([
      { skill: "reading", correct: 6, total: 6, unanswered: 0, score: 100, max_score: 100 },
    ]);
    expect(r.total_score).toBe(100);
    expect(r.total_max_score).toBe(100);
    expect(r.level).toMatchObject({
      level: 6,
      compared_score: 300,
      total_max_score: 300,
      is_estimate: true,
    });
    expect(r.submittedAt).toBe(123);
    expect(r.timedOut).toBe(false);
    expect(r.examId).toBe("doc-t");
    expect(r.title).toBe("Mini test thử");
  });

  it("quy điểm theo số câu thật của đề: 4/6 -> round(66.67) = 67, chiếu lên 201 -> 5급", () => {
    const r = scoreExam(miniExam(), { ...ALL_RIGHT, "r35-0001": "①", "r36-0001": "①" }, topikII);
    expect(r.sections[0]).toMatchObject({ correct: 4, total: 6, score: 67 });
    expect(r.level).toMatchObject({ compared_score: 201, level: 5 });
  });

  it("bỏ trống (thiếu khoá hoặc null) tính sai và đếm unanswered", () => {
    const r = scoreExam(miniExam(), { "r01-0001": "①", "r02-0001": null }, topikII);
    expect(r.sections[0]).toMatchObject({ correct: 1, total: 6, unanswered: 5, score: 17 });
    expect(r.questions.filter((x) => x.selectedLabel === null)).toHaveLength(5);
    expect(r.questions.every((x) => x.correct === (x.questionId === "r01-0001"))).toBe(true);
    // 17/100 -> 51/300: dưới ngưỡng thấp nhất
    expect(r.level!.level).toBeNull();
    expect(r.level!.label).toBe("Chưa đạt cấp");
  });

  it("không trả lời gì: 0 điểm, vẫn có đầy đủ đáp án để xem lại", () => {
    const r = scoreExam(miniExam(), {}, topikII);
    expect(r.total_score).toBe(0);
    expect(r.sections[0]!.unanswered).toBe(6);
    expect(r.questions).toHaveLength(6);
    for (const x of r.questions) {
      expect(x.choices).toHaveLength(4);
      expect(x.correctLabel).toMatch(/[①-④]/);
      expect(x.explanation_vi).toContain("giải");
    }
  });

  it("khoá lạ (không thuộc đề) bị bỏ qua, kể cả tên khoá nhạy cảm", () => {
    const r = scoreExam(
      miniExam(),
      { ...ALL_RIGHT, "r99-9999": "⑨", constructor: "①", toString: "①" },
      topikII,
    );
    expect(r.sections[0]!.correct).toBe(6);
  });

  it("nhãn không hợp lệ ném InvalidChoiceError (mã invalid_choice)", () => {
    for (const bad of ["⑤", "1", "", "①①", "a"]) {
      let err: unknown;
      try {
        scoreExam(miniExam(), { ...ALL_RIGHT, "r35-0001": bad }, topikII);
      } catch (e) {
        err = e;
      }
      expect(err, bad).toBeInstanceOf(InvalidChoiceError);
      expect((err as InvalidChoiceError).code).toBe("invalid_choice");
      expect((err as InvalidChoiceError).questionId).toBe("r35-0001");
    }
  });

  it("nhãn sai ở khoá lạ không làm hỏng bài (chỉ kiểm khoá thuộc đề)", () => {
    expect(() => scoreExam(miniExam(), { ...ALL_RIGHT, "khong-co": "⑤" }, topikII)).not.toThrow();
  });

  it("câu hỏi giữ đúng thứ tự trong đề, kèm số câu, kỹ năng, dạng, nhóm, subskill", () => {
    const r = scoreExam(miniExam(), ALL_RIGHT, topikII);
    expect(r.questions.map((x) => x.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.questions[2]).toMatchObject({
      questionId: "r35-0001",
      skill: "reading",
      type_code: "R35",
      type_group: "R35-38",
      subskill: "main_idea",
      correct: true,
      correctLabel: "③",
      selectedLabel: "③",
    });
    expect(r.questions[2]!.choices.find((c) => c.label === "①")).toMatchObject({
      correct: false,
      trap: "detail_swap",
      trap_name_vi: expect.any(String),
    });
  });

  it("ghi nhận timeSpentMs và timedOut", () => {
    const r = scoreExam(miniExam(), {}, topikII, { timeSpentMs: 5000, timedOut: true });
    expect(r.timeSpentMs).toBe(5000);
    expect(r.timedOut).toBe(true);
    expect("timeSpentMs" in scoreExam(miniExam(), {}, topikII)).toBe(false);
  });
});

describe("scoreExam: thống kê theo nhóm dạng và subskill", () => {
  // R01-2 đúng 2/2, R35-38 đúng 0/2, R13-15 đúng 1/2
  const answers = { "r01-0001": "①", "r02-0001": "②", "r14-0001": "①", "r15-0001": "①" };

  it("by_type_group theo thứ tự cấu hình, có tên, mã dạng và đúng/tổng", () => {
    const r = scoreExam(miniExam(), answers, topikII);
    expect(r.by_type_group.map((g) => g.code)).toEqual(["R01-2", "R13-15", "R35-38"]);
    expect(r.by_type_group[0]).toEqual({
      code: "R01-2",
      name_vi: "Điền ngữ pháp vào chỗ trống",
      correct: 2,
      total: 2,
      type_codes: ["R01", "R02"],
    });
    expect(r.by_type_group[1]).toMatchObject({ code: "R13-15", correct: 1, total: 2 });
    expect(r.by_type_group[2]).toMatchObject({ code: "R35-38", correct: 0, total: 2 });
  });

  it("by_subskill sắp theo tỉ lệ đúng tăng dần (yếu nhất trước)", () => {
    const r = scoreExam(miniExam(), answers, topikII);
    expect(r.by_subskill.map((s) => [s.code, s.correct, s.total])).toEqual([
      ["main_idea", 0, 2],
      ["sentence_order", 1, 2],
      ["fill_blank_grammar", 2, 2],
    ]);
    expect(r.by_subskill[0]!.name_vi).toBe(
      topikII.subskills.find((s) => s.code === "main_idea")!.name_vi,
    );
  });
});

describe("scoreExam: điểm thật và ước lượng", () => {
  const readingOnly: ProgramConfig = {
    ...topikII,
    total_max_score: 100,
    level_thresholds: [
      { level: 1, label: "1급", min_score: 40 },
      { level: 2, label: "2급", min_score: 80 },
    ],
    sections: [
      {
        skill: "reading",
        order: 1,
        question_count: 6,
        duration_sec: 1800,
        max_score: 100,
        range: [1, 50],
      },
    ],
  };

  it("đề phủ hết phần thi và đủ số câu: điểm thật, không phải ước lượng", () => {
    const r = scoreExam(miniExam(), ALL_RIGHT, readingOnly);
    expect(r.level).toMatchObject({
      compared_score: 100,
      total_max_score: 100,
      is_estimate: false,
    });
    expect(r.level!.level).toBe(2);
  });

  it("đề ít câu hơn cấu hình phần thi: vẫn là ước lượng", () => {
    const longer: ProgramConfig = {
      ...readingOnly,
      sections: [{ ...readingOnly.sections[0]!, question_count: 50 }],
    };
    const r = scoreExam(miniExam(), ALL_RIGHT, longer);
    expect(r.level!.is_estimate).toBe(true);
    expect(r.level!.compared_score).toBe(100);
  });

  it("hai phần thi: tổng điểm là tổng các phần, chiếu lên thang tổng khi thiếu phần", () => {
    const base = miniExam();
    const listening = {
      skill: "listening" as const,
      order: 2,
      duration_sec: 600,
      question_count: 2,
      max_score: 100,
      questions: [
        item(1, "L01-03", { ...q("l01-0001", "L01", "picture_match", 0), skill: "listening" }),
        item(2, "L01-03", { ...q("l02-0001", "L02", "picture_match", 1), skill: "listening" }),
      ],
    };
    const r = scoreExam(
      { ...base, sections: [...base.sections, listening] },
      { ...ALL_RIGHT, "l01-0001": "①" },
      topikII,
    );
    expect(r.sections.map((s) => [s.skill, s.score])).toEqual([
      ["reading", 100],
      ["listening", 50],
    ]);
    expect(r.total_score).toBe(150);
    expect(r.total_max_score).toBe(200);
    // thiếu Viết: chiếu 150/200 lên 300 = 225 -> 5급 (ước lượng)
    expect(r.level).toMatchObject({ compared_score: 225, level: 5, is_estimate: true });
  });
});
