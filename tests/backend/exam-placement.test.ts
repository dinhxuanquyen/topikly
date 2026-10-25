import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { POST } from "@/app/api/exam/submit/route";
import { validateContent, type ValidationIssue } from "@/lib/db/content-validation";
import {
  PLACEMENT_MIN_BANDS,
  PLACEMENT_MIN_PER_BAND,
  validateExamFile,
  type ExamQuestionRef,
} from "@/lib/db/exam-validation";
import { EXAM_KINDS, topikII, type ProgramConfig } from "@/lib/db/programs";
import { estimatePlacement, type PlacementItem } from "@/lib/exam/placement";
import { getExam, getExams, getPlacementExam } from "@/lib/exam/queries";
import { scoreExam } from "@/lib/exam/score";
import {
  clearExamCache,
  getFullExam,
  getPlacementPublicExam,
  getPublicExam,
  listExams,
  type FullExam,
  type FullExamQuestion,
} from "@/lib/exam/source";
import type { ExamApiErrorBody, ExamResult } from "@/lib/exam/types";
import type { FullQuestion } from "@/lib/practice/source";
import { clearPracticeCache } from "@/lib/practice/source";
import { CHOICE_LABELS } from "@/lib/practice/types";

afterEach(() => {
  clearExamCache();
  clearPracticeCache();
});

const REAL_ROOT = path.join(process.cwd(), "content");
const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/content/valid");

// ------------------------------------------------------------------ cấu hình

describe("cấu hình placement của TOPIK II", () => {
  it("EXAM_KINDS có placement; blueprint 12 câu / 15 phút; PlacementConfig là dữ liệu", () => {
    expect(EXAM_KINDS).toContain("placement");
    expect(topikII.exam_blueprints.placement?.reading).toEqual({
      question_count: 12,
      duration_sec: 15 * 60,
    });
    expect(topikII.placement).toEqual({
      exam_id: "placement-01",
      band_pass_ratio: 0.6,
      weak_subskill_count: 3,
    });
  });
});

// ------------------------------------------------------------------ estimatePlacement

/** `n` câu của bậc `difficulty`, `right` câu đúng; subskill mặc định theo bậc ("s<bậc>"). */
function band(difficulty: number, right: number, n: number, subskill?: string): PlacementItem[] {
  return Array.from({ length: n }, (_, i) => ({
    difficulty,
    correct: i < right,
    subskill: subskill ?? `s${difficulty}`,
    type_code: `R${difficulty}`,
  }));
}

