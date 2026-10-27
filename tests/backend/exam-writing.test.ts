import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { POST } from "@/app/api/exam/submit/route";
import type { ValidationIssue } from "@/lib/db/content-validation";
import { validateExamFile, type ExamQuestionRef } from "@/lib/db/exam-validation";
import { getExamBlueprint, topikII } from "@/lib/db/programs";
import { levelFromThresholds } from "@/lib/exam/level";
import { getExam, getExams } from "@/lib/exam/queries";
import { scoreExam } from "@/lib/exam/score";
import { clearExamCache, getFullExam, getPublicExam, listExams } from "@/lib/exam/source";
import { submitExam } from "@/lib/exam/submit";
import type {
  ExamApiErrorBody,
  ExamResult,
  ExamSubmitRequest,
  PublicWritingSection,
  WritingReview,
  WritingReviewItem,
} from "@/lib/exam/types";
import {
  clampSelfPoints,
  projectLevelWithWriting,
  projectWritingScore,
  WRITING_BLANK_MAX_CHARS,
  WRITING_TEXT_MAX_CHARS,
} from "@/lib/exam/writing-self-score";
import { clearPracticeCache } from "@/lib/practice/source";
import { clearWritingCache } from "@/lib/practice/writing-source";

const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/content/valid");

afterEach(() => {
  clearExamCache();
  clearPracticeCache();
  clearWritingCache();
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

// ------------------------------------------------------------------ nội dung tạm

const tmpDirs: string[] = [];

/** Từ fixture W52 suy ra W51 (cùng cách với writing-source.test). */
function w51FromFixture(root: string): string {
  const w52 = readFileSync(path.join(root, "topik-ii/practice/W52/w52-0001.yaml"), "utf8");
  return w52
    .replace("id: w52-0001", "id: w51-0001")
    .replace("type_code: W52", "type_code: W51")
    .replace("subskill: expository_completion", "subskill: practical_completion")
    .replace("register: written_plain", "register: formal_polite");
}

/** Thư mục content tạm: fixture + W51 + các file đề truyền vào ("mini/viet-t.yaml" -> nội dung). */
function tempRoot(exams: Record<string, string>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "topikly-exam-writing-"));
  tmpDirs.push(root);
  cpSync(FIXTURE_ROOT, root, { recursive: true });
  mkdirSync(path.join(root, "topik-ii/practice/W51"), { recursive: true });
  writeFileSync(path.join(root, "topik-ii/practice/W51/w51-0001.yaml"), w51FromFixture(root));
  for (const [rel, text] of Object.entries(exams)) {
    const file = path.join(root, "topik-ii/exams", rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  return root;
}

const VIET_T = `id: viet-t
kind: mini
title: "Mini test Viết thử"
status: draft
sections:
  - skill: writing
    questions: [w51-0001, w52-0001, w53-0001, w54-0001]
`;

const FULL_T = `id: full-t
kind: full
title: "Full thử (Nghe + Viết + Đọc)"
status: draft
sections:
  - skill: listening
    questions: [l09-0001]
  - skill: writing
    questions: [w51-0001, w52-0001, w53-0001, w54-0001]
  - skill: reading
    questions: [r10-0001]
`;

function miniRoot(): { contentRoot: string } {
  return { contentRoot: tempRoot({ "mini/viet-t.yaml": VIET_T }) };
}

const FORBIDDEN_PUBLIC_KEYS = [
  "reveal",
  "model_answers",
  "accepted_answers",
  "partial_answers",
  "rejected_answers",
  "rubric_notes_vi",
  "scoring_notes_vi",
  "common_mistakes_vi",
  "explanation_vi",
  "required_points",
  "required_elements_vi",
  "outline_vi",
  "expression_bank",
  "notes_internal",
  "reviewed_by",
  "correct",
  "correctLabel",
];

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, keys));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      collectKeys(v, keys);
    }
  }
  return keys;
}

// ------------------------------------------------------------------ cấu hình

describe("cấu hình Viết trong chương trình", () => {
  it("mini.writing = 4 câu / 50 phút; writing_points là dữ liệu, tổng = max_score phần Viết", () => {
    expect(getExamBlueprint(topikII, "mini", "writing")).toEqual({
      question_count: 4,
      duration_sec: 3000,
    });
    expect(topikII.writing_points).toEqual({ W51: 10, W52: 10, W53: 30, W54: 50 });
    const writing = topikII.sections.find((s) => s.skill === "writing")!;
    const sum = Object.values(topikII.writing_points).reduce((n, p) => n + p, 0);
    expect(sum).toBe(writing.max_score);
  });
});

