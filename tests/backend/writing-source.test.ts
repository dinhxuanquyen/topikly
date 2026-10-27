import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { countChars } from "@/lib/db/char-count";
import {
  clearWritingCache,
  getWritingPrompt,
  getWritingReveal,
  listWritingPrompts,
  listWritingTypes,
} from "@/lib/practice/writing-source";
import {
  charLimitStatus,
  countChars as countCharsFromTypes,
  WRITING_RUBRIC_CRITERIA,
} from "@/lib/practice/writing-types";

const FIXTURE_ROOT = path.join(process.cwd(), "tests", "fixtures", "content", "valid");

/** Khoá không bao giờ được xuất hiện trong dữ liệu gửi cho client. */
const FORBIDDEN_KEYS = [
  "notes_internal",
  "reviewed_by",
  "reviewed_at",
  "authored_by",
  "source",
  "tags",
  "created_at",
] as const;

/** Khoá thuộc phần tự so sánh: KHÔNG được có trong WritingPrompt. */
const REVEAL_ONLY_KEYS = [
  "model_answers",
  "required_points",
  "expression_bank",
  "common_mistakes_vi",
  "scoring_notes_vi",
  "explanation_vi",
  "outline_vi",
  "accepted_answers",
  "partial_answers",
  "rejected_answers",
  "required_elements_vi",
  "rubric_notes_vi",
  "register",
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

const tmpDirs: string[] = [];
afterEach(() => {
  clearWritingCache();
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function copyFixtures(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "topikly-writing-"));
  tmpDirs.push(root);
  cpSync(FIXTURE_ROOT, root, { recursive: true });
  return root;
}

/** Thư mục content tạm có thêm W51 (suy từ fixture W52). */
function makeRootWithW51(): string {
  const root = copyFixtures();
  const w52 = readFileSync(path.join(root, "topik-ii/practice/W52/w52-0001.yaml"), "utf8");
  const w51 = w52
    .replace("id: w52-0001", "id: w51-0001")
    .replace("type_code: W52", "type_code: W51")
    .replace("subskill: expository_completion", "subskill: practical_completion")
    .replace("register: written_plain", "register: formal_polite");
  mkdirSync(path.join(root, "topik-ii/practice/W51"), { recursive: true });
  writeFileSync(path.join(root, "topik-ii/practice/W51/w51-0001.yaml"), w51);
  return root;
}

describe("writing-source: dữ liệu thật content/topik-ii", () => {
  it("liệt kê dạng Viết có đề (W51–W54) kèm tên, nhóm, định dạng, khung ký tự", () => {
    const all = listWritingTypes("topik-ii");
    expect(all.map((t) => t.type_code)).toEqual(["W51", "W52", "W53", "W54"]);
    expect(all.filter((t) => t.format === "fill_blanks").map((t) => t.type_code)).toEqual([
      "W51",
      "W52",
    ]);
    const types = all.filter((t) => t.format === "essay");
    expect(types[0]).toMatchObject({
      skill: "writing",
      type_group: "W53",
      format: "essay",
      char_limit: { min: 200, max: 300 },
      question_count: 1,
    });
    expect(types[0]!.name_vi.length).toBeGreaterThan(0);
    expect(types[1]!.char_limit).toEqual({ min: 600, max: 700 });
  });

  it("program lạ hoặc dạng chưa có đề trả rỗng / undefined", () => {
    expect(listWritingTypes("khong-co")).toEqual([]);
    expect(listWritingPrompts("khong-co", "W53")).toEqual([]);
    expect(listWritingPrompts("topik-ii", "R10")).toEqual([]);
    expect(listWritingPrompts("topik-ii", "W55")).toEqual([]);
    expect(getWritingPrompt("topik-ii", "r10-0001")).toBeUndefined();
    expect(getWritingReveal("topik-ii", "khong-co")).toBeUndefined();
  });

  it("đề W53: lệnh đề, task, chart_data (list), số liệu giả định, khung ký tự", () => {
    const [p] = listWritingPrompts("topik-ii", "W53");
    expect(p).toMatchObject({
      id: "w53-0002",
      program: "topik-ii",
      type_code: "W53",
      skill: "writing",
      subskill: "data_description",
      difficulty: 4,
      format: "essay",
      data_is_fictional: true,
      char_limit: { min: 200, max: 300 },
      image_url: null,
    });
    expect(p!.stem).toContain("200~300자");
    expect(p!.task).toContain("공공도서관");
    expect(p!.task!.endsWith("\n")).toBe(false);
    expect(p!.chart_data).toHaveLength(2);
    expect(p!.chart_data![0]!.series[0]!.points[0]).toEqual({ x: "2016", y: 210 });
    expect(p!.blanks).toBeUndefined();
    expect(p!.passage).toBeUndefined();
    expect(getWritingPrompt("topik-ii", "w53-0002")).toEqual(p);
  });

  it("đề KHÔNG chứa phần tự so sánh hay metadata nội bộ (mọi đề thật)", () => {
    const prompts = listWritingTypes("topik-ii").flatMap((t) =>
      listWritingPrompts("topik-ii", t.type_code),
    );
    expect(prompts).toHaveLength(4);
    for (const p of prompts) {
      const keys = collectKeys(p);
      for (const key of [...FORBIDDEN_KEYS, ...REVEAL_ONLY_KEYS]) {
        expect(keys.has(key), `${p.id} có khoá ${key}`).toBe(false);
      }
      const reveal = getWritingReveal("topik-ii", p.id)!;
      const json = JSON.stringify(p);
      expect(json).not.toContain(reveal.explanation_vi.slice(0, 40));
      for (const m of reveal.model_answers ?? []) {
        expect(json).not.toContain(m.text.slice(0, 30));
      }
    }
  });

  it("phần tự so sánh W53: bài mẫu 2 cấp, char_count đếm lại, ý bắt buộc, biểu hiện", () => {
    const r = getWritingReveal("topik-ii", "w53-0002")!;
    expect(r).toMatchObject({ id: "w53-0002", type_code: "W53", format: "essay" });
    expect(r.model_answers!.map((m) => m.level)).toEqual([4, 5]);
    for (const m of r.model_answers!) {
      expect(m.char_count).toBe(countChars(m.text));
      expect(m.char_count).toBeGreaterThanOrEqual(200);
      expect(m.char_count).toBeLessThanOrEqual(300);
      expect(m.manuscript_cells).toBeGreaterThanOrEqual(m.char_count);
      expect(m.text.endsWith("\n")).toBe(false);
      for (const k of WRITING_RUBRIC_CRITERIA.map((c) => c.key)) {
        expect(m.rubric_notes_vi[k].length).toBeGreaterThan(0);
      }
    }
    expect(r.required_points!.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    const covered = new Set(r.model_answers!.flatMap((m) => m.covers));
    for (const p of r.required_points!) expect(covered.has(p.id)).toBe(true);
    expect(r.expression_bank!.length).toBeGreaterThan(0);
    expect(r.common_mistakes_vi.length).toBeGreaterThan(0);
    expect(r.scoring_notes_vi.length).toBeGreaterThan(0);
    expect(r.explanation_vi).toContain("Phân tích đề");
    expect(r.blanks).toBeUndefined();
  });

  it("W54: bài mẫu nhiều đoạn, mỗi đoạn một dòng; số ô 원고지 theo cấu hình", () => {
    const r = getWritingReveal("topik-ii", "w54-0002")!;
    expect(r.model_answers!.map((m) => m.level)).toEqual([5, 6]);
    const level6 = r.model_answers![1]!;
    expect(level6.text.split("\n")).toHaveLength(4);
    // 4 đoạn: 150/150/182/178 ký tự -> 8 + 8 + 10 + 9 dòng x 20 ô
    expect(level6.char_count).toBe(660);
    expect(level6.manuscript_cells).toBe(700);
  });

  it("KHÔNG gửi metadata nội bộ trong phần tự so sánh", () => {
    for (const id of ["w53-0002", "w54-0002"]) {
      const reveal = getWritingReveal("topik-ii", id);
      const keys = collectKeys(reveal);
      for (const key of FORBIDDEN_KEYS) expect(keys.has(key), `${id} có khoá ${key}`).toBe(false);
    }
    // Chuỗi nằm trong notes_internal của w53-0002
    expect(JSON.stringify(getWritingReveal("topik-ii", "w53-0002"))).not.toContain(
      "Reviewer lưu ý",
    );
  });
});

describe("writing-source: W51–W52 điền chỗ trống (fixture)", () => {
  const options = { contentRoot: FIXTURE_ROOT };

  it("đề W52: passage có ㉠ ㉡, blanks chỉ có nhãn, không có khung ký tự", () => {
    const [p] = listWritingPrompts("topik-ii", "W52", options);
    expect(p).toMatchObject({ id: "w52-0001", type_code: "W52", format: "fill_blanks" });
    expect(p!.passage).toContain("( ㉠ )");
    expect(p!.passage).toContain("( ㉡ )");
    expect(p!.blanks).toEqual([{ label: "㉠" }, { label: "㉡" }]);
    expect(p!.char_limit).toBeUndefined();
    expect(p!.task).toBeUndefined();
    const keys = collectKeys(p);
    for (const key of [...FORBIDDEN_KEYS, ...REVEAL_ONLY_KEYS]) {
      expect(keys.has(key), `có khoá ${key}`).toBe(false);
    }
    const accepted = getWritingReveal("topik-ii", "w52-0001", options)!.blanks![0]!
      .accepted_answers[0]!;
    expect(JSON.stringify(p)).not.toContain(accepted);
  });

  it("tự so sánh W52: đáp án mẫu từng chỗ trống, văn phong, không có bài mẫu", () => {
    const r = getWritingReveal("topik-ii", "w52-0001", options)!;
    expect(r).toMatchObject({ type_code: "W52", format: "fill_blanks", register: "written_plain" });
    expect(r.blanks!.map((b) => b.label)).toEqual(["㉠", "㉡"]);
    for (const b of r.blanks!) {
      expect(b.accepted_answers.length).toBeGreaterThanOrEqual(3);
      expect(b.required_elements_vi.length).toBeGreaterThan(0);
    }
    expect(r.blanks![0]!.rejected_answers[0]).toMatchObject({ text: "집중력이 높아진다" });
    expect(r.blanks![1]!.rejected_answers).toEqual([]);
    expect(r.blanks![0]!.partial_answers.length).toBeGreaterThan(0);
    expect(r.model_answers).toBeUndefined();
    expect(r.required_points).toBeUndefined();
  });

  it("W51 (suy từ W52) được liệt kê cùng W52, W53, W54", () => {
    const root = makeRootWithW51();
    const types = listWritingTypes("topik-ii", { contentRoot: root });
    expect(types.map((t) => t.type_code)).toEqual(["W51", "W52", "W53", "W54"]);
    expect(types[0]).toMatchObject({ format: "fill_blanks", question_count: 1 });
    expect(types[0]!.char_limit).toBeUndefined();
    const r = getWritingReveal("topik-ii", "w51-0001", { contentRoot: root })!;
    expect(r.register).toBe("formal_polite");
  });

  it("file đề lỗi (thiếu bài mẫu) bị bỏ qua, không làm hỏng các đề khác", () => {
    const root = copyFixtures();
    const file = path.join(root, "topik-ii/practice/W53/w53-0001.yaml");
    const broken = readFileSync(file, "utf8").replace(/^model_answers:[\s\S]*?(?=^\S)/m, "");
    writeFileSync(file, broken);
    const ids = listWritingPrompts("topik-ii", "W53", { contentRoot: root }).map((p) => p.id);
    expect(ids).not.toContain("w53-0001");
    expect(listWritingPrompts("topik-ii", "W54", { contentRoot: root })).toHaveLength(1);
  });
});

describe("writing-types: hàm thuần cho client", () => {
  it("re-export countChars: tính cả khoảng trắng, bỏ xuống dòng và khoảng trắng cuối dòng", () => {
    expect(countCharsFromTypes).toBe(countChars);
    expect(countCharsFromTypes("가 나 다")).toBe(5);
    expect(countCharsFromTypes("가나 \n다라")).toBe(4);
    expect(countCharsFromTypes("")).toBe(0);
  });

  it("charLimitStatus: dưới, trong, trên khung (biên thuộc nhóm trong khung)", () => {
    const limit = { min: 200, max: 300 };
    expect(charLimitStatus(0, limit)).toBe("below");
    expect(charLimitStatus(199, limit)).toBe("below");
    expect(charLimitStatus(200, limit)).toBe("within");
    expect(charLimitStatus(300, limit)).toBe("within");
    expect(charLimitStatus(301, limit)).toBe("above");
  });
});