describe("estimatePlacement", () => {
  const est = (items: PlacementItem[], program = topikII) => estimatePlacement(items, program);

  it("mọi bậc qua -> trình độ là bậc cao nhất; bands tăng dần, kèm ratio làm tròn 2 chữ số", () => {
    const e = est([...band(6, 2, 3), ...band(3, 3, 3), ...band(5, 3, 3), ...band(4, 2, 3)]);
    expect(e.bands.map((b) => b.difficulty)).toEqual([3, 4, 5, 6]);
    expect(e.bands.every((b) => b.passed)).toBe(true);
    expect(e.bands[3]).toEqual({ difficulty: 6, correct: 2, total: 3, ratio: 0.67, passed: true });
    expect(e.estimated_level).toBe(6);
    expect(e.estimated_label).toBe("6급");
    expect(e.start_level).toBe(6);
    expect(e.start_label).toBe("6급");
  });

  it("gãy giữa chừng: bậc cao hơn đạt nhưng bậc thấp hơn trượt thì không tính", () => {
    // 3 qua, 4 qua, 5 trượt (1/3), 6 qua (3/3) -> dừng ở 4
    const e = est([...band(3, 3, 3), ...band(4, 2, 3), ...band(5, 1, 3), ...band(6, 3, 3)]);
    expect(e.bands.map((b) => b.passed)).toEqual([true, true, false, true]);
    expect(e.estimated_level).toBe(4);
    expect(e.estimated_label).toBe("4급");
    expect(e.start_level).toBe(4);
  });

  it("không qua bậc thấp nhất -> null, 'Chưa đạt 3급', bắt đầu từ difficulty_range.min", () => {
    const e = est([...band(3, 1, 3), ...band(4, 3, 3), ...band(5, 3, 3)]);
    expect(e.estimated_level).toBeNull();
    expect(e.estimated_label).toBe("Chưa đạt 3급");
    expect(e.start_level).toBe(topikII.difficulty_range.min);
    expect(e.start_label).toBe("3급");
  });

  it("bậc trống giữa chuỗi dừng chuỗi (đề có 3, 5, 6 và không có 4 -> chỉ tới 3)", () => {
    const e = est([...band(3, 2, 3), ...band(5, 3, 3), ...band(6, 3, 3)]);
    expect(e.bands.map((b) => b.difficulty)).toEqual([3, 5, 6]);
    expect(e.estimated_level).toBe(3);
    expect(e.estimated_label).toBe("3급");
    expect(e.start_level).toBe(3);
  });

  it("thiếu bậc thấp nhất (đề chỉ có 4, 5, 6) -> null, không suy ra gì từ các bậc trên", () => {
    const e = est([...band(4, 3, 3), ...band(5, 3, 3), ...band(6, 3, 3)]);
    expect(e.estimated_level).toBeNull();
    expect(e.estimated_label).toBe("Chưa đạt 3급");
    expect(e.start_level).toBe(3);
  });

  it("biên ngưỡng: đúng bằng band_pass_ratio là qua, dưới một câu là trượt", () => {
    // 3/5 = 0.6 qua; 2/5 = 0.4 trượt
    expect(est(band(3, 3, 5)).bands[0]).toMatchObject({ ratio: 0.6, passed: true });
    expect(est(band(3, 2, 5)).bands[0]).toMatchObject({ ratio: 0.4, passed: false });
  });

  it("đề rỗng: không có bậc, trình độ null", () => {
    const e = est([]);
    expect(e).toMatchObject({ estimated_level: null, bands: [], weak_subskills: [] });
    expect(e.start_level).toBe(3);
  });

  it("ngưỡng bậc, số kỹ năng yếu và nhãn lấy từ cấu hình chứ không hard-code", () => {
    const custom: ProgramConfig = {
      ...topikII,
      placement: { exam_id: "x", band_pass_ratio: 1, weak_subskill_count: 1 },
      level_thresholds: [
        { level: 3, label: "Sơ cấp", min_score: 100 },
        { level: 4, label: "Trung cấp", min_score: 150 },
      ],
    };
    // ratio 1: 2/3 không đủ
    const strict = estimatePlacement([...band(3, 3, 3), ...band(4, 2, 3)], custom);
    expect(strict.estimated_level).toBe(3);
    expect(strict.estimated_label).toBe("Sơ cấp");
    const none = estimatePlacement(band(3, 2, 3), custom);
    expect(none.estimated_label).toBe("Chưa đạt Sơ cấp");
    expect(none.start_label).toBe("Sơ cấp");
    // cấp không có trong level_thresholds: nhãn dự phòng, không bịa "급"
    const all = [...band(3, 3, 3), ...band(4, 3, 3), ...band(5, 3, 3), ...band(6, 3, 3)];
    expect(estimatePlacement(all, custom).estimated_label).toBe("Cấp 6");
    // weak_subskill_count = 1 -> chỉ 1 dòng dù có 2 kỹ năng sai trong vùng xét
    const weak = estimatePlacement([...band(3, 0, 1, "a"), ...band(3, 0, 1, "b")], custom);
    expect(weak.weak_subskills).toHaveLength(1);
  });

  describe("weak_subskills (review P10)", () => {
    it("chỉ xét câu có độ khó <= start_level + 1: bậc 6 sai không bị gọi là yếu với người cấp 4", () => {
      // 3 và 4 qua; 5 trượt (còn xét vì 5 = 4 + 1); 6 sai hết nhưng ngoài vùng xét
      const e = est([
        ...band(3, 3, 3, "grammar"),
        ...band(4, 2, 3, "order"),
        ...band(5, 0, 3, "idea"),
        ...band(6, 0, 3, "attitude"),
      ]);
      expect(e.estimated_level).toBe(4);
      expect(e.weak_subskills.map((r) => r.code)).toEqual(["idea", "order"]);
      expect(e.weak_subskills.find((r) => r.code === "idea")).toMatchObject({
        correct: 0,
        total: 3,
        type_codes: ["R5"],
      });
      expect(e.weak_subskills.some((r) => r.code === "attitude")).toBe(false);
    });

    it("chưa đạt bậc thấp nhất: vùng xét là min + 1 (bậc 3 và 4)", () => {
      const e = est([...band(3, 0, 3, "a"), ...band(4, 0, 3, "b"), ...band(5, 0, 3, "c")]);
      expect(e.weak_subskills.map((r) => r.code)).toEqual(["a", "b"]);
    });

    it("hoà tỉ lệ đúng: ưu tiên kỹ năng có câu độ khó thấp hơn, không theo chữ cái", () => {
      // zzz (bậc 3) và aaa (bậc 4) đều 0/1: zzz đứng trước dù xếp chữ cái sau
      const e = est([...band(3, 0, 1, "zzz"), ...band(4, 0, 1, "aaa"), ...band(3, 3, 2, "ok")]);
      expect(e.weak_subskills.map((r) => r.code)).toEqual(["zzz", "aaa"]);
    });

    it("hoà cả tỉ lệ lẫn độ khó: theo thứ tự trong program.subskills, rồi theo mã", () => {
      const [first, second] = topikII.subskills;
      const e = est([...band(3, 0, 1, second!.code), ...band(3, 0, 1, first!.code)]);
      expect(e.weak_subskills.map((r) => r.code)).toEqual([first!.code, second!.code]);
      expect(e.weak_subskills[0]!.name_vi).toBe(first!.name_vi);
      // mã ngoài danh mục: xếp sau, theo mã, name_vi dự phòng = mã
      const unknown = est([...band(3, 0, 1, "yyy"), ...band(3, 0, 1, "xxx")]);
      expect(unknown.weak_subskills.map((r) => [r.code, r.name_vi])).toEqual([
        ["xxx", "xxx"],
        ["yyy", "yyy"],
      ]);
    });

    it("tỉ lệ đúng thấp hơn đứng trước; bỏ kỹ năng đúng hết; tối đa weak_subskill_count", () => {
      const e = est([
        ...band(3, 1, 2, "half"),
        ...band(3, 0, 2, "none"),
        ...band(3, 2, 2, "full"),
        ...band(3, 0, 1, "d1"),
        ...band(3, 0, 1, "d2"),
      ]);
      expect(e.weak_subskills).toHaveLength(topikII.placement.weak_subskill_count);
      expect(e.weak_subskills[0]!.correct).toBe(0);
      expect(e.weak_subskills.some((r) => r.code === "full")).toBe(false);
      const clean = est(band(3, 3, 3));
      expect(clean.weak_subskills).toEqual([]);
    });

    it("type_codes gom các dạng câu của kỹ năng, đã sắp", () => {
      const items: PlacementItem[] = [
        { difficulty: 3, correct: false, subskill: "k", type_code: "R04" },
        { difficulty: 3, correct: false, subskill: "k", type_code: "R03" },
      ];
      expect(est(items).weak_subskills[0]).toMatchObject({ code: "k", type_codes: ["R03", "R04"] });
    });
  });
});

