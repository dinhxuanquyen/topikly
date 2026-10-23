import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { topikII } from "@/lib/db/programs";
import {
  clearExamCache,
  getFullExam,
  getPublicExam,
  listExams,
  renderInstruction,
  toPublicSection,
  type FullExamQuestion,
  type FullExamSection,
} from "@/lib/exam/source";
import type { FullQuestion } from "@/lib/practice/source";
import { clearPracticeCache } from "@/lib/practice/source";
import { CHOICE_LABELS } from "@/lib/practice/types";

const REAL_ROOT = path.join(process.cwd(), "content");

const DOC_01_IDS = [
  "r01-0001",
  "r03-0001",
  "r07-0001",
  "r10-0001",
  "r14-0001",
  "r17-0001",
  "r19-0001",
  "r20-0001",
  "r23-0001",
  "r24-0001",
  "r26-0001",
  "r29-0001",
  "r33-0001",
  "r35-0001",
  "r40-0001",
  "r44-0001",
  "r45-0001",
  "r48-0001",
  "r49-0001",
  "r50-0001",
];

const FORBIDDEN_KEYS = [
  "correct",
  "note_vi",
  "trap",
  "explanation_vi",
  "transcript_vi",
  "notes_internal",
  "reviewed_by",
  "correctLabel",
] as const;

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

afterEach(() => {
  clearExamCache();
  clearPracticeCache();
});

describe("renderInstruction", () => {
  it("thay {from} và {to} bằng số câu thật", () => {
    expect(renderInstruction("※ [{from}~{to}] 다음을 읽고 물음에 답하십시오.", 19, 20)).toBe(
      "※ [19~20] 다음을 읽고 물음에 답하십시오.",
    );
  });

  it("khối một câu rút n~n thành n", () => {
    expect(renderInstruction("※ [{from}~{to}] (   )에 들어갈 것을 고르십시오.", 7, 7)).toBe(
      "※ [7] (   )에 들어갈 것을 고르십시오.",
    );
  });
});

describe("exam/source: đề mẫu thật content/topik-ii/exams/mini/doc-01", () => {
  it("liệt kê đề với thông tin tóm tắt lấy từ file và cấu hình", () => {
    const list = listExams("topik-ii");
    expect(list).toEqual([
      {
        id: "doc-01",
        program: "topik-ii",
        kind: "mini",
        title: "Mini test Đọc 01",
        status: "draft",
        skills: ["reading"],
        question_count: 20,
        duration_sec: 1800, // không override: lấy blueprint mini.reading
      },
    ]);
    expect(listExams("topik-ii", "mini")).toHaveLength(1);
    expect(listExams("topik-ii", "full")).toEqual([]);
    expect(listExams("eps")).toEqual([]);
  });

  it("dựng PublicExam: đánh số liên tục theo thứ tự trong file, mỗi nhóm một khối", () => {
    const exam = getPublicExam("topik-ii", "mini", "doc-01")!;
    expect(exam).toBeDefined();
    expect(exam.sections).toHaveLength(1);
    const section = exam.sections[0]!;
    expect(section).toMatchObject({
      skill: "reading",
      order: 1,
      duration_sec: 1800,
      question_count: 20,
      max_score: 100,
    });

    const numbers = section.blocks.flatMap((b) => b.questions.map((q) => q.number));
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(section.blocks.flatMap((b) => b.questions.map((q) => q.question.id))).toEqual(
      DOC_01_IDS,
    );
    // [nhóm dạng, số đầu, số cuối, dùng chung ngữ liệu]
    expect(
      section.blocks.map((b) => [b.type_group, b.first_number, b.last_number, b.shared_material]),
    ).toEqual([
      ["R01-2", 1, 1, false],
      ["R03-4", 2, 2, false],
      ["R05-8", 3, 3, false],
      ["R09-12", 4, 4, false],
      ["R13-15", 5, 5, false],
      ["R16-18", 6, 6, false],
      ["R19-20", 7, 8, true],
      ["R23-24", 9, 10, true],
      ["R25-27", 11, 11, false],
      ["R28-31", 12, 12, false],
      ["R32-34", 13, 13, false],
      ["R35-38", 14, 14, false],
      ["R39-41", 15, 15, false],
      ["R44-45", 16, 17, true],
      ["R48-50", 18, 20, true],
    ]);
  });

  it("lệnh nhóm lấy từ cấu hình, đã thay số câu thật (khối một câu: [n])", () => {
    const blocks = getPublicExam("topik-ii", "mini", "doc-01")!.sections[0]!.blocks;
    expect(blocks[0]!.instruction_ko).toBe("※ [1] (   )에 들어갈 가장 알맞은 것을 고르십시오.");
    expect(blocks[3]!.instruction_ko).toBe(
      "※ [4] 다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
    );
    expect(blocks[12]!.instruction_ko).toBe(
      "※ [15] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오.",
    );
    expect(blocks[14]!.instruction_ko).toBe("※ [18~20] 다음을 읽고 물음에 답하십시오.");
    for (const b of blocks) expect(b.instruction_ko).not.toMatch(/[{}]/);
  });

  it("PublicExam không chứa đáp án hay lời giải", () => {
    const exam = getPublicExam("topik-ii", "mini", "doc-01")!;
    const keys = collectKeys(exam);
    for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), forbidden).toBe(false);
    expect(JSON.stringify(exam)).not.toContain("explanation_vi");
  });

  it("FullExam có đáp án: nhãn đúng theo thứ tự đề là ②④①③②④③①④③①②④③②①④③①②", () => {
    const full = getFullExam("topik-ii", "mini", "doc-01")!;
    const labels = full.sections[0]!.questions.map((q) => q.question.correctLabel);
    expect(labels.join("")).toBe("②④①③②④③①④③①②④③②①④③①②");
    expect(full.sections[0]!.questions.map((q) => q.type_group)[0]).toBe("R01-2");
  });

  it("đề không tồn tại: undefined (kind sai, id sai, program lạ)", () => {
    expect(getPublicExam("topik-ii", "mini", "khong-co")).toBeUndefined();
    expect(getPublicExam("topik-ii", "full", "doc-01")).toBeUndefined();
    expect(getPublicExam("eps", "mini", "doc-01")).toBeUndefined();
    expect(getFullExam("topik-ii", "mini", "khong-co")).toBeUndefined();
  });

  it("includeDrafts: false ẩn đề draft", () => {
    expect(listExams("topik-ii", undefined, { includeDrafts: false })).toEqual([]);
    expect(getPublicExam("topik-ii", "mini", "doc-01", { includeDrafts: false })).toBeUndefined();
  });
});

