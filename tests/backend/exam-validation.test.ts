import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { validateContent, type ValidationIssue } from "@/lib/db/content-validation";
import { checkExamLabelRules } from "@/lib/db/content-rules";
import { validateExamFile, type ExamQuestionRef } from "@/lib/db/exam-validation";
import { getExamBlueprint, topikII } from "@/lib/db/programs";

const REAL_ROOT = path.join(process.cwd(), "content");
const real = (rel: string) => ({
  file: rel,
  text: readFileSync(path.join(REAL_ROOT, rel), "utf8"),
});

// ------------------------------------------------------------------ luật nhãn đúng

describe("checkExamLabelRules (content-spec §4.1, đề lắp ráp)", () => {
  const ok = [0, 1, 2, 3, 1, 0, 3, 2, 2, 3, 0, 1, 3, 2, 0, 1, 1, 2, 3, 0]; // 20 câu, 5 mỗi nhãn

  it("dãy phân bố đều, không chu kỳ: không vi phạm", () => {
    expect(checkExamLabelRules(ok)).toEqual([]);
  });

  it("không quá 3 câu liền cùng nhãn: 4 câu liền bị báo, 3 câu liền thì được", () => {
    const three = [0, 0, 0, 1, 2, 3, 1, 2, 3, 0, 2, 1];
    expect(checkExamLabelRules(three)).toEqual([]);
    const four = [0, 0, 0, 0, 1, 2, 3, 1, 3, 2, 1, 2];
    const problems = checkExamLabelRules(four);
    expect(problems.some((p) => /4 câu liền nhau/.test(p.message))).toBe(true);
    expect(problems.some((p) => p.message.includes("①"))).toBe(true);
  });

  it("chu kỳ lặp dài từ 4: ②④①③ │ ②④①③ bị báo; chu kỳ ngắn hơn 4 thì không", () => {
    const cycle = [1, 3, 0, 2, 1, 3, 0, 2, 0, 3, 1, 2];
    expect(checkExamLabelRules(cycle).some((p) => /chu kỳ lặp/.test(p.message))).toBe(true);
    const short = [1, 3, 0, 1, 3, 0, 2, 0, 3, 2, 1, 2];
    expect(checkExamLabelRules(short).some((p) => /chu kỳ lặp/.test(p.message))).toBe(false);
  });

  it("chuỗi mẫu doc-01 (②④①③②④①③②) vi phạm chu kỳ nhưng không vi phạm phân bố", () => {
    const problems = checkExamLabelRules([1, 3, 0, 2, 1, 3, 0, 2, 1]);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toMatch(/chu kỳ lặp/);
  });

  it("phân bố lệch: nhãn chiếm quá xa 25% bị báo (từ 8 câu trở lên)", () => {
    const skewed = [0, 1, 0, 2, 0, 3, 0, 1, 0, 2, 0, 3, 0, 1, 0, 2, 0, 3, 0, 1]; // ① 10/20
    const problems = checkExamLabelRules(skewed);
    expect(problems.some((p) => /nhãn đúng ①.*10\/20/.test(p.message))).toBe(true);
    // ít câu hơn 8: không kiểm phân bố
    expect(checkExamLabelRules([0, 1, 0, 2, 0, 3]).filter((p) => /lệch/.test(p.message))).toEqual(
      [],
    );
  });

  it("dãy rỗng không vi phạm", () => {
    expect(checkExamLabelRules([])).toEqual([]);
  });
});

// ------------------------------------------------------------------ validateExamFile

/** Kho câu giả: r-id theo type_code, đáp án đúng theo mảng. */
function refs(entries: Array<[string, number, string?]>): Map<string, ExamQuestionRef> {
  return new Map(
    entries.map(([id, correctIndex, groupKey]) => [
      id,
      {
        id,
        type_code: id.slice(0, 3).toUpperCase(),
        correctIndex,
        ...(groupKey ? { group_key: groupKey } : {}),
      },
    ]),
  );
}

const BASE_ENTRIES: Array<[string, number, string?]> = [
  ["r01-0001", 0],
  ["r02-0001", 1],
  ["r03-0001", 2],
  ["r04-0001", 3],
  ["r05-0001", 1],
  ["r06-0001", 0],
  ["r07-0001", 3],
  ["r08-0001", 2],
  ["l01-0001", 0],
];