// ------------------------------------------------------------------ scoreExam với kind placement

function fq(id: string, typeCode: string, subskill: string, difficulty: number, correct: number) {
  const q: FullQuestion = {
    id,
    program: "topik-ii",
    type_code: typeCode,
    skill: "reading",
    subskill,
    difficulty,
    stem: "stem",
    choices: CHOICE_LABELS.map((label, i) => ({
      label,
      text: `p${i + 1}`,
      correct: i === correct,
      ...(i === correct ? {} : { note_vi: `vì sao ${label} sai`, trap: "detail_swap" }),
    })),
    correctLabel: CHOICE_LABELS[correct]!,
    explanation_vi: `giải ${id}`,
  };
  return q;
}

/** 8 câu: bậc 3,3,4,4,5,5,6,6; đáp án đúng luôn ①. Subskill theo bậc. */
function placementExam(kind: FullExam["kind"] = "placement"): FullExam {
  const spec: Array<[number, string]> = [
    [3, "fill_blank_grammar"],
    [3, "fill_blank_grammar"],
    [4, "sentence_order"],
    [4, "sentence_order"],
    [5, "main_idea"],
    [5, "main_idea"],
    [6, "attitude"],
    [6, "attitude"],
  ];
  const questions: FullExamQuestion[] = spec.map(([difficulty, subskill], i) => ({
    number: i + 1,
    type_group: "R01-2",
    question: fq(`q${i + 1}`, "R01", subskill, difficulty, 0),
  }));
  return {
    id: "placement-t",
    program: "topik-ii",
    kind,
    title: "Test trình độ thử",
    status: "published",
    sections: [
      {
        skill: "reading",
        order: 1,
        duration_sec: 900,
        question_count: 8,
        max_score: 100,
        questions,
      },
    ],
  };
}

