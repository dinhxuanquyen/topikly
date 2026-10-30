import { describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
import { getPlannerCatalog } from "@/lib/planner/queries";
import { generateDays, type StudyPlan } from "@/lib/planner/plan";
import { getPracticeQuestions } from "@/lib/practice/queries";
import { getVocabWord, getGrammarPoint } from "@/lib/lexicon/queries";
import { getExam } from "@/lib/exam/queries";

describe("Danh mục lộ trình với nội dung thật", () => {
  it("mọi liên kết tồn tại; không đưa Mini Nghe thiếu audio vào kế hoạch và không rò đáp án", async () => {
    const catalog = await getPlannerCatalog("topik-ii");
    expect(catalog.levels.map((level) => level.level)).toEqual([3, 4, 5, 6]);
    expect(catalog.resources.length).toBeGreaterThan(50);
    expect(catalog.resources.some((r) => r.id === "nghe-01")).toBe(false);
    expect(
      catalog.resources.some((r) => r.kind === "practice" && r.title.startsWith("Đọc lời thoại:")),
    ).toBe(true);
    for (const resource of catalog.resources) {
      if (resource.kind === "vocab")
        expect(await getVocabWord("topik-ii", resource.id)).not.toBeNull();
      if (resource.kind === "grammar")
        expect(await getGrammarPoint("topik-ii", resource.href.split("/").at(-1)!)).not.toBeNull();
      if (resource.kind === "practice")
        expect((await getPracticeQuestions("topik-ii", resource.id)).length).toBeGreaterThan(0);
      if (resource.kind === "mini_test")
        expect(await getExam("topik-ii", "mini", resource.id)).not.toBeNull();
    }
    expect(JSON.stringify(catalog)).not.toMatch(
      /is_correct|explanation_vi|sample_answer|notes_internal/,
    );
    const plan: StudyPlan = {
      version: 1,
      program: "topik-ii",
      targetLevel: 4,
      startDate: "2026-10-30",
      examDate: "2026-11-13",
      minutesPerDay: 60,
      weakTypeCodes: ["R10"],
      completed: {},
    };
    expect(generateDays(plan, catalog)[0]!.tasks.at(-1)).toMatchObject({
      id: "R10",
      priority: true,
    });
  });
  it("chương trình chưa cấu hình trả rỗng", async () => {
    expect(await getPlannerCatalog("eps")).toEqual({ levels: [], resources: [] });
  });
});