function check(
  exam: Record<string, unknown>,
  entries: Array<[string, number, string?]> = BASE_ENTRIES,
  where: { dirKind?: string; basename?: string } = {},
): { issues: ValidationIssue[]; parsed: unknown } {
  const issues: ValidationIssue[] = [];
  const parsed = validateExamFile(
    exam,
    {
      file: "topik-ii/exams/mini/doc-t.yaml",
      program: topikII,
      dirKind: where.dirKind ?? "mini",
      basename: where.basename ?? "doc-t",
    },
    refs(entries),
    issues,
  );
  return { issues, parsed };
}

const examOf = (over: Record<string, unknown> = {}, questions?: string[]) => ({
  id: "doc-t",
  kind: "mini",
  title: "Mini test thử",
  status: "draft",
  sections: [
    {
      skill: "reading",
      questions: questions ?? [
        "r01-0001",
        "r02-0001",
        "r03-0001",
        "r04-0001",
        "r05-0001",
        "r06-0001",
        "r07-0001",
        "r08-0001",
      ],
    },
  ],
  ...over,
});

const errors = (issues: ValidationIssue[]) => issues.filter((i) => i.severity === "error");
const warnings = (issues: ValidationIssue[]) => issues.filter((i) => i.severity === "warning");

describe("validateExamFile: cấu trúc và tham chiếu", () => {
  it("đề hợp lệ (draft): chỉ cảnh báo số câu so với blueprint, không lỗi", () => {
    const { issues, parsed } = check(examOf());
    expect(parsed).toBeDefined();
    expect(errors(issues)).toEqual([]);
    expect(warnings(issues).map((w) => w.code)).toEqual(["question-count"]);
    expect(warnings(issues)[0]!.message).toMatch(/8 câu.*yêu cầu 20/);
  });

  it("thiếu trường bắt buộc và sai enum -> lỗi theo từng trường, không dựng đề", () => {
    const { issues, parsed } = check({ id: "doc-t", sections: [] });
    expect(parsed).toBeUndefined();
    const byPath = Object.fromEntries(errors(issues).map((e) => [e.path, e.message]));
    expect(byPath.kind).toBe("thiếu trường bắt buộc");
    expect(byPath.title).toBe("thiếu trường bắt buộc");
    expect(byPath.status).toBe("thiếu trường bắt buộc");
    expect(byPath.sections).toMatch(/ít nhất 1 phần/);

    const bad = check(examOf({ status: "live", kind: "gia" })).issues;
    expect(
      errors(bad)
        .map((e) => e.path)
        .sort(),
    ).toEqual(["kind", "status"]);
  });

  it("kỹ năng chưa hỗ trợ (writing) hoặc phần rỗng / duration_sec rác bị chặn", () => {
    const writing = check(examOf({ sections: [{ skill: "writing", questions: ["r01-0001"] }] }));
    expect(errors(writing.issues)[0]!.path).toBe("sections[0].skill");
    const empty = check(examOf({ sections: [{ skill: "reading", questions: [] }] }));
    expect(errors(empty.issues)[0]!.message).toMatch(/ít nhất 1 câu/);
    for (const d of [0, -5, 1.5, 999999, "900"]) {
      const r = check(
        examOf({ sections: [{ skill: "reading", duration_sec: d, questions: ["r01-0001"] }] }),
      );
      expect(errors(r.issues).length, String(d)).toBeGreaterThan(0);
    }
  });

  it("id lệch tên file, kind lệch thư mục, program lệch thư mục -> lỗi", () => {
    expect(errors(check(examOf({ id: "khac" })).issues).map((e) => e.path)).toEqual(["id"]);
    expect(
      errors(check(examOf(), BASE_ENTRIES, { dirKind: "full" }).issues).map((e) => e.path),
    ).toEqual(["kind"]);
    expect(errors(check(examOf({ program: "eps" })).issues).map((e) => e.path)).toEqual([
      "program",
    ]);
    expect(errors(check(examOf({ program: "topik-ii" })).issues)).toEqual([]);
  });

  it("id câu không tồn tại -> lỗi (kể cả draft)", () => {
    const { issues } = check(examOf({}, ["r01-0001", "r99-0001"]));
    const e = errors(issues);
    expect(e).toHaveLength(1);
    expect(e[0]!.path).toBe("sections[0].questions[1]");
    expect(e[0]!.message).toMatch(/r99-0001.*không tồn tại/);
  });

  it("câu trùng trong đề -> lỗi", () => {
    const { issues } = check(examOf({}, ["r01-0001", "r02-0001", "r01-0001"]));
    expect(errors(issues).map((e) => e.message)).toEqual([
      expect.stringMatching(/"r01-0001" bị trùng/),
    ]);
  });

  it("câu sai kỹ năng của phần (Nghe trong phần Đọc) -> lỗi", () => {
    const { issues } = check(examOf({}, ["r01-0001", "l01-0001"]));
    const e = errors(issues);
    expect(e).toHaveLength(1);
    expect(e[0]!.message).toMatch(/l01-0001.*listening.*không thuộc phần reading/);
  });

  it("hai phần cùng kỹ năng -> lỗi", () => {
    const { issues } = check(
      examOf({
        sections: [
          { skill: "reading", questions: ["r01-0001"] },
          { skill: "reading", questions: ["r02-0001"] },
        ],
      }),
    );
    expect(errors(issues).some((e) => /hai phần thi/.test(e.message))).toBe(true);
  });

  it("loại đề không có phần thi trong chương trình -> lỗi", () => {
    // ibt không khai báo blueprint: rơi về sections của chương trình (có reading), nên hợp lệ.
    expect(getExamBlueprint(topikII, "ibt", "reading")).toBeDefined();
    // Chương trình giả không có phần Đọc:
    const issues: ValidationIssue[] = [];
    validateExamFile(
      examOf(),
      {
        file: "topik-ii/exams/mini/doc-t.yaml",
        program: { ...topikII, sections: [], exam_blueprints: {} },
        dirKind: "mini",
        basename: "doc-t",
      },
      refs(BASE_ENTRIES),
      issues,
    );
    expect(errors(issues).some((e) => /không có phần thi "reading"/.test(e.message))).toBe(true);
  });
});