const answersOf = (right: number[]) =>
  Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [`q${i + 1}`, right.includes(i + 1) ? "①" : "②"]),
  );

describe("scoreExam: kind placement", () => {
  it("đúng bậc 3–4, sai bậc 5–6 -> placement 4급; level vẫn tính như Mini", () => {
    const r = scoreExam(placementExam(), answersOf([1, 2, 3, 4]), topikII, { submittedAt: 1 });
    expect(r.kind).toBe("placement");
    expect(r.level).toMatchObject({ is_estimate: true });
    expect(r.placement).toBeDefined();
    expect(r.placement!.estimated_level).toBe(4);
    expect(r.placement!.start_level).toBe(4);
    expect(r.placement!.bands.map((b) => [b.difficulty, b.correct, b.total])).toEqual([
      [3, 2, 2],
      [4, 2, 2],
      [5, 0, 2],
      [6, 0, 2],
    ]);
    // vùng xét là độ khó <= 4 + 1: chỉ main_idea (bậc 5) sai; attitude (bậc 6) nằm ngoài vùng
    expect(r.placement!.weak_subskills.map((s) => s.code)).toEqual(["main_idea"]);
    expect(r.placement!.weak_subskills[0]).toMatchObject({ correct: 0, total: 2 });
  });

  it("làm sai hết: chưa đạt 3급, bắt đầu từ cấp thấp nhất, kỹ năng yếu chỉ từ bậc 3–4", () => {
    const r = scoreExam(placementExam(), {}, topikII);
    expect(r.placement).toMatchObject({
      estimated_level: null,
      estimated_label: "Chưa đạt 3급",
      start_level: 3,
      start_label: "3급",
    });
    expect(r.placement!.weak_subskills.map((s) => s.code)).toEqual([
      "fill_blank_grammar",
      "sentence_order",
    ]);
    expect(r.placement!.weak_subskills.every((s) => s.correct < s.total)).toBe(true);
  });

  it("đúng hết -> 6급; ExamResult của loại khác không có trường placement", () => {
    expect(
      scoreExam(placementExam(), answersOf([1, 2, 3, 4, 5, 6, 7, 8]), topikII).placement,
    ).toMatchObject({
      estimated_level: 6,
      estimated_label: "6급",
    });
    const mini = scoreExam(placementExam("mini"), {}, topikII);
    expect("placement" in mini).toBe(false);
  });
});

// ------------------------------------------------------------------ validation

