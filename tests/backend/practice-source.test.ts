import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPracticeCache,
  getFullQuestion,
  getPublicQuestion,
  listPracticeTypes,
  listPublicQuestions,
} from "@/lib/practice/source";

const REAL_ROOT = path.join(process.cwd(), "content");

const FORBIDDEN_KEYS = [
  "correct",
  "note_vi",
  "trap",
  "explanation_vi",
  "transcript_vi",
  "notes_internal",
  "reviewed_by",
  "reviewed_at",
  "tts_notes",
  "authored_by",
  "correctLabel",
] as const;

function allQuestions() {
  return listPracticeTypes("topik-ii").flatMap((t) => listPublicQuestions("topik-ii", t.type_code));
}

/** Mọi khoá ở mọi cấp của một giá trị JSON. */
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

afterEach(() => clearPracticeCache());

describe("practice/source: dữ liệu thật content/topik-ii", () => {
  it("liệt kê đúng 20 dạng trắc nghiệm (10 Đọc + 10 Nghe), bỏ Viết", () => {
    const all = listPracticeTypes("topik-ii");
    expect(all).toHaveLength(20);
    expect(all.filter((t) => t.skill === "reading")).toHaveLength(10);
    expect(all.filter((t) => t.skill === "listening")).toHaveLength(10);
    expect(all.some((t) => t.type_code.startsWith("W"))).toBe(false);
    expect(all.every((t) => t.question_count >= 1)).toBe(true);
    expect(all.map((t) => t.type_code)).toEqual([...all.map((t) => t.type_code)].sort());
  });

  it("lọc theo kỹ năng và trả tên dạng, nhóm dạng", () => {
    const reading = listPracticeTypes("topik-ii", "reading");
    expect(reading).toHaveLength(10);
    expect(reading.every((t) => t.skill === "reading" && t.type_code.startsWith("R"))).toBe(true);
    const r40 = reading.find((t) => t.type_code === "R40");
    expect(r40).toBeDefined();
    expect(r40!.name_vi.length).toBeGreaterThan(0);
    expect(r40!.type_group).toBe("R39-41");
    expect(r40!.group_name_vi.length).toBeGreaterThan(0);
    expect(listPracticeTypes("topik-ii", "listening")).toHaveLength(10);
  });

  it("program lạ hoặc dạng lạ trả rỗng", () => {
    expect(listPracticeTypes("khong-co")).toEqual([]);
    expect(listPublicQuestions("khong-co", "R10")).toEqual([]);
    expect(listPublicQuestions("topik-ii", "R99")).toEqual([]);
    expect(listPublicQuestions("topik-ii", "W53")).toEqual([]);
    expect(getPublicQuestion("topik-ii", "w53-0002")).toBeUndefined();
  });

  it("câu của một dạng sắp theo id và khớp type_code", () => {
    const qs = listPublicQuestions("topik-ii", "R10");
    expect(qs.map((q) => q.id)).toEqual(["r10-0001"]);
    expect(qs[0]).toMatchObject({
      program: "topik-ii",
      type_code: "R10",
      skill: "reading",
      subskill: "chart_reading",
      difficulty: 4,
      data_is_fictional: true,
    });
    expect(qs[0]!.choices.map((c) => c.label)).toEqual(["①", "②", "③", "④"]);
    expect(qs[0]!.chart_data?.[0]).toMatchObject({ chart_type: "bar", unit: "%" });
    expect(qs[0]!.chart_data?.[0]?.series[0]?.points[0]).toEqual({ x: "휴식", y: 31 });
  });

  it("câu Nghe có transcript_ko, speakers, audio_url null; phương án tranh có image_desc", () => {
    const l01 = getPublicQuestion("topik-ii", "l01-0001")!;
    expect(l01.skill).toBe("listening");
    expect(l01.transcript_ko).toContain("여자:");
    expect(l01.speakers?.map((s) => s.label).sort()).toEqual(["남자", "여자"]);
    expect(l01.audio_url).toBeNull();
    expect(l01.choices.every((c) => c.text === "" && c.image_desc)).toBe(true);
    const l22 = getPublicQuestion("topik-ii", "l22-0001")!;
    expect(l22.group_key).toBe("l21-22-0001");
  });

  it("KHÔNG lộ đáp án, lời giải hay metadata nội bộ trên toàn bộ câu thật", () => {
    const questions = allQuestions();
    expect(questions).toHaveLength(20);
    for (const q of questions) {
      const json = JSON.stringify(q);
      const full = getFullQuestion("topik-ii", q.id)!;
      // Không có khoá nhạy cảm ở bất kỳ cấp nào
      const keys = collectKeys(q);
      for (const key of FORBIDDEN_KEYS) {
        expect(keys.has(key), `${q.id} có khoá ${key}`).toBe(false);
      }
      // Không có nội dung lời giải / ghi chú / bản dịch trong bất kỳ chuỗi nào
      expect(json).not.toContain(full.explanation_vi.slice(0, 40));
      if (full.transcript_vi) expect(json).not.toContain(full.transcript_vi.slice(0, 30));
      for (const c of full.choices) {
        if (c.note_vi) expect(json).not.toContain(c.note_vi.slice(0, 30));
      }
      // Phương án chỉ có đúng các khoá công khai
      for (const c of q.choices) {
        for (const k of Object.keys(c)) {
          expect(["label", "text", "image_desc", "chart_data"]).toContain(k);
        }
      }
    }
  });

  it("getFullQuestion có đúng 1 phương án đúng, khớp correctLabel", () => {
    for (const q of allQuestions()) {
      const full = getFullQuestion("topik-ii", q.id)!;
      expect(full.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(full.choices.find((c) => c.correct)!.label).toBe(full.correctLabel);
    }
    expect(getFullQuestion("topik-ii", "khong-co")).toBeUndefined();
  });
});

describe("practice/source: thư mục tuỳ chỉnh và file lỗi", () => {
  function tempRoot(): string {
    const root = mkdtempSync(path.join(os.tmpdir(), "topikly-practice-"));
    for (const type of ["R10", "R01"]) {
      cpSync(
        path.join(REAL_ROOT, "topik-ii", "practice", type),
        path.join(root, "topik-ii", "practice", type),
        { recursive: true },
      );
    }
    return root;
  }

  it("đọc từ contentRoot truyền vào", () => {
    const root = tempRoot();
    try {
      const types = listPracticeTypes("topik-ii", undefined, { contentRoot: root });
      expect(types.map((t) => t.type_code)).toEqual(["R01", "R10"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("bỏ qua file có lỗi (có console.warn), giữ file tốt", () => {
    const root = tempRoot();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const file = path.join(root, "topik-ii", "practice", "R10", "r10-0001.yaml");
      // Làm hỏng: bỏ nhãn đúng -> không còn đúng 1 đáp án đúng
      writeFileSync(file, readFileSync(file, "utf8").replace("correct: true", "correct: false"));
      const types = listPracticeTypes("topik-ii", undefined, { contentRoot: root });
      expect(types.map((t) => t.type_code)).toEqual(["R01"]);
      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0]![0])).toContain("r10-0001.yaml");
    } finally {
      warn.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("cảnh báo (reviewed_by null) không chặn, nhưng requireReviewed thì chặn", () => {
    const root = tempRoot();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(listPracticeTypes("topik-ii", undefined, { contentRoot: root })).toHaveLength(2);
      clearPracticeCache();
      expect(
        listPracticeTypes("topik-ii", undefined, { contentRoot: root, requireReviewed: true }),
      ).toHaveLength(0);
    } finally {
      warn.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("thư mục không tồn tại trả rỗng", () => {
    const missing = path.join(os.tmpdir(), "topikly-khong-co-thu-muc");
    expect(listPracticeTypes("topik-ii", undefined, { contentRoot: missing })).toEqual([]);
  });
});
