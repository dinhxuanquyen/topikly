import { describe, expect, it } from "vitest";
import { TYPE_CODE_REGEX } from "@/lib/db/content-validation";
import {
  findProgram,
  findQuestionType,
  getExamBlueprint,
  getProgram,
  listPrograms,
  SKILLS,
  topikII,
} from "@/lib/db/programs";

describe("topik-ii: cấu hình chương trình", () => {
  it("có cấu trúc đề đúng: 3 phần, số câu, thời gian, điểm tối đa", () => {
    const by = Object.fromEntries(topikII.sections.map((s) => [s.skill, s]));
    expect(by.listening).toMatchObject({ question_count: 50, duration_sec: 3600, max_score: 100 });
    expect(by.writing).toMatchObject({ question_count: 4, duration_sec: 3000, max_score: 100 });
    expect(by.reading).toMatchObject({ question_count: 50, duration_sec: 4200, max_score: 100 });
    expect(topikII.total_max_score).toBe(300);
    expect(topikII.sections.reduce((n, s) => n + s.max_score, 0)).toBe(topikII.total_max_score);
  });

  it("ngưỡng cấp 3–6 là 120/150/190/230 và tăng dần", () => {
    expect(topikII.level_thresholds.map((t) => [t.level, t.min_score])).toEqual([
      [3, 120],
      [4, 150],
      [5, 190],
      [6, 230],
    ]);
  });

  it("có đúng 104 type_code, không trùng, đều khớp regex của spec", () => {
    const codes = topikII.question_types.map((t) => t.code);
    expect(codes).toHaveLength(104);
    expect(new Set(codes).size).toBe(104);
    for (const c of codes) expect(c).toMatch(TYPE_CODE_REGEX);
    expect(codes.filter((c) => c.startsWith("L"))).toHaveLength(50);
    expect(codes.filter((c) => c.startsWith("R"))).toHaveLength(50);
    expect(codes.filter((c) => c.startsWith("W"))).toEqual(["W51", "W52", "W53", "W54"]);
  });

  it("nhóm dạng phủ kín 1–50 (Nghe, Đọc) và 51–54 (Viết), không chồng lặp", () => {
    const cover = (skill: string, from: number, to: number) => {
      const covered: number[] = [];
      for (const g of topikII.type_groups.filter((x) => x.skill === skill)) {
        for (let n = g.range[0]; n <= g.range[1]; n++) covered.push(n);
      }
      const expected = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      expect(covered.sort((a, b) => a - b)).toEqual(expected);
    };
    cover("listening", 1, 50);
    cover("reading", 1, 50);
    cover("writing", 51, 54);
  });

  it("mỗi code thuộc một nhóm hợp lệ và nằm trong khoảng của nhóm đó", () => {
    for (const t of topikII.question_types) {
      const group = topikII.type_groups.find((g) => g.group === t.type_group);
      expect(group, t.code).toBeDefined();
      expect(group!.skill).toBe(t.skill);
      expect(t.range).toEqual(group!.range);
      const n = Number(t.code.slice(1));
      expect(n).toBeGreaterThanOrEqual(t.range[0]);
      expect(n).toBeLessThanOrEqual(t.range[1]);
      expect(t.paired).toBe(group!.paired);
    }
  });

  it("mã nhóm đặt theo spec (R39-41, L21-22, W53…)", () => {
    const groups = topikII.type_groups.map((g) => g.group);
    expect(groups).toContain("R39-41");
    expect(groups).toContain("L21-22");
    expect(groups).toContain("L49-50");
    expect(groups).toContain("W53");
    expect(findQuestionType("topik-ii", "R40")?.type_group).toBe("R39-41");
    expect(findQuestionType("topik-ii", "L22")?.type_group).toBe("L21-22");
  });

  it("các bộ dùng chung ngữ liệu: 15 cặp Nghe, R19–24, R42–47 và bộ ba R48–50", () => {
    const paired = topikII.type_groups.filter((g) => g.paired).map((g) => g.group);
    expect(paired).toEqual([
      ...Array.from({ length: 15 }, (_, i) => `L${21 + i * 2}-${22 + i * 2}`),
      "R19-20",
      "R21-22",
      "R23-24",
      "R42-43",
      "R44-45",
      "R46-47",
      "R48-50",
    ]);
  });

  it("subskill chính nằm trong tập cho phép và trong danh mục subskill", () => {
    const catalog = new Set(topikII.subskills.map((s) => s.code));
    for (const t of topikII.question_types) {
      expect(t.allowed_subskills[0], t.code).toBe(t.subskill);
      for (const s of t.allowed_subskills) expect(catalog.has(s), `${t.code}:${s}`).toBe(true);
      expect(t.typical_difficulty[0]).toBeLessThanOrEqual(t.typical_difficulty[1]);
      expect(t.typical_difficulty[0]).toBeGreaterThanOrEqual(topikII.difficulty_range.min);
      expect(t.typical_difficulty[1]).toBeLessThanOrEqual(topikII.difficulty_range.max);
    }
  });

  it("một số ánh xạ lấy từ bảng taxonomy của spec", () => {
    expect(findQuestionType("topik-ii", "R40")?.subskill).toBe("insert_sentence");
    expect(findQuestionType("topik-ii", "R19")?.subskill).toBe("fill_blank_connector");
    expect(findQuestionType("topik-ii", "L09")?.subskill).toBe("next_action");
    expect(findQuestionType("topik-ii", "L03")?.allowed_subskills).toEqual([
      "chart_reading",
      "detail_match",
    ]);
    expect(findQuestionType("topik-ii", "W52")?.subskill).toBe("expository_completion");
  });

  it("giới hạn ký tự là dữ liệu cấu hình của W53 và W54", () => {
    expect(findQuestionType("topik-ii", "W53")?.char_limit).toEqual({ min: 200, max: 300 });
    expect(findQuestionType("topik-ii", "W54")?.char_limit).toEqual({ min: 600, max: 700 });
    expect(findQuestionType("topik-ii", "W52")?.char_limit).toBeUndefined();
  });

  it("dạng Viết là tự luận, Nghe/Đọc là trắc nghiệm", () => {
    for (const t of topikII.question_types) {
      expect(t.format).toBe(t.skill === "writing" ? "constructed" : "multiple_choice");
    }
  });

  it("danh mục trap có 18 mã không trùng (gồm concession_point)", () => {
    expect(topikII.traps).toHaveLength(18);
    expect(new Set(topikII.traps.map((t) => t.code)).size).toBe(18);
  });
});