describe("validateExamFile: đề placement", () => {
  /** Kho câu giả `id -> difficulty`; đáp án đúng xoay vòng cho khỏi vướng luật nhãn. */
  function refsOf(entries: Array<[string, number | undefined]>): Map<string, ExamQuestionRef> {
    return new Map(
      entries.map(([id, difficulty], i) => [
        id,
        {
          id,
          type_code: id.slice(0, 3).toUpperCase(),
          correctIndex: [0, 1, 2, 3, 1, 0, 3, 2, 2, 3, 0, 1][i % 12]!,
          ...(difficulty !== undefined ? { difficulty } : {}),
        },
      ]),
    );
  }

  // 12 câu, 4 bậc x 3 câu: đủ blueprint placement.
  const good: Array<[string, number]> = [
    ...[1, 2, 3].map((n): [string, number] => [`r0${n}-0001`, 3]),
    ...[4, 5, 6].map((n): [string, number] => [`r0${n}-0001`, 4]),
    ...[7, 8, 9].map((n): [string, number] => [`r0${n}-0001`, 5]),
    ...[10, 11, 12].map((n): [string, number] => [`r${n}-0001`, 6]),
  ];

  function check(
    entries: Array<[string, number | undefined]>,
    status: "draft" | "published" = "draft",
  ) {
    const issues: ValidationIssue[] = [];
    validateExamFile(
      {
        id: "placement-t",
        kind: "placement",
        title: "Test trình độ thử",
        status,
        sections: [{ skill: "reading", questions: entries.map(([id]) => id) }],
      },
      {
        file: "topik-ii/exams/placement/placement-t.yaml",
        program: topikII,
        dirKind: "placement",
        basename: "placement-t",
      },
      refsOf(entries),
      issues,
    );
    return issues;
  }
  const codes = (issues: ValidationIssue[], severity?: string) =>
    issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);

  it("hằng số luật: ≥ 3 bậc, mỗi bậc ≥ 3 câu (ngưỡng 60% = đúng ≥ 2/3)", () => {
    expect([PLACEMENT_MIN_BANDS, PLACEMENT_MIN_PER_BAND]).toEqual([3, 3]);
  });

  it("đề 12 câu phủ 4 bậc x 3 câu: không vi phạm luật bậc (published cũng không có lỗi bậc/số câu)", () => {
    for (const status of ["draft", "published"] as const) {
      const c = codes(check(good, status));
      expect(c).not.toContain("placement-bands");
      expect(c).not.toContain("placement-band-size");
      expect(c).not.toContain("question-count");
    }
  });

  it("số câu so với blueprint placement (12): lệch -> cảnh báo ở draft, lỗi ở published", () => {
    const eleven = good.slice(0, 11);
    expect(codes(check(eleven), "warning")).toContain("question-count");
    const published = check(eleven, "published");
    expect(codes(published, "error")).toContain("question-count");
    expect(published.find((i) => i.code === "question-count")!.message).toMatch(
      /11 câu.*yêu cầu 12/,
    );
  });

  it("chỉ phủ 2 bậc: draft cảnh báo, published lỗi", () => {
    const two: Array<[string, number]> = good.map(([id], i) => [id, i < 6 ? 3 : 4]);
    const draft = check(two);
    expect(codes(draft, "error")).toEqual([]);
    expect(codes(draft, "warning")).toContain("placement-bands");
    expect(draft.find((i) => i.code === "placement-bands")!.message).toMatch(/2 bậc.*3, 4/);
    expect(codes(check(two, "published"), "error")).toContain("placement-bands");
  });

  it("một bậc có 2 câu (dưới mức tối thiểu 3): cảnh báo ở draft, lỗi ở published", () => {
    // 3: 4 câu, 4: 4 câu, 5: 2 câu, 6: 2 câu -> hai bậc thiếu
    const two: Array<[string, number]> = good.map(([id], i) => [
      id,
      i < 4 ? 3 : i < 8 ? 4 : i < 10 ? 5 : 6,
    ]);
    const draft = check(two).filter((i) => i.code === "placement-band-size");
    expect(draft.map((i) => i.severity)).toEqual(["warning", "warning"]);
    expect(draft[0]!.message).toMatch(/bậc độ khó 5 chỉ có 2 câu.*ít nhất 3/);
    const published = check(two, "published").filter((i) => i.code === "placement-band-size");
    expect(published.map((i) => i.severity)).toEqual(["error", "error"]);
  });

  it("bậc không liên tục từ bậc thấp nhất: draft cảnh báo, published lỗi (review S2)", () => {
    // có 3, 4, 6 (thiếu 5): lỗ giữa chuỗi
    const hole: Array<[string, number]> = good.map(([id], i) => [
      id,
      [3, 3, 3, 4, 4, 4, 6, 6, 6, 3, 4, 6][i]!,
    ]);
    const draft = check(hole);
    const gap = draft.find((i) => i.code === "placement-band-gap")!;
    expect(gap.severity).toBe("warning");
    expect(gap.message).toMatch(/thiếu bậc độ khó 5.*liên tục từ 3/);
    expect(check(hole, "published").find((i) => i.code === "placement-band-gap")!.severity).toBe(
      "error",
    );
    // có 4, 5, 6 (thiếu bậc thấp nhất 3)
    const noLowest: Array<[string, number]> = good.map(([id], i) => [id, 4 + (i % 3)]);
    const g2 = check(noLowest, "published").find((i) => i.code === "placement-band-gap")!;
    expect(g2.severity).toBe("error");
    expect(g2.message).toMatch(/thiếu bậc độ khó 3/);
    // đủ 3–6 liên tục: không có mã gap
    expect(codes(check(good, "published"))).not.toContain("placement-band-gap");
  });

  it("một bậc chỉ có 1 câu: cảnh báo ở draft, lỗi ở published", () => {
    // 3: 4 câu, 4: 4 câu, 5: 3 câu, 6: 1 câu
    const thin: Array<[string, number]> = good.map(([id], i) => [
      id,
      i < 4 ? 3 : i < 8 ? 4 : i < 11 ? 5 : 6,
    ]);
    const draft = check(thin);
    const size = draft.filter((i) => i.code === "placement-band-size");
    expect(size).toHaveLength(1);
    expect(size[0]!.severity).toBe("warning");
    expect(size[0]!.message).toMatch(/bậc độ khó 6 chỉ có 1 câu/);
    expect(check(thin, "published").find((i) => i.code === "placement-band-size")!.severity).toBe(
      "error",
    );
  });

  it("câu chưa xác định được độ khó không được tính vào bậc", () => {
    const unknown = good.map(([id]): [string, number | undefined] => [id, undefined]);
    expect(codes(check(unknown))).toContain("placement-bands");
  });

  it("đề loại khác (mini) không bị luật bậc áp vào", () => {
    const issues: ValidationIssue[] = [];
    validateExamFile(
      {
        id: "doc-t",
        kind: "mini",
        title: "Mini",
        status: "published",
        sections: [{ skill: "reading", questions: ["r01-0001"] }],
      },
      {
        file: "topik-ii/exams/mini/doc-t.yaml",
        program: topikII,
        dirKind: "mini",
        basename: "doc-t",
      },
      refsOf([["r01-0001", 3]]),
      issues,
    );
    expect(codes(issues)).not.toContain("placement-bands");
    expect(codes(issues)).not.toContain("placement-band-size");
  });

  it("group_key: bộ thiếu câu trong đề placement vẫn là lỗi kể cả draft", () => {
    const issues: ValidationIssue[] = [];
    const refs = refsOf(good);
    refs.set("r19-0001", {
      id: "r19-0001",
      type_code: "R19",
      group_key: "r19-20-0001",
      difficulty: 4,
    });
    validateExamFile(
      {
        id: "placement-t",
        kind: "placement",
        title: "t",
        status: "draft",
        sections: [{ skill: "reading", questions: ["r01-0001", "r19-0001"] }],
      },
      {
        file: "topik-ii/exams/placement/placement-t.yaml",
        program: topikII,
        dirKind: "placement",
        basename: "placement-t",
      },
      refs,
      issues,
    );
    expect(codes(issues, "error")).toEqual(["group-incomplete"]);
  });

  it("fixture placement-sample (draft, 1 câu) hợp lệ: không lỗi, chỉ cảnh báo", () => {
    const read = (rel: string) => ({
      file: rel,
      text: readFileSync(path.join(FIXTURE_ROOT, rel), "utf8"),
    });
    const r = validateContent([
      read("topik-ii/practice/R10/r10-0001.yaml"),
      read("topik-ii/exams/placement/placement-sample.yaml"),
    ]);
    expect(r.errorCount).toBe(0);
    expect(r.examsChecked).toBe(1);
    const exam = r.issues.filter((i) => i.file.includes("placement-sample"));
    expect(exam.every((i) => i.severity === "warning")).toBe(true);
    expect(exam.map((i) => i.code)).toEqual(
      expect.arrayContaining(["question-count", "placement-bands", "placement-band-size"]),
    );
  });

  it("thật: đề placement-01 trong content/ không có lỗi (nếu file tồn tại)", () => {
    const file = "topik-ii/exams/placement/placement-01.yaml";
    const examText = readFileSync(path.join(REAL_ROOT, file), "utf8");
    const ids = [...examText.matchAll(/^\s+- (r\d{2}-\d{4})$/gm)].map((m) => m[1]!);
    expect(ids).toHaveLength(12);
    const inputs = ids.map((id) => {
      const rel = `topik-ii/practice/${id.slice(0, 3).toUpperCase()}/${id}.yaml`;
      return { file: rel, text: readFileSync(path.join(REAL_ROOT, rel), "utf8") };
    });
    const r = validateContent([...inputs, { file, text: examText }]);
    expect(r.issues.filter((i) => i.file === file && i.severity === "error")).toEqual([]);
    const published = { file, text: examText.replace(/^status: draft$/m, "status: published") };
    const p = validateContent([...inputs, published]);
    expect(p.issues.filter((i) => i.file === file && i.severity === "error")).toEqual([]);
  });
});