describe("validateExamFile: bộ group_key", () => {
  const withPair: Array<[string, number, string?]> = [
    ["r01-0001", 0],
    ["r19-0001", 1, "r19-20-0001"],
    ["r20-0001", 2, "r19-20-0001"],
    ["r47-0001", 3, "r46-47-0001"],
    ["r46-0001", 0, "r46-47-0001"],
    ["r48-0001", 1, "r48-50-0001"],
    ["r49-0001", 2, "r48-50-0001"],
    ["r50-0001", 3, "r48-50-0001"],
  ];
  const groupErrors = (qs: string[]) =>
    errors(check(examOf({}, qs), withPair).issues).filter((e) => /^group-/.test(e.code ?? ""));

  it("bộ đủ câu, liền nhau, đúng thứ tự: không lỗi", () => {
    expect(
      groupErrors(["r01-0001", "r19-0001", "r20-0001", "r48-0001", "r49-0001", "r50-0001"]),
    ).toEqual([]);
  });

  it("bộ thiếu câu (chỉ r47-0001 mà thiếu r46) -> lỗi group-incomplete kể cả draft", () => {
    const e = groupErrors(["r01-0001", "r47-0001"]);
    expect(e).toHaveLength(1);
    expect(e[0]!.code).toBe("group-incomplete");
    expect(e[0]!.message).toMatch(/r46-47-0001.*đủ 2 câu.*chỉ có 1/);
    // bộ ba thiếu một câu
    expect(groupErrors(["r48-0001", "r49-0001"])[0]!.message).toMatch(/đủ 3 câu/);
  });

  it("các câu của bộ không liền nhau -> lỗi group-contiguous", () => {
    const e = groupErrors(["r19-0001", "r01-0001", "r20-0001"]);
    expect(e.map((x) => x.code)).toEqual(["group-contiguous"]);
  });

  it("thứ tự sai trong bộ (R47 trước R46) -> lỗi group-order", () => {
    const e = groupErrors(["r47-0001", "r46-0001"]);
    expect(e.map((x) => x.code)).toEqual(["group-order"]);
  });
});

