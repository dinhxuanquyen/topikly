import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { GET } from "@/app/api/lexicon/search/route";
import {
  getCompareGroup,
  getCompareGroups,
  getGrammarFacets,
  getGrammarList,
  getGrammarPoint,
  getHanjaFamily,
  getHanjaList,
  getVocabFacets,
  getVocabList,
  getVocabWord,
} from "@/lib/lexicon/queries";
import { clearLexiconCache } from "@/lib/lexicon/source";
import type { LexiconSearchResponse } from "@/lib/lexicon/types";

afterEach(() => clearLexiconCache());

const get = (qs: string) => GET(new Request(`http://localhost/api/lexicon/search${qs}`));

async function errorOf(res: Response) {
  return ((await res.json()) as { error: { code: string; message: string } }).error;
}

describe("GET /api/lexicon/search", () => {
  it("200: tìm cả từ vựng và ngữ pháp, không có metadata nội bộ", async () => {
    const res = await get(`?program=topik-ii&q=${encodeURIComponent("xã hội")}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = (await res.json()) as LexiconSearchResponse;
    expect(json.q).toBe("xã hội");
    expect(json.vocab.map((w) => w.id)).toContain("v-00001");
    const text = JSON.stringify(json);
    for (const key of ['"notes_internal"', '"reviewed_by"', '"level_basis"', '"verification_vi"']) {
      expect(text).not.toContain(key);
    }
    const g = (await (
      await get(`?program=topik-ii&q=${encodeURIComponent("느라고")}`)
    ).json()) as LexiconSearchResponse;
    expect(g.grammar.map((p) => p.slug)).toContain("neula-go");
  });

  it("200: q rỗng trả hai mảng rỗng; limit giới hạn số kết quả", async () => {
    const empty = (await (await get("?program=topik-ii&q=")).json()) as LexiconSearchResponse;
    expect(empty).toEqual({ q: "", vocab: [], grammar: [] });
    const one = (await (
      await get("?program=topik-ii&q=a&limit=1")
    ).json()) as LexiconSearchResponse;
    expect(one.vocab.length).toBeLessThanOrEqual(1);
    expect(one.grammar.length).toBeLessThanOrEqual(1);
  });

  it("400 thiếu tham số, q quá dài, limit sai; 404 program lạ", async () => {
    for (const qs of [
      "",
      "?program=topik-ii",
      "?q=abc",
      `?program=topik-ii&q=${"x".repeat(65)}`,
      "?program=topik-ii&q=a&limit=0",
      "?program=topik-ii&q=a&limit=51",
      "?program=topik-ii&q=a&limit=1.5",
      "?program=topik-ii&q=a&limit=abc",
    ]) {
      const res = await get(qs);
      expect(res.status, qs).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("invalid_query");
      expect(err.message.length).toBeGreaterThan(0);
    }
    const p = await get("?program=eps&q=abc");
    expect(p.status).toBe(404);
    expect((await errorOf(p)).code).toBe("program_not_found");
  });
});

describe("lexicon/queries (hàm 'use cache' cho server component)", () => {
  it("từ vựng: bọc đúng các hàm nguồn, kết quả không có thì null / rỗng", async () => {
    expect((await getVocabFacets("topik-ii"))?.total).toBe(52);
    expect(await getVocabFacets("khong-co")).toBeNull();
    expect(await getVocabList("topik-ii")).toHaveLength(52);
    expect(await getVocabList("topik-ii", { level: 3 })).toHaveLength(22);
    expect((await getVocabWord("topik-ii", "v-00001"))?.word.hangul).toBe("사회");
    expect(await getVocabWord("topik-ii", "khong-co")).toBeNull();
    expect((await getHanjaList("topik-ii")).length).toBeGreaterThan(0);
    expect((await getHanjaFamily("topik-ii", "社"))?.words.length).toBeGreaterThan(0);
    expect(await getHanjaFamily("topik-ii", "龍")).toBeNull();
  });

  it("ngữ pháp: bọc đúng các hàm nguồn", async () => {
    expect((await getGrammarFacets("topik-ii"))?.total).toBe(10);
    expect(await getGrammarFacets("khong-co")).toBeNull();
    expect(await getGrammarList("topik-ii", { function: "cause" })).toHaveLength(3);
    expect((await getGrammarPoint("topik-ii", "neula-go"))?.pattern).toBe("-느라고");
    expect(await getGrammarPoint("topik-ii", "khong-co")).toBeNull();
    expect(await getCompareGroups("topik-ii")).toHaveLength(3);
    expect((await getCompareGroup("topik-ii", "nhuong-bo-cho-du"))?.members).toHaveLength(2);
    expect(await getCompareGroup("topik-ii", "khong-co")).toBeNull();
  });
});