// ------------------------------------------------------------------ source & queries

describe("exam/source: loại placement", () => {
  const PLACEMENT_YAML = readFileSync(
    path.join(REAL_ROOT, "topik-ii/exams/placement/placement-01.yaml"),
    "utf8",
  );
  const DOC_01 = readFileSync(path.join(REAL_ROOT, "topik-ii/exams/mini/doc-01.yaml"), "utf8");

  function tempRoot(examFiles: Record<string, string>): string {
    const root = mkdtempSync(path.join(os.tmpdir(), "topikly-placement-"));
    cpSync(path.join(REAL_ROOT, "topik-ii", "practice"), path.join(root, "topik-ii", "practice"), {
      recursive: true,
    });
    for (const [rel, text] of Object.entries(examFiles)) {
      const file = path.join(root, "topik-ii", "exams", rel);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
    return root;
  }

  it("listExams không kind bỏ qua placement; truyền đúng kind 'placement' mới thấy", () => {
    const root = tempRoot({
      "mini/doc-01.yaml": DOC_01,
      "placement/placement-01.yaml": PLACEMENT_YAML,
    });
    try {
      const opts = { contentRoot: root };
      expect(listExams("topik-ii", undefined, opts).map((e) => `${e.kind}/${e.id}`)).toEqual([
        "mini/doc-01",
      ]);
      expect(listExams("topik-ii", "mini", opts).map((e) => e.id)).toEqual(["doc-01"]);
      const placement = listExams("topik-ii", "placement", opts);
      expect(placement).toHaveLength(1);
      expect(placement[0]).toMatchObject({
        id: "placement-01",
        kind: "placement",
        skills: ["reading"],
        question_count: 12,
        duration_sec: topikII.exam_blueprints.placement!.reading!.duration_sec,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("getPlacementPublicExam theo placement.exam_id; không đáp án; khoá lạ/chương trình lạ -> undefined", () => {
    const root = tempRoot({ "placement/placement-01.yaml": PLACEMENT_YAML });
    try {
      const exam = getPlacementPublicExam("topik-ii", { contentRoot: root })!;
      expect(exam.kind).toBe("placement");
      expect(exam.id).toBe(topikII.placement.exam_id);
      expect(exam.sections).toHaveLength(1);
      const text = JSON.stringify(exam);
      for (const key of ['"correct"', '"note_vi"', '"trap"', '"explanation_vi"']) {
        expect(text).not.toContain(key);
      }
      expect(getPlacementPublicExam("eps", { contentRoot: root })).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
    // Chưa có file đề placement
    const empty = tempRoot({});
    try {
      expect(getPlacementPublicExam("topik-ii", { contentRoot: empty })).toBeUndefined();
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("đề placement published thiếu bậc độ khó bị loại (có console.warn)", () => {
    // bỏ 6 câu cuối -> 6 câu: sai blueprint và chỉ còn bậc 3, 4
    const lines = PLACEMENT_YAML.split("\n");
    const lastQ = lines
      .map((l, i) => (/^\s+- r\d{2}-\d{4}$/.test(l) ? i : -1))
      .filter((i) => i >= 0);
    const cut = lines.filter((_, i) => !lastQ.slice(6).includes(i)).join("\n");
    const published = cut.replace(/^status: draft$/m, "status: published");
    const root = tempRoot({ "placement/placement-01.yaml": published });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(getPlacementPublicExam("topik-ii", { contentRoot: root })).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("đề placement trong content/ thật: đủ 12 câu, 900 giây, phủ ≥ 3 bậc độ khó", () => {
    const full = getFullExam("topik-ii", "placement", topikII.placement.exam_id)!;
    expect(full).toBeDefined();
    const qs = full.sections[0]!.questions;
    expect(qs).toHaveLength(12);
    expect(full.sections[0]!.duration_sec).toBe(15 * 60);
    const counts = new Map<number, number>();
    for (const q of qs)
      counts.set(q.question.difficulty, (counts.get(q.question.difficulty) ?? 0) + 1);
    expect(counts.size).toBeGreaterThanOrEqual(PLACEMENT_MIN_BANDS);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(PLACEMENT_MIN_PER_BAND);
    expect(getPublicExam("topik-ii", "mini", topikII.placement.exam_id)).toBeUndefined();
  });
});

describe("exam/queries: placement", () => {
  it("getExams không kind không lộ placement; getExams(..., 'placement') và getPlacementExam lấy được", async () => {
    expect((await getExams("topik-ii")).some((e) => e.kind === "placement")).toBe(false);
    expect((await getExams("topik-ii", "placement")).map((e) => e.id)).toEqual(["placement-01"]);
    const exam = await getPlacementExam("topik-ii");
    expect(exam).toMatchObject({ id: "placement-01", kind: "placement", question_count: 12 });
    expect(await getPlacementExam("eps")).toBeNull();
    expect((await getExam("topik-ii", "placement", "placement-01"))?.id).toBe("placement-01");
  });
});

// ------------------------------------------------------------------ route

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/exam/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const placementBase = { program: "topik-ii", kind: "placement", examId: "placement-01" };

describe("POST /api/exam/submit: kind placement", () => {
  /** Đáp án đúng/sai từng câu, suy từ FullExam trên server (độc lập với nội dung cụ thể của đề). */
  function answers(rightWhen: (difficulty: number) => boolean) {
    const full = getFullExam("topik-ii", "placement", "placement-01")!;
    return Object.fromEntries(
      full.sections.flatMap((s) =>
        s.questions.map(({ question }) => {
          const right = rightWhen(question.difficulty);
          const label = right
            ? question.correctLabel
            : CHOICE_LABELS.find((l) => l !== question.correctLabel)!;
          return [question.id, label];
        }),
      ),
    );
  }

  it("200: ExamResult có placement (đúng hết -> bậc cao nhất của đề)", async () => {
    const res = await post({
      ...placementBase,
      answers: answers(() => true),
      timeSpentMs: 300_000,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const r = (await res.json()) as ExamResult;
    expect(r).toMatchObject({ kind: "placement", examId: "placement-01", timeSpentMs: 300_000 });
    expect(r.placement).toBeDefined();
    const top = Math.max(...r.placement!.bands.map((b) => b.difficulty));
    expect(r.placement!.estimated_level).toBe(top);
    expect(r.placement!.bands.every((b) => b.passed && b.ratio === 1)).toBe(true);
    expect(r.placement!.weak_subskills).toEqual([]);
    expect(r.level).toBeDefined();
    expect(r.questions).toHaveLength(12);
  });

  it("200: đúng đến bậc 4, sai từ bậc 5 -> estimated_level 4 và kỹ năng yếu đến từ các bậc sai", async () => {
    const res = await post({ ...placementBase, answers: answers((d) => d <= 4) });
    const r = (await res.json()) as ExamResult;
    expect(r.placement!.estimated_level).toBe(4);
    expect(r.placement!.estimated_label).toBe("4급");
    expect(r.placement!.start_level).toBe(4);
    expect(r.placement!.weak_subskills.length).toBeGreaterThan(0);
    expect(r.placement!.weak_subskills.length).toBeLessThanOrEqual(
      topikII.placement.weak_subskill_count,
    );
  });

  it("200: bỏ trống hết -> chưa đạt 3급, bắt đầu từ 3", async () => {
    const res = await post({ ...placementBase, answers: {}, timedOut: true });
    expect(res.status).toBe(200);
    const r = (await res.json()) as ExamResult;
    expect(r.timedOut).toBe(true);
    expect(r.placement).toMatchObject({
      estimated_level: null,
      estimated_label: "Chưa đạt 3급",
      start_level: 3,
    });
  });

  it("kind mini không có trường placement", async () => {
    const res = await post({ program: "topik-ii", kind: "mini", examId: "doc-01", answers: {} });
    const r = (await res.json()) as ExamResult;
    expect("placement" in r).toBe(false);
  });

  it("404: sai id đề placement hoặc dùng id placement với kind khác; 400: kind lạ", async () => {
    const missing = await post({ ...placementBase, examId: "placement-99", answers: {} });
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as ExamApiErrorBody).error.code).toBe("exam_not_found");
    const wrongKind = await post({ ...placementBase, kind: "mini", answers: {} });
    expect(wrongKind.status).toBe(404);
    const bad = await post({ ...placementBase, kind: "khong-co", answers: {} });
    expect(bad.status).toBe(400);
  });

  it("400: nhãn ngoài ①–④ vẫn bị chặn với đề placement", async () => {
    const res = await post({ ...placementBase, answers: { "r01-0001": "⑤" } });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ExamApiErrorBody).error.code).toBe("invalid_choice");
  });
});