describe("validateExamFile: draft cảnh báo, published chặn", () => {
  // 20 câu hợp lệ về số lượng; nhãn đúng chu kỳ ②④①③ lặp.
  const twenty: Array<[string, number]> = Array.from({ length: 20 }, (_, i) => [
    `r${String(i + 1).padStart(2, "0")}-0001`,
    [1, 3, 0, 2][i % 4]!,
  ]);
  const ids = twenty.map(([id]) => id);

  it("đủ 20 câu nhưng nhãn lặp chu kỳ: draft chỉ cảnh báo", () => {
    const { issues } = check(examOf({}, ids), twenty);
    expect(errors(issues)).toEqual([]);
    expect(warnings(issues).map((w) => w.code)).toEqual(["label-rule"]);
  });

  it("cùng đề ở published: luật nhãn thành LỖI", () => {
    const { issues } = check(examOf({ status: "published" }, ids), twenty);
    const e = errors(issues);
    expect(e.map((x) => x.code)).toEqual(["label-rule"]);
    expect(e[0]!.message).toMatch(/chu kỳ lặp/);
  });

  it("published thiếu câu so với blueprint -> lỗi; draft -> cảnh báo", () => {
    const published = check(examOf({ status: "published" }));
    expect(errors(published.issues).map((e) => e.code)).toContain("question-count");
    const draft = check(examOf({ status: "draft" }));
    expect(errors(draft.issues).map((e) => e.code)).not.toContain("question-count");
    expect(warnings(draft.issues).map((w) => w.code)).toContain("question-count");
  });

  it("published đủ 20 câu, nhãn xáo hợp lệ: sạch", () => {
    const good = twenty.map(
      ([id], i) =>
        [id, [0, 1, 2, 3, 1, 0, 3, 2, 2, 3, 0, 1, 3, 2, 0, 1, 1, 2, 3, 0][i]!] as [string, number],
    );
    const { issues } = check(examOf({ status: "published" }, ids), good);
    expect(issues).toEqual([]);
  });

  it("câu chưa xác định được nhãn đúng: bỏ qua khỏi phân tích nhãn và báo", () => {
    const unknown = new Map(refs(BASE_ENTRIES));
    unknown.set("r01-0001", { id: "r01-0001", type_code: "R01" });
    const issues: ValidationIssue[] = [];
    validateExamFile(
      examOf(),
      {
        file: "topik-ii/exams/mini/doc-t.yaml",
        program: topikII,
        dirKind: "mini",
        basename: "doc-t",
      },
      unknown,
      issues,
    );
    expect(warnings(issues).map((w) => w.code)).toContain("label-unknown");
  });
});

// ------------------------------------------------------------------ validateContent (tích hợp)

