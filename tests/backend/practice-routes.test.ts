import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { POST } from "@/app/api/practice/check/route";
import { GET } from "@/app/api/practice/questions/route";
import {
  getPracticeQuestion,
  getPracticeQuestions,
  getPracticeTypes,
} from "@/lib/practice/queries";
import { clearPracticeCache } from "@/lib/practice/source";

afterEach(() => clearPracticeCache());

function post(body: unknown, raw = false): Promise<Response> {
  return POST(
    new Request("http://localhost/api/practice/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

async function errorOf(res: Response) {
  return ((await res.json()) as { error: { code: string; message: string } }).error;
}

describe("POST /api/practice/check", () => {
  it("200: đáp án đúng", async () => {
    const res = await post({
      program: "topik-ii",
      questionId: "r10-0001",
      selectedLabel: "③",
      timeSpentMs: 42000,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json).toMatchObject({
      questionId: "r10-0001",
      correct: true,
      correctLabel: "③",
      selectedLabel: "③",
    });
    expect(json.choices).toHaveLength(4);
  });

  it("200: sai và bỏ trống (null)", async () => {
    const wrong = await post({ program: "topik-ii", questionId: "r10-0001", selectedLabel: "①" });
    expect((await wrong.json()).correct).toBe(false);
    const blank = await post({ program: "topik-ii", questionId: "r10-0001", selectedLabel: null });
    expect(blank.status).toBe(200);
    expect((await blank.json()).correct).toBe(false);
  });

  it("400: JSON hỏng, thiếu trường, sai kiểu, thời gian không hợp lệ", async () => {
    const broken = await post("{khong-phai-json", true);
    expect(broken.status).toBe(400);
    expect((await errorOf(broken)).code).toBe("invalid_json");

    for (const body of [
      {},
      { program: "topik-ii", questionId: "r10-0001" }, // thiếu selectedLabel
      { program: "topik-ii", selectedLabel: "①" }, // thiếu questionId
      { program: "topik-ii", questionId: "r10-0001", selectedLabel: 3 },
      { program: "topik-ii", questionId: "r10-0001", selectedLabel: "①", timeSpentMs: -1 },
      { program: "topik-ii", questionId: "r10-0001", selectedLabel: "①", timeSpentMs: 1.5 },
      { program: "", questionId: "r10-0001", selectedLabel: "①" },
      [],
      null,
    ]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("invalid_body");
      expect(err.message.length).toBeGreaterThan(0);
    }
  });

  it("400: nhãn ngoài ①–④ và body quá lớn", async () => {
    const bad = await post({ program: "topik-ii", questionId: "r10-0001", selectedLabel: "⑤" });
    expect(bad.status).toBe(400);
    expect((await errorOf(bad)).code).toBe("invalid_choice");

    const huge = await post({
      program: "topik-ii",
      questionId: "r10-0001",
      selectedLabel: "①",
      pad: "x".repeat(5000),
    });
    expect(huge.status).toBe(400);
  });

  it("404: program hoặc câu không tồn tại", async () => {
    const p = await post({ program: "eps", questionId: "r10-0001", selectedLabel: "①" });
    expect(p.status).toBe(404);
    expect((await errorOf(p)).code).toBe("program_not_found");
    const q = await post({ program: "topik-ii", questionId: "r10-9999", selectedLabel: "①" });
    expect(q.status).toBe(404);
    expect((await errorOf(q)).code).toBe("question_not_found");
  });
});

describe("GET /api/practice/questions", () => {
  const get = (qs: string) => GET(new Request(`http://localhost/api/practice/questions${qs}`));

  it("200: trả PublicQuestion[] không có đáp án", async () => {
    const res = await get("?program=topik-ii&type=R10");
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ id: string }>;
    expect(json.map((q) => q.id)).toEqual(["r10-0001"]);
    const text = JSON.stringify(json);
    for (const key of ['"correct"', '"note_vi"', '"trap"', '"explanation_vi"']) {
      expect(text).not.toContain(key);
    }
  });

  it("400 thiếu tham số; 404 program lạ hoặc dạng chưa có câu", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("?program=topik-ii")).status).toBe(400);
    expect((await get("?program=eps&type=R10")).status).toBe(404);
    expect((await get("?program=topik-ii&type=W53")).status).toBe(404);
    expect((await get("?program=topik-ii&type=R99")).status).toBe(404);
  });
});

describe("practice/queries (hàm 'use cache' cho server component)", () => {
  it("bọc đúng các hàm nguồn", async () => {
    expect(await getPracticeTypes("topik-ii")).toHaveLength(41);
    expect(await getPracticeTypes("topik-ii", "listening")).toHaveLength(20);
    expect((await getPracticeQuestions("topik-ii", "L22")).map((q) => q.id)).toEqual(["l22-0001"]);
    expect((await getPracticeQuestion("topik-ii", "l22-0001"))?.type_code).toBe("L22");
    expect(await getPracticeQuestion("topik-ii", "khong-co")).toBeNull();
  });
});
