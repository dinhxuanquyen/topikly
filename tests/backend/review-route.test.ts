import { describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
import { GET } from "@/app/api/practice/review/route";
import { getReviewCatalog } from "@/lib/practice/queries";

describe("API phiên ôn", () => {
  it("giới hạn 10 câu, từ chối trùng id, sai chương trình và câu không tồn tại", async () => {
    const get = (query: string) =>
      GET(new Request(`http://localhost/api/practice/review?${query}`));
    expect((await get("program=topik-ii")).status).toBe(400);
    expect((await get("program=unknown&id=r10-0001")).status).toBe(404);
    expect((await get("program=topik-ii&id=r10-0001&id=r10-0001")).status).toBe(400);
    expect(
      (await get(`program=topik-ii&${Array.from({ length: 11 }, (_, i) => `id=q${i}`).join("&")}`))
        .status,
    ).toBe(400);
    expect((await get("program=topik-ii&id=missing")).status).toBe(404);
  });
  it("trả đúng thứ tự câu và không lộ đáp án/lời giải", async () => {
    const ids = (await getReviewCatalog("topik-ii"))
      .slice(0, 2)
      .map((q) => q.id)
      .reverse();
    const response = await GET(
      new Request(
        `http://localhost/api/practice/review?program=topik-ii&${ids.map((id) => `id=${id}`).join("&")}`,
      ),
    );
    expect(response.status).toBe(200);
    const questions = await response.json();
    expect(questions.map((q: { id: string }) => q.id)).toEqual(ids);
    expect(JSON.stringify(questions)).not.toMatch(
      /"(correct|correctLabel|explanation_vi|transcript_vi|notes_internal)"/,
    );
  });
});