describe("validateContent: file đề trong content/", () => {
  const SAMPLE = "topik-ii/exams/mini/doc-01.yaml";

  it("đề doc-01 với câu thật: đủ 20 câu, đạt luật nhãn, kể cả khi published", () => {
    const r = validateContent([...DOC_01_QUESTIONS.map(real), real(SAMPLE)]);
    expect(r.errorCount).toBe(0);
    expect(r.examsChecked).toBe(1);
    expect(r.issues.filter((i) => i.file === SAMPLE)).toEqual([]);

    const published = {
      file: SAMPLE,
      text: real(SAMPLE).text.replace(/^status: draft$/m, "status: published"),
    };
    const p = validateContent([...DOC_01_QUESTIONS.map(real), published]);
    expect(p.errorCount).toBe(0);
    expect(p.issues.filter((i) => i.file === SAMPLE)).toEqual([]);
  });

  it("thiếu câu và dãy nhãn liền: draft chỉ cảnh báo, published thành lỗi", () => {
    // Bỏ r01 (19/20 câu) và dồn r03, r17, r33 (đều ④) lên trước r23 (④) => 4 câu liền nhãn ④.
    const broken = real(SAMPLE)
      .text.replace(/^\s+- r(01|03|17|33)-0001\n/gm, "")
      .replace(/^(\s+)- r23-0001$/m, "$1- r03-0001\n$1- r17-0001\n$1- r33-0001\n$1- r23-0001");
    const draft = validateContent([...DOC_01_QUESTIONS.map(real), { file: SAMPLE, text: broken }]);
    expect(draft.errorCount).toBe(0);
    const draftIssues = draft.issues.filter((i) => i.file === SAMPLE);
    expect(draftIssues.map((i) => i.code)).toEqual(["question-count", "label-rule"]);
    expect(draftIssues.every((i) => i.severity === "warning")).toBe(true);
    expect(draftIssues[0]!.message).toMatch(/19 câu.*20/);
    expect(draftIssues[1]!.message).toMatch(/4 câu liền nhau/);

    const published = {
      file: SAMPLE,
      text: broken.replace(/^status: draft$/m, "status: published"),
    };
    const r = validateContent([...DOC_01_QUESTIONS.map(real), published]);
    expect(
      r.issues.filter((i) => i.file === SAMPLE && i.severity === "error").map((i) => i.code),
    ).toEqual(["question-count", "label-rule"]);
    expect(r.errorCount).toBe(2);
  });

  it("đề chứa r47-0001 (bộ r46-47 chưa có R46) bị chặn dù là draft", () => {
    const exam = stringify({
      id: "doc-x",
      kind: "mini",
      title: "Thử",
      status: "draft",
      sections: [{ skill: "reading", questions: ["r01-0001", "r47-0001"] }],
    });
    const r = validateContent([
      real("topik-ii/practice/R01/r01-0001.yaml"),
      real("topik-ii/practice/R47/r47-0001.yaml"),
      { file: "topik-ii/exams/mini/doc-x.yaml", text: exam },
    ]);
    const e = r.issues.filter((i) => i.severity === "error");
    expect(e.map((i) => i.code)).toEqual(["group-incomplete"]);
    expect(e[0]!.file).toBe("topik-ii/exams/mini/doc-x.yaml");
  });

  it("sai đường dẫn (thiếu thư mục kind), YAML hỏng, file rỗng, chương trình lạ", () => {
    const r = validateContent([
      { file: "topik-ii/exams/doc-a.yaml", text: "id: doc-a\n" },
      { file: "topik-ii/exams/mini/doc-b.yaml", text: "id: [hỏng" },
      { file: "topik-ii/exams/mini/doc-c.yaml", text: "" },
      { file: "khong-co/exams/mini/doc-d.yaml", text: "id: doc-d\n" },
    ]);
    const msgs = r.issues.map((i) => i.message);
    expect(
      msgs.some((m) => /đường dẫn phải có dạng topik-ii\/exams\/<kind>\/<id>\.yaml/.test(m)),
    ).toBe(true);
    expect(msgs.some((m) => /lỗi cú pháp YAML/.test(m))).toBe(true);
    expect(msgs.some((m) => /file rỗng/.test(m))).toBe(true);
    expect(msgs.some((m) => /chưa được cấu hình/.test(m))).toBe(true);
  });
});

const DOC_01_QUESTIONS = [
  "topik-ii/practice/R01/r01-0001.yaml",
  "topik-ii/practice/R03/r03-0001.yaml",
  "topik-ii/practice/R07/r07-0001.yaml",
  "topik-ii/practice/R10/r10-0001.yaml",
  "topik-ii/practice/R14/r14-0001.yaml",
  "topik-ii/practice/R17/r17-0001.yaml",
  "topik-ii/practice/R19/r19-0001.yaml",
  "topik-ii/practice/R20/r20-0001.yaml",
  "topik-ii/practice/R23/r23-0001.yaml",
  "topik-ii/practice/R24/r24-0001.yaml",
  "topik-ii/practice/R26/r26-0001.yaml",
  "topik-ii/practice/R29/r29-0001.yaml",
  "topik-ii/practice/R33/r33-0001.yaml",
  "topik-ii/practice/R35/r35-0001.yaml",
  "topik-ii/practice/R40/r40-0001.yaml",
  "topik-ii/practice/R44/r44-0001.yaml",
  "topik-ii/practice/R45/r45-0001.yaml",
  "topik-ii/practice/R48/r48-0001.yaml",
  "topik-ii/practice/R49/r49-0001.yaml",
  "topik-ii/practice/R50/r50-0001.yaml",
];