// ------------------------------------------------------------------ validation

describe("validateExamFile: phần Viết", () => {
  /** Kho câu giả: type_code lấy từ tiền tố id, không có nhãn đúng/audio. */
  function writingRefs(ids: string[]): Map<string, ExamQuestionRef> {
    return new Map(
      ids.map((id) => [id, { id, type_code: id.slice(0, 3).toUpperCase(), difficulty: 4 }]),
    );
  }

  const ALL = ["w51-0001", "w52-0001", "w53-0001", "w54-0001"];

  function check(
    questions: string[],
    over: { status?: string; refIds?: string[]; program?: typeof topikII; kind?: string } = {},
  ) {
    const issues: ValidationIssue[] = [];
    const parsed = validateExamFile(
      {
        id: "viet-t",
        kind: over.kind ?? "mini",
        title: "Mini Viết thử",
        status: over.status ?? "draft",
        sections: [{ skill: "writing", questions }],
      },
      {
        file: `topik-ii/exams/${over.kind ?? "mini"}/viet-t.yaml`,
        program: over.program ?? topikII,
        dirKind: over.kind ?? "mini",
        basename: "viet-t",
      },
      writingRefs(over.refIds ?? [...ALL, "w53-0002", "r01-0001"]),
      issues,
    );
    return {
      parsed,
      errors: issues.filter((i) => i.severity === "error"),
      warnings: issues.filter((i) => i.severity === "warning"),
    };
  }

  it("skill writing hợp lệ; đủ 4 câu W51→W54: không lỗi, không cảnh báo (không áp luật nhãn/audio)", () => {
    const r = check(ALL);
    expect(r.parsed).toBeDefined();
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("thiếu câu so với blueprint: draft cảnh báo, published lỗi", () => {
    const draft = check(["w52-0001", "w53-0001", "w54-0001"]);
    expect(draft.errors).toEqual([]);
    expect(draft.warnings.map((w) => w.code)).toEqual(["question-count"]);
    expect(draft.warnings[0]!.message).toMatch(/3 câu.*yêu cầu 4/);
    const published = check(["w52-0001", "w53-0001", "w54-0001"], { status: "published" });
    expect(published.errors.map((e) => e.code)).toEqual(["question-count"]);
  });

  it("type_code không tăng dần là LỖI chặn cả khi draft", () => {
    const swapped = check(["w51-0001", "w53-0001", "w52-0001", "w54-0001"]);
    expect(swapped.errors.map((e) => e.code)).toEqual(["writing-order"]);
    expect(swapped.errors[0]!.message).toContain("W51, W53, W52, W54");
  });

  it("hai câu cùng dạng (W53 hai lần) cũng vi phạm thứ tự tăng dần nghiêm ngặt", () => {
    const dup = check(["w51-0001", "w52-0001", "w53-0001", "w53-0002"]);
    expect(dup.errors.map((e) => e.code)).toEqual(["writing-order"]);
  });

  it("id không tồn tại, trùng, hay không phải đề Viết đều là lỗi", () => {
    const missing = check(["w51-0001", "w52-0009", "w53-0001", "w54-0001"]);
    expect(missing.errors.map((e) => e.path)).toEqual(["sections[0].questions[1]"]);
    expect(missing.errors[0]!.message).toContain("không tồn tại");

    const dup = check(["w51-0001", "w51-0001", "w53-0001", "w54-0001"]);
    expect(dup.errors.some((e) => /bị trùng/.test(e.message))).toBe(true);

    const reading = check(["r01-0001", "w52-0001", "w53-0001", "w54-0001"]);
    expect(
      reading.errors.some((e) => /thuộc kỹ năng reading, không thuộc phần writing/.test(e.message)),
    ).toBe(true);
  });

  it("dạng Viết chưa có điểm trong writing_points: lỗi", () => {
    const program = { ...topikII, writing_points: { W51: 10, W52: 10, W54: 50 } };
    const r = check(ALL, { program });
    expect(r.errors.map((e) => e.code)).toEqual(["writing-points-missing"]);
    expect(r.errors[0]!.message).toContain("W53");
  });

  it("kind full: số câu Viết lấy theo sections của chương trình (4)", () => {
    const r = check(ALL, { kind: "full" });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

// ------------------------------------------------------------------ đề công khai

describe("đề Viết công khai (exam/source)", () => {
  it("fixture viet-sample (3 câu, draft) hợp lệ: được liệt kê, thiếu câu chỉ cảnh báo", () => {
    const list = listExams("topik-ii", "mini", { contentRoot: FIXTURE_ROOT });
    const sample = list.find((e) => e.id === "viet-sample")!;
    expect(sample).toMatchObject({
      skills: ["writing"],
      question_count: 3,
      duration_sec: 3000,
      status: "draft",
    });
  });

  it("ExamSummary: skills chứa writing, question_count/duration tính cả phần Viết", () => {
    const root = miniRoot();
    const [exam] = listExams("topik-ii", "mini", root).filter((e) => e.id === "viet-t");
    expect(exam).toEqual({
      id: "viet-t",
      program: "topik-ii",
      kind: "mini",
      title: "Mini test Viết thử",
      status: "draft",
      skills: ["writing"],
      question_count: 4,
      duration_sec: 3000,
    });
  });

  it("PublicExamSection Viết: writing_items có đề + điểm, blocks rỗng, KHÔNG lộ bài mẫu/đáp án", () => {
    const exam = getPublicExam("topik-ii", "mini", "viet-t", miniRoot())!;
    expect(exam.sections).toHaveLength(1);
    const section = exam.sections[0] as PublicWritingSection;
    expect(section).toMatchObject({
      skill: "writing",
      order: 1,
      duration_sec: 3000,
      question_count: 4,
      max_score: 100,
      blocks: [],
    });
    expect(
      section.writing_items.map((i) => [i.number, i.prompt.type_code, i.type_group, i.max_points]),
    ).toEqual([
      [1, "W51", "W51", 10],
      [2, "W52", "W52", 10],
      [3, "W53", "W53", 30],
      [4, "W54", "W54", 50],
    ]);
    expect(section.writing_items[0]!.prompt).toMatchObject({
      format: "fill_blanks",
      blanks: [{ label: "㉠" }, { label: "㉡" }],
    });
    expect(section.writing_items[3]!.prompt.char_limit).toEqual({ min: 600, max: 700 });

    const keys = collectKeys(exam);
    for (const key of FORBIDDEN_PUBLIC_KEYS) {
      expect(keys.has(key), `đề công khai lộ khoá ${key}`).toBe(false);
    }
    // Nội dung bài mẫu / đáp án chấp nhận cũng không có trong chuỗi JSON.
    const full = getFullExam("topik-ii", "mini", "viet-t", miniRoot())!;
    const json = JSON.stringify(exam);
    for (const item of full.sections[0]!.writing_items!) {
      for (const m of item.reveal.model_answers ?? []) {
        expect(json).not.toContain(m.text.slice(0, 30));
      }
      for (const b of item.reveal.blanks ?? []) {
        expect(json).not.toContain(b.accepted_answers[0]!);
      }
      expect(json).not.toContain(item.reveal.explanation_vi.slice(0, 40));
    }
  });

  it("đề nhiều phần (Nghe + Viết + Đọc): Viết ra phần riêng, giữ thứ tự order", () => {
    const root = { contentRoot: tempRoot({ "full/full-t.yaml": FULL_T }) };
    const exam = getPublicExam("topik-ii", "full", "full-t", root)!;
    expect(exam.skills).toEqual(["listening", "writing", "reading"]);
    expect(exam.sections.map((s) => [s.order, s.skill])).toEqual([
      [1, "listening"],
      [2, "writing"],
      [3, "reading"],
    ]);
    expect(exam.question_count).toBe(1 + 4 + 1);
    expect(exam.duration_sec).toBe(3600 + 3000 + 4200);
    const [listening, writing, reading] = exam.sections;
    expect(listening!.blocks.length).toBeGreaterThan(0);
    expect(writing!.blocks).toEqual([]);
    expect(reading!.blocks.length).toBeGreaterThan(0);
  });

  it("đề Viết hỏng (câu không tồn tại, sai thứ tự) bị bỏ qua, không phục vụ", () => {
    const bad = VIET_T.replace(
      "[w51-0001, w52-0001, w53-0001, w54-0001]",
      "[w52-0001, w51-0001, w53-0001, w54-0001]",
    );
    const missing = VIET_T.replace("w54-0001]", "w54-9999]").replace("viet-t", "viet-u");
    const root = {
      contentRoot: tempRoot({ "mini/viet-t.yaml": bad, "mini/viet-u.yaml": missing }),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ids = listExams("topik-ii", "mini", root).map((e) => e.id);
    expect(ids).not.toContain("viet-t");
    expect(ids).not.toContain("viet-u");
    warn.mockRestore();
  });

  it("đề thật content/topik-ii/exams/mini/viet-01: 4 câu W51–W54, 50 phút, đủ điểm", async () => {
    const exam = (await getExam("topik-ii", "mini", "viet-01"))!;
    expect(exam).not.toBeNull();
    expect(exam.skills).toEqual(["writing"]);
    expect(exam.question_count).toBe(4);
    expect(exam.duration_sec).toBe(3000);
    const section = exam.sections[0] as PublicWritingSection;
    expect(section.writing_items.map((i) => i.prompt.type_code)).toEqual([
      "W51",
      "W52",
      "W53",
      "W54",
    ]);
    expect(section.writing_items.reduce((n, i) => n + i.max_points, 0)).toBe(section.max_score);
    const ids = (await getExams("topik-ii", "mini")).map((e) => e.id);
    expect(ids).toContain("viet-01");
    const keys = collectKeys(exam);
    for (const key of FORBIDDEN_PUBLIC_KEYS) expect(keys.has(key), key).toBe(false);
  });
});

// ------------------------------------------------------------------ nộp bài

function submit(
  writing: unknown,
  extra: Partial<ExamSubmitRequest> = {},
  exam = { kind: "mini" as const, examId: "viet-t" },
  options: { contentRoot: string } = miniRoot(),
) {
  return submitExam(
    { program: "topik-ii", ...exam, answers: {}, writing, ...extra } as ExamSubmitRequest,
    options,
    1_700_000_000_000,
  );
}

function resultOf(outcome: ReturnType<typeof submitExam>): ExamResult {
  if (!outcome.ok)
    throw new Error(`mong 200, nhận ${outcome.status}: ${outcome.body.error.message}`);
  return outcome.result;
}

const ESSAY_250 = `${"가".repeat(100)}\n${"나".repeat(150)}`;

describe("nộp bài Viết (submitExam)", () => {
  it("đúng hình dạng: chuẩn hoá bài làm, đếm ký tự ở server, trạng thái khung ký tự", () => {
    const r = resultOf(
      submit({
        "w51-0001": { blanks: { "㉠": "답 하나", "㉡": "답 둘" } },
        "w52-0001": { blanks: { "㉠": "오직 하나" } }, // thiếu ㉡ -> ""
        "w53-0001": { text: ESSAY_250 },
        "w54-0001": { text: "가".repeat(750) },
      }),
    );
    const w = r.writing!;
    expect(w).toBeDefined();
    expect(w).toMatchObject({
      order: 1,
      duration_sec: 3000,
      max_score: 100,
      max_points_total: 100,
    });
    expect(w.items.map((i) => [i.number, i.id, i.type_code, i.format, i.max_points])).toEqual([
      [1, "w51-0001", "W51", "fill_blanks", 10],
      [2, "w52-0001", "W52", "fill_blanks", 10],
      [3, "w53-0001", "W53", "essay", 30],
      [4, "w54-0001", "W54", "essay", 50],
    ]);
    expect(w.items[0]!.answer).toEqual({ blanks: { "㉠": "답 하나", "㉡": "답 둘" } });
    expect(w.items[1]!.answer).toEqual({ blanks: { "㉠": "오직 하나", "㉡": "" } });
    expect(w.items[0]!.char_count).toBeUndefined();
    // countChars bỏ ký tự xuống dòng: 100 + 150 = 250 (W53: 200–300 -> within)
    expect(w.items[2]!.char_count).toBe(250);
    expect(w.items[2]!.char_status).toBe("within");
    // 750 ký tự vượt khung 600–700 của W54
    expect(w.items[3]!.char_count).toBe(750);
    expect(w.items[3]!.char_status).toBe("above");
    // phần tự so sánh có đủ
    expect(w.items[2]!.reveal.model_answers?.length).toBeGreaterThan(0);
    expect(w.items[0]!.reveal.blanks?.[0]?.accepted_answers.length).toBeGreaterThan(0);
    expect(w.items[3]!.prompt.id).toBe("w54-0001");
  });

  it("char_status: dưới khung, và bỏ trống = chuỗi rỗng (0 ký tự, below)", () => {
    const r = resultOf(submit({ "w53-0001": { text: "가".repeat(10) } }));
    const items = r.writing!.items;
    expect(items[2]!.char_status).toBe("below");
    expect(items[3]!.answer).toEqual({ text: "" });
    expect(items[3]!.char_count).toBe(0);
    expect(items[3]!.char_status).toBe("below");
    expect(items[0]!.answer).toEqual({ blanks: { "㉠": "", "㉡": "" } });
  });

  it("không gửi writing, null, hoặc {}: mọi câu bỏ trống, vẫn 200", () => {
    for (const writing of [undefined, null, {}]) {
      const r = resultOf(submit(writing));
      expect(r.writing!.items).toHaveLength(4);
      for (const item of r.writing!.items) {
        const values =
          item.format === "essay" ? [item.answer.text] : Object.values(item.answer.blanks!);
        expect(values.every((v) => v === "")).toBe(true);
      }
    }
  });

  it("khoá không thuộc đề bị bỏ qua (kể cả sai hình dạng); câu null = bỏ trống", () => {
    const r = resultOf(
      submit({ "w99-9999": { text: 123, blanks: 5 }, "w53-0001": null, "w53-0002": { text: "x" } }),
    );
    expect(r.writing!.items.map((i) => i.id)).toEqual([
      "w51-0001",
      "w52-0001",
      "w53-0001",
      "w54-0001",
    ]);
    expect(r.writing!.items[2]!.answer).toEqual({ text: "" });
  });

  it("KHÔNG chấm tự động: sections rỗng, level null, tổng 0/0, không vào by_* hay questions", () => {
    const r = resultOf(submit({ "w53-0001": { text: ESSAY_250 } }));
    expect(r.sections).toEqual([]);
    expect(r.level).toBeNull();
    expect(r.total_score).toBe(0);
    expect(r.total_max_score).toBe(0);
    expect(r.by_type_group).toEqual([]);
    expect(r.by_subskill).toEqual([]);
    expect(r.questions).toEqual([]);
    expect(r.placement).toBeUndefined();
  });

  describe("sai hình dạng hoặc quá dài -> InvalidWritingAnswer (400 invalid_writing_answer)", () => {
    const cases: Array<[string, unknown, RegExp]> = [
      ["essay gửi blanks", { "w53-0001": { blanks: { "㉠": "x" } } }, /w53-0001.*`text`/],
      ["fill_blanks gửi text", { "w51-0001": { text: "x" } }, /w51-0001.*`blanks`/],
      ["essay text không phải chuỗi", { "w53-0001": { text: 5 } }, /w53-0001.*`text`/],
      [
        "nhãn chỗ trống lạ",
        { "w52-0001": { blanks: { "㉢": "x" } } },
        /w52-0001.*"㉢".*không thuộc đề/,
      ],
      [
        "giá trị chỗ trống không phải chuỗi",
        { "w52-0001": { blanks: { "㉠": ["x"] } } },
        /w52-0001.*㉠.*chuỗi/,
      ],
      ["blanks không phải object", { "w52-0001": { blanks: "x" } }, /w52-0001.*object/],
      ["bài làm là chuỗi", { "w53-0001": "bài viết" }, /w53-0001/],
      ["bài làm là mảng", { "w54-0001": ["x"] }, /w54-0001/],
      [
        "essay quá dài",
        { "w54-0001": { text: "가".repeat(WRITING_TEXT_MAX_CHARS + 1) } },
        /w54-0001.*quá dài.*5000/,
      ],
      [
        "chỗ trống quá dài",
        { "w51-0001": { blanks: { "㉠": "가".repeat(WRITING_BLANK_MAX_CHARS + 1) } } },
        /w51-0001.*㉠.*quá dài.*500/,
      ],
      ["writing là chuỗi", "bài viết", /writing/],
      ["writing là mảng", [], /writing/],
    ];

    it.each(cases)("%s", (_name, writing, message) => {
      const out = submit(writing);
      expect(out.ok).toBe(false);
      if (out.ok) return;
      expect(out.status).toBe(400);
      expect(out.body.error.code).toBe("invalid_writing_answer");
      expect(out.body.error.message).toMatch(message);
    });

    it("đúng giới hạn thì qua (5.000 ký tự essay, 500 ký tự chỗ trống)", () => {
      const r = resultOf(
        submit({
          "w51-0001": { blanks: { "㉠": "가".repeat(WRITING_BLANK_MAX_CHARS) } },
          "w54-0001": { text: "가".repeat(WRITING_TEXT_MAX_CHARS) },
        }),
      );
      expect(r.writing!.items[3]!.char_count).toBe(WRITING_TEXT_MAX_CHARS);
    });
  });

  it("đề trắc nghiệm bỏ qua trường writing (kể cả rác)", () => {
    const out = submitExam({
      program: "topik-ii",
      kind: "mini",
      examId: "doc-01",
      answers: {},
      writing: "rác" as unknown as ExamSubmitRequest["writing"],
    });
    const r = resultOf(out);
    expect(r.writing).toBeUndefined();
    expect(r.level).not.toBeNull();
    expect(r.sections).toHaveLength(1);
  });

  it("đề nhiều phần: Đọc/Nghe chấm như cũ, Viết ra riêng; level chiếu riêng phần tự động", () => {
    const options = { contentRoot: tempRoot({ "full/full-t.yaml": FULL_T }) };
    const full = getFullExam("topik-ii", "full", "full-t", options)!;
    const reading = full.sections.find((s) => s.skill === "reading")!.questions[0]!.question;
    const out = submitExam(
      {
        program: "topik-ii",
        kind: "full",
        examId: "full-t",
        answers: { [reading.id]: reading.correctLabel },
        writing: { "w53-0001": { text: ESSAY_250 } },
      },
      options,
    );
    const r = resultOf(out);
    // Chỉ Nghe + Đọc vào sections; Viết không vào
    expect(r.sections.map((s) => [s.skill, s.correct, s.total])).toEqual([
      ["listening", 0, 1],
      ["reading", 1, 1],
    ]);
    expect(r.questions.map((q) => q.questionId)).toEqual(["l09-0001", reading.id]);
    expect(r.total_score).toBe(100);
    expect(r.total_max_score).toBe(200);
    // Đề có Viết: level chiếu riêng điểm tự động lên thang 300 và luôn là ước lượng
    expect(r.level).toMatchObject({ is_estimate: true, compared_score: 150, level: 4 });
    expect(r.writing!.level_basis).toMatchObject({
      auto_score: 100,
      auto_max_score: 200,
      total_max_score: 300,
      is_estimate: true, // Nghe/Đọc chỉ 1 câu so với 50
    });
    expect(r.writing!.order).toBe(2);
    expect(r.writing!.items).toHaveLength(4);
  });

  it("đề Full đủ phần và đủ số câu: level_basis.is_estimate = false, so thẳng điểm thật", () => {
    // Dựng FullExam tay từ đề Viết thật + chương trình có phần chấm tự động đủ câu.
    const options = miniRoot();
    const viet = getFullExam("topik-ii", "mini", "viet-t", options)!;
    const program = {
      ...topikII,
      sections: topikII.sections.map((s) =>
        s.skill === "writing" ? s : { ...s, question_count: 0 },
      ),
    };
    const fake = {
      ...viet,
      kind: "full" as const,
      sections: [
        {
          skill: "reading" as const,
          order: 1,
          duration_sec: 60,
          question_count: 1,
          max_score: 100,
          questions: [],
        },
        ...viet.sections.map((s) => ({ ...s, order: 2 })),
        {
          skill: "listening" as const,
          order: 3,
          duration_sec: 60,
          question_count: 1,
          max_score: 100,
          questions: [],
        },
      ],
    };
    const r = scoreExam(fake, {}, program, { submittedAt: 1 });
    expect(r.writing!.level_basis.is_estimate).toBe(false);
    const projected = projectLevelWithWriting(r.writing!, {
      "w51-0001": 10,
      "w52-0001": 10,
      "w53-0001": 30,
      "w54-0001": 50,
    });
    expect(projected).toMatchObject({ total_score: 100, total_max_score: 300 });
    expect(projected.level).toMatchObject({ is_estimate: false, compared_score: 100, level: null });
  });
});

// ------------------------------------------------------------------ route

describe("POST /api/exam/submit với đề Viết", () => {
  function post(body: unknown): Promise<Response> {
    return POST(
      new Request("http://localhost/api/exam/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  }
  const base = { program: "topik-ii", kind: "mini", examId: "viet-01", answers: {} };
  const errorOf = async (res: Response) => ((await res.json()) as ExamApiErrorBody).error;

  it("200: bài Viết hợp lệ (đề thật viet-01) -> ExamResult.writing, level null", async () => {
    const res = await post({
      ...base,
      writing: {
        "w51-0001": { blanks: { "㉠": "답", "㉡": "답" } },
        "w53-0002": { text: "가".repeat(250) },
      },
      timeSpentMs: 1_000_000,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const r = (await res.json()) as ExamResult;
    expect(r.level).toBeNull();
    expect(r.sections).toEqual([]);
    expect(r.timeSpentMs).toBe(1_000_000);
    expect(r.writing!.items.map((i) => i.id)).toEqual([
      "w51-0001",
      "w52-0001",
      "w53-0002",
      "w54-0002",
    ]);
    expect(r.writing!.items[2]).toMatchObject({ char_count: 250, char_status: "within" });
  });

  it("200: không gửi writing (bỏ trống cả phần)", async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    const r = (await res.json()) as ExamResult;
    expect(r.writing!.items.every((i) => i.char_count === undefined || i.char_count === 0)).toBe(
      true,
    );
  });

  it("400 invalid_writing_answer: sai hình dạng / quá dài / writing không phải object", async () => {
    for (const writing of [
      { "w53-0002": { blanks: { "㉠": "x" } } },
      { "w51-0001": { text: "x" } },
      { "w54-0002": { text: "가".repeat(WRITING_TEXT_MAX_CHARS + 1) } },
      "chuỗi",
      [1, 2],
    ]) {
      const res = await post({ ...base, writing });
      expect(res.status, JSON.stringify(writing).slice(0, 40)).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("invalid_writing_answer");
      expect(err.message.length).toBeGreaterThan(0);
    }
  });

  it("body quá lớn vẫn bị chặn (invalid_body); 2 bài 5.000 ký tự + chỗ trống vẫn lọt", async () => {
    const big = await post({ ...base, writing: {}, pad: "x".repeat(40_000) });
    expect(big.status).toBe(400);
    expect((await errorOf(big)).code).toBe("invalid_body");

    const max = await post({
      ...base,
      writing: {
        "w51-0001": { blanks: { "㉠": "가".repeat(500), "㉡": "가".repeat(500) } },
        "w52-0001": { blanks: { "㉠": "가".repeat(500), "㉡": "가".repeat(500) } },
        "w53-0002": { text: "가".repeat(5000) },
        "w54-0002": { text: "가".repeat(5000) },
      },
    });
    expect(max.status).toBe(200);
  });

  it("đề không tồn tại vẫn 404", async () => {
    const res = await post({ ...base, examId: "viet-99" });
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("exam_not_found");
  });
});

// ------------------------------------------------------------------ hàm thuần cho client

describe("tự chấm Viết: hàm thuần (writing-self-score, level)", () => {
  const review: WritingReview = {
    order: 1,
    duration_sec: 3000,
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
    items: [
      ["w51-0001", 10],
      ["w52-0001", 10],
      ["w53-0002", 30],
      ["w54-0002", 50],
    ].map(([id, max], i) => ({
      id,
      max_points: max,
      number: i + 1,
    })) as unknown as WritingReviewItem[],
  };

  it("clampSelfPoints: làm tròn, kẹp [0, max], giá trị lạ -> 0", () => {
    expect(clampSelfPoints(7.6, 10)).toBe(8);
    expect(clampSelfPoints(-3, 10)).toBe(0);
    expect(clampSelfPoints(99, 10)).toBe(10);
    expect(clampSelfPoints(Number.NaN, 10)).toBe(0);
    expect(clampSelfPoints(Infinity, 10)).toBe(0);
    expect(clampSelfPoints(null, 10)).toBe(0);
    expect(clampSelfPoints(undefined, 10)).toBe(0);
  });

  it("projectWritingScore: cộng điểm đã kẹp, đếm câu đã chấm; đề đủ 4 câu thì score = points", () => {
    const p = projectWritingScore(review, {
      "w51-0001": 8,
      "w52-0001": 20, // kẹp về 10
      "w53-0002": 20,
      "w54-0002": null, // chưa chấm
    });
    expect(p).toEqual({
      points: 38,
      max_points: 100,
      scored_count: 3,
      total_count: 4,
      score: 38,
      max_score: 100,
    });
    expect(projectWritingScore(review, {})).toMatchObject({ points: 0, scored_count: 0, score: 0 });
  });

  it("projectWritingScore: đề thiếu câu quy theo tỉ lệ trên thang phần Viết", () => {
    // Đề chỉ có W52 (10) + W53 (30): tổng điểm tối đa 40 nhưng phần Viết vẫn tính trên thang 100.
    const small: WritingReview = {
      ...review,
      max_points_total: 40,
      items: [review.items[1]!, review.items[2]!],
    };
    const p = projectWritingScore(small, { "w52-0001": 10, "w53-0002": 15 });
    expect(p.points).toBe(25);
    expect(p.score).toBe(Math.round((25 / 40) * 100)); // 63
  });

  it("projectLevelWithWriting (Mini Viết): chiếu điểm Viết lên thang tổng rồi tra ngưỡng cấp", () => {
    const full = projectLevelWithWriting(review, {
      "w51-0001": 10,
      "w52-0001": 10,
      "w53-0002": 30,
      "w54-0002": 50,
    });
    expect(full.total_score).toBe(100);
    expect(full.total_max_score).toBe(100);
    expect(full.level).toMatchObject({
      level: 6,
      label: "6급",
      compared_score: 300,
      is_estimate: true,
    });
    expect(full.level.next_level).toBeNull();

    const mid = projectLevelWithWriting(review, {
      "w51-0001": 10,
      "w52-0001": 10,
      "w53-0002": 20,
      "w54-0002": 30,
    });
    // 70/100 -> 210/300 -> 5급, cần 20 điểm để lên 6급
    expect(mid.level).toMatchObject({ level: 5, compared_score: 210 });
    expect(mid.level.next_level).toEqual({ level: 6, label: "6급", points_needed: 20 });

    const none = projectLevelWithWriting(review, {});
    expect(none.level).toMatchObject({ level: null, label: "Chưa đạt cấp", compared_score: 0 });
    expect(none.level.next_level).toMatchObject({ level: 3, points_needed: 120 });
  });

  it("projectLevelWithWriting (đề đủ Nghe + Viết + Đọc): cộng điểm tự động, so thẳng điểm thật", () => {
    const fullReview: WritingReview = {
      ...review,
      level_basis: {
        ...review.level_basis,
        auto_score: 150,
        auto_max_score: 200,
        is_estimate: false,
      },
    };
    const r = projectLevelWithWriting(fullReview, {
      "w51-0001": 10,
      "w52-0001": 10,
      "w53-0002": 20,
      "w54-0002": 30,
    });
    expect(r).toMatchObject({ total_score: 220, total_max_score: 300 });
    expect(r.level).toMatchObject({ level: 5, compared_score: 220, is_estimate: false });
  });

  it("dùng lại logic estimateLevel của server (cùng kết quả với levelFromThresholds)", () => {
    const viaClient = projectLevelWithWriting(review, { "w53-0002": 30, "w54-0002": 50 }).level;
    const direct = levelFromThresholds(240, review.level_basis.thresholds, 300, true);
    // 80/100 -> 240/300
    expect(viaClient).toEqual(direct);
  });

  it("file client-safe không import fs/zod/registry chương trình ở dạng giá trị", () => {
    for (const file of ["lib/exam/level.ts", "lib/exam/writing-self-score.ts"]) {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      const imports = [...text.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"([^"]+)";/gm)];
      for (const [, isType, from] of imports) {
        expect(from, `${file} import ${from}`).not.toMatch(/^node:|^fs$|^zod$|^yaml$/);
        if (!isType) {
          expect(from, `${file} import giá trị ${from}`).not.toMatch(/lib\/db\/programs|source/);
        }
      }
    }
  });
});
