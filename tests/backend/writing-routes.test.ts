import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { GET as getPrompts } from "@/app/api/practice/writing/prompts/route";
import { GET as getReveal } from "@/app/api/practice/writing/reveal/route";
import {
  getWritingPromptById,
  getWritingPrompts,
  getWritingTypes,
} from "@/lib/practice/writing-queries";
import { clearWritingCache } from "@/lib/practice/writing-source";

afterEach(() => clearWritingCache());

async function errorOf(res: Response) {
  return ((await res.json()) as { error: { code: string; message: string } }).error;
}

describe("GET /api/practice/writing/prompts", () => {
  const get = (qs: string) =>
    getPrompts(new Request(`http://localhost/api/practice/writing/prompts${qs}`));

  it("200: trả WritingPrompt[] không có bài mẫu, đáp án hay metadata", async () => {
    const res = await get("?program=topik-ii&type=W54");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = (await res.json()) as Array<{ id: string; char_limit: unknown }>;
    expect(json.map((p) => p.id)).toEqual(["w54-0002"]);
    expect(json[0]!.char_limit).toEqual({ min: 600, max: 700 });
    const text = JSON.stringify(json);
    for (const key of [
      '"model_answers"',
      '"required_points"',
      '"explanation_vi"',
      '"scoring_notes_vi"',
      '"common_mistakes_vi"',
      '"expression_bank"',
      '"notes_internal"',
      '"reviewed_by"',
    ]) {
      expect(text).not.toContain(key);
    }
  });

  it("400 thiếu tham số; 404 program lạ hoặc dạng chưa có đề", async () => {
    const missing = await get("");
    expect(missing.status).toBe(400);
    expect((await errorOf(missing)).code).toBe("invalid_query");
    expect((await get("?program=topik-ii")).status).toBe(400);
    const p = await get("?program=eps&type=W53");
    expect(p.status).toBe(404);
    expect((await errorOf(p)).code).toBe("program_not_found");
    const t = await get("?program=topik-ii&type=W55");
    expect(t.status).toBe(404);
    expect((await errorOf(t)).code).toBe("type_not_found");
    expect((await get("?program=topik-ii&type=R10")).status).toBe(404);
  });
});

describe("GET /api/practice/writing/reveal", () => {
  const get = (qs: string) =>
    getReveal(new Request(`http://localhost/api/practice/writing/reveal${qs}`));

  it("200: phần tự so sánh của đề", async () => {
    const res = await get("?program=topik-ii&id=w53-0002");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json).toMatchObject({ id: "w53-0002", type_code: "W53", format: "essay" });
    expect(json.model_answers).toHaveLength(2);
    expect(json.required_points).toHaveLength(3);
    const text = JSON.stringify(json);
    for (const key of ['"notes_internal"', '"reviewed_by"', '"authored_by"']) {
      expect(text).not.toContain(key);
    }
  });

  it("400 thiếu tham số; 404 program lạ hoặc không có đề", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("?program=topik-ii")).status).toBe(400);
    expect((await get("?id=w53-0002")).status).toBe(400);
    const p = await get("?program=eps&id=w53-0002");
    expect(p.status).toBe(404);
    expect((await errorOf(p)).code).toBe("program_not_found");
    const q = await get("?program=topik-ii&id=w53-9999");
    expect(q.status).toBe(404);
    expect((await errorOf(q)).code).toBe("question_not_found");
    // câu trắc nghiệm không phải đề Viết
    expect((await get("?program=topik-ii&id=r10-0001")).status).toBe(404);
  });
});

describe("practice/writing-queries (hàm 'use cache' cho server component)", () => {
  it("bọc đúng các hàm nguồn", async () => {
    expect((await getWritingTypes("topik-ii")).map((t) => t.type_code)).toEqual([
      "W51",
      "W52",
      "W53",
      "W54",
    ]);
    expect((await getWritingPrompts("topik-ii", "W53")).map((p) => p.id)).toEqual(["w53-0002"]);
    expect((await getWritingPromptById("topik-ii", "w54-0002"))?.type_code).toBe("W54");
    expect(await getWritingPromptById("topik-ii", "khong-co")).toBeNull();
    expect(await getWritingTypes("khong-co")).toEqual([]);
  });
});