describe("topik-ii: cấu trúc đề rút gọn và lệnh nhóm", () => {
  it("Mini Đọc là dữ liệu cấu hình: 20 câu, 30 phút", () => {
    expect(topikII.exam_blueprints.mini?.reading).toEqual({
      question_count: 20,
      duration_sec: 30 * 60,
    });
    expect(getExamBlueprint(topikII, "mini", "reading")).toEqual({
      question_count: 20,
      duration_sec: 1800,
    });
  });

  it("Full (và loại không khai báo) lấy theo sections của chương trình", () => {
    expect(getExamBlueprint(topikII, "full", "reading")).toEqual({
      question_count: 50,
      duration_sec: 70 * 60,
    });
    expect(getExamBlueprint(topikII, "full", "listening")).toEqual({
      question_count: 50,
      duration_sec: 60 * 60,
    });
    expect(getExamBlueprint(topikII, "hard", "reading")?.question_count).toBe(50);
    // Mini chưa khai báo Nghe -> rơi về sections (không bịa số liệu riêng)
    expect(getExamBlueprint(topikII, "mini", "listening")?.question_count).toBe(50);
    expect(getExamBlueprint(topikII, "full", "speaking")).toBeUndefined();
  });

  it("mọi nhóm dạng Đọc có instruction_ko dạng mẫu bắt đầu bằng ※ [{from}~{to}]", () => {
    const reading = topikII.type_groups.filter((g) => g.skill === "reading");
    expect(reading).toHaveLength(18);
    for (const g of reading) {
      expect(g.instruction_ko, g.group).toMatch(/^※ \[\{from\}~\{to\}\] \S/);
    }
  });

  it("lệnh nhóm theo content-spec 4.5; cặp/bộ dùng chung 'đọc và trả lời'", () => {
    const by = (g: string) => topikII.type_groups.find((x) => x.group === g)!;
    expect(by("R39-41").instruction_ko).toBe(
      "※ [{from}~{to}] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오.",
    );
    expect(by("R13-15").instruction_ko).toContain("다음을 순서대로 맞게 배열한 것을 고르십시오.");
    for (const g of topikII.type_groups.filter((x) => x.skill === "reading" && x.paired)) {
      expect(g.instruction_ko).toBe("※ [{from}~{to}] 다음을 읽고 물음에 답하십시오.");
    }
  });

  it("Nghe và Viết chưa có instruction_ko (tuỳ chọn)", () => {
    for (const g of topikII.type_groups.filter((x) => x.skill !== "reading")) {
      expect(g.instruction_ko).toBeUndefined();
    }
  });
});

describe("registry chương trình", () => {
  it("tra theo code; chương trình chưa cấu hình trả undefined / ném lỗi", () => {
    expect(findProgram("topik-ii")).toBe(topikII);
    expect(getProgram("topik-ii")).toBe(topikII);
    expect(findProgram("eps")).toBeUndefined();
    expect(() => getProgram("eps")).toThrow(/chưa cấu hình/);
    expect(listPrograms().map((p) => p.code)).toContain("topik-ii");
  });

  it("kỹ năng khai báo nằm trong danh sách SKILLS", () => {
    for (const t of topikII.question_types) expect(SKILLS).toContain(t.skill);
  });
});