describe("exam/source: bộ câu dùng chung ngữ liệu (toPublicSection)", () => {
  function fq(id: string, typeCode: string, groupKey?: string): FullQuestion {
    return {
      id,
      program: "topik-ii",
      type_code: typeCode,
      skill: "reading",
      subskill: "main_idea",
      difficulty: 4,
      stem: `stem ${id}`,
      ...(groupKey ? { group_key: groupKey, passage: "ngữ liệu chung" } : {}),
      choices: CHOICE_LABELS.map((label, i) => ({ label, text: `p${i}`, correct: i === 0 })),
      correctLabel: "①",
      explanation_vi: "giải",
    };
  }
  const item = (n: number, group: string, q: FullQuestion): FullExamQuestion => ({
    number: n,
    type_group: group,
    question: q,
  });
  const section = (questions: FullExamQuestion[]): FullExamSection => ({
    skill: "reading",
    order: 1,
    duration_sec: 900,
    question_count: questions.length,
    max_score: 100,
    questions,
  });

  it("câu cùng group_key thành một khối shared_material, đánh số liên tục sau khối đơn", () => {
    const pub = toPublicSection(
      topikII,
      section([
        item(1, "R13-15", fq("r14-0001", "R14")),
        item(2, "R13-15", fq("r15-0001", "R15")),
        item(3, "R19-20", fq("r19-0001", "R19", "r19-20-0001")),
        item(4, "R19-20", fq("r20-0001", "R20", "r19-20-0001")),
        item(5, "R48-50", fq("r48-0001", "R48", "r48-50-0001")),
        item(6, "R48-50", fq("r49-0001", "R49", "r48-50-0001")),
        item(7, "R48-50", fq("r50-0001", "R50", "r48-50-0001")),
      ]),
    );
    expect(
      pub.blocks.map((b) => [b.type_group, b.first_number, b.last_number, b.shared_material]),
    ).toEqual([
      ["R13-15", 1, 2, false],
      ["R19-20", 3, 4, true],
      ["R48-50", 5, 7, true],
    ]);
    expect(pub.blocks[1]!.instruction_ko).toBe("※ [3~4] 다음을 읽고 물음에 답하십시오.");
    expect(pub.blocks[2]!.instruction_ko).toBe("※ [5~7] 다음을 읽고 물음에 답하십시오.");
    expect(pub.blocks[1]!.questions.map((q) => q.question.stem)).toEqual([
      "stem r19-0001",
      "stem r20-0001",
    ]);
    // ngữ liệu chung vẫn ở từng câu (giao diện in một lần)
    expect(pub.blocks[1]!.questions[0]!.question.passage).toBe("ngữ liệu chung");
  });

  it("hai bộ khác group_key đứng liền nhau vẫn là hai khối", () => {
    const pub = toPublicSection(
      topikII,
      section([
        item(1, "R19-20", fq("r19-0001", "R19", "r19-20-0001")),
        item(2, "R19-20", fq("r20-0001", "R20", "r19-20-0001")),
        item(3, "R19-20", fq("r19-0002", "R19", "r19-20-0002")),
        item(4, "R19-20", fq("r20-0002", "R20", "r19-20-0002")),
      ]),
    );
    expect(pub.blocks.map((b) => [b.first_number, b.last_number])).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("nhóm Nghe chưa có lệnh trong cấu hình: chỉ in số câu, không bịa lệnh", () => {
    const l = fq("l22-0001", "L22");
    const pub = toPublicSection(topikII, {
      ...section([item(1, "L21-22", { ...l, skill: "listening" })]),
      skill: "listening",
    });
    expect(pub.blocks[0]!.instruction_ko).toBe("※ [1]");
  });
});

describe("exam/source: đề trong thư mục tạm", () => {
  const DOC_01 = readFileSync(path.join(REAL_ROOT, "topik-ii/exams/mini/doc-01.yaml"), "utf8");

  function tempRoot(examFiles: Record<string, string>): string {
    const root = mkdtempSync(path.join(os.tmpdir(), "topikly-exam-"));
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

  const withRoot = (root: string, fn: () => void) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      fn();
    } finally {
      warn.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  };

  it("đề published vi phạm luật nhãn đúng bị loại (có console.warn); draft cùng nội dung vẫn hiện", () => {
    // Dồn r03, r17, r33 (đều ④) lên trước r23 (④) => 4 câu liền cùng nhãn ④.
    const published = DOC_01.replace(/^id: doc-01$/m, "id: doc-02")
      .replace(/^status: draft$/m, "status: published")
      .replace(/^\s+- r(03|17|33)-0001\n/gm, "")
      .replace(/^(\s+)- r23-0001$/m, "$1- r03-0001\n$1- r17-0001\n$1- r33-0001\n$1- r23-0001");
    const root = tempRoot({ "mini/doc-01.yaml": DOC_01, "mini/doc-02.yaml": published });
    withRoot(root, () => {
      const list = listExams("topik-ii", undefined, { contentRoot: root });
      expect(list.map((e) => e.id)).toEqual(["doc-01"]);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  it("đề tham chiếu câu không tồn tại bị loại; đề tốt còn lại vẫn hiện", () => {
    const bad = DOC_01.replace(/^id: doc-01$/m, "id: doc-03").replace("r40-0001", "r40-9999");
    const root = tempRoot({ "mini/doc-01.yaml": DOC_01, "mini/doc-03.yaml": bad });
    withRoot(root, () => {
      expect(listExams("topik-ii", undefined, { contentRoot: root }).map((e) => e.id)).toEqual([
        "doc-01",
      ]);
    });
  });

  it("file đề có id lệch tên file hoặc YAML hỏng bị bỏ qua", () => {
    const root = tempRoot({
      "mini/doc-01.yaml": DOC_01,
      "mini/lech.yaml": DOC_01,
      "mini/hong.yaml": "id: [chưa đóng",
    });
    withRoot(root, () => {
      expect(listExams("topik-ii", undefined, { contentRoot: root }).map((e) => e.id)).toEqual([
        "doc-01",
      ]);
    });
  });

  it("thư mục exams không tồn tại: danh sách rỗng", () => {
    const root = tempRoot({});
    withRoot(root, () => {
      expect(listExams("topik-ii", undefined, { contentRoot: root })).toEqual([]);
    });
  });

  it("thời gian phần lấy blueprint khi file đề không override; có duration_sec thì ghi đè", () => {
    expect(DOC_01).not.toMatch(/^\s+duration_sec:/m);
    const override = DOC_01.replace(/^id: doc-01$/m, "id: doc-04").replace(
      /^(\s+)- skill: reading$/m,
      "$1- skill: reading\n$1  duration_sec: 900",
    );
    expect(override).toMatch(/^\s+duration_sec: 900$/m);
    const root = tempRoot({ "mini/doc-01.yaml": DOC_01, "mini/doc-04.yaml": override });
    withRoot(root, () => {
      const exams = listExams("topik-ii", undefined, { contentRoot: root });
      expect(exams.find((e) => e.id === "doc-01")!.duration_sec).toBe(
        topikII.exam_blueprints.mini!.reading!.duration_sec,
      );
      expect(exams.find((e) => e.id === "doc-04")!.duration_sec).toBe(900);
    });
  });
});
