import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { POST } from "@/app/api/exam/submit/route";
import { getExam, getExams } from "@/lib/exam/queries";
import { clearExamCache } from "@/lib/exam/source";
import { clearPracticeCache } from "@/lib/practice/source";
import type { ExamApiErrorBody, ExamResult } from "@/lib/exam/types";

afterEach(() => {
  clearExamCache();
  clearPracticeCache();
});

/** Nhãn đúng của doc-01 theo thứ tự câu. */
const CORRECT: Record<string, string> = {
  "r01-0001": "②",
  "r03-0001": "④",
  "r07-0001": "①",
  "r10-0001": "③",
  "r14-0001": "②",
  "r17-0001": "④",
  "r26-0001": "①",
  "r35-0001": "③",
  "r40-0001": "②",
};

function post(body: unknown, raw = false): Promise<Response> {
  return POST(
    new Request("http://localhost/api/exam/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

const base = { program: "topik-ii", kind: "mini", examId: "doc-01" };

async function errorOf(res: Response) {
  return ((await res.json()) as ExamApiErrorBody).error;
}

describe("POST /api/exam/submit", () => {
  it("200: đúng hết -> ExamResult đầy đủ, no-store", async () => {
    const res = await post({
      ...base,
      answers: CORRECT,
      startedAt: 1_700_000_000_000,
      timeSpentMs: 600_000,
      timedOut: false,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const r = (await res.json()) as ExamResult;
    expect(r).toMatchObject({
      examId: "doc-01",
      program: "topik-ii",
      kind: "mini",
      title: "Mini test Đọc 01 (đề mẫu)",
      timeSpentMs: 600_000,
      timedOut: false,
      total_score: 100,
      total_max_score: 100,
    });
    expect(r.sections).toEqual([
      { skill: "reading", correct: 9, total: 9, unanswered: 0, score: 100, max_score: 100 },
    ]);
    expect(r.level).toMatchObject({ level: 6, compared_score: 300, is_estimate: true });
    expect(r.questions).toHaveLength(9);
    expect(r.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(r.questions[0]).toMatchObject({
      questionId: "r01-0001",
      correct: true,
      correctLabel: "②",
      type_group: "R01-2",
    });
    expect(r.questions[0]!.explanation_vi.length).toBeGreaterThan(0);
    expect(r.by_type_group).toHaveLength(9);
    expect(r.by_subskill.length).toBeGreaterThan(0);
    expect(typeof r.submittedAt).toBe("number");
  });

  it("200: bỏ trống và sai; câu thiếu khoá hay null đều tính bỏ trống", async () => {
    const res = await post({
      ...base,
      answers: { "r01-0001": "①", "r03-0001": null, "r07-0001": "①" },
      timedOut: true,
    });
    expect(res.status).toBe(200);
    const r = (await res.json()) as ExamResult;
    expect(r.timedOut).toBe(true);
    expect(r.sections[0]).toMatchObject({ correct: 1, total: 9, unanswered: 7 });
    expect(r.questions.find((q) => q.questionId === "r01-0001")).toMatchObject({
      correct: false,
      selectedLabel: "①",
      correctLabel: "②",
    });
    expect(r.level.level).toBeNull();
  });

  it("200: answers rỗng và khoá lạ bị bỏ qua", async () => {
    const empty = await post({ ...base, answers: {} });
    expect(empty.status).toBe(200);
    expect(((await empty.json()) as ExamResult).total_score).toBe(0);
    const extra = await post({ ...base, answers: { ...CORRECT, "r99-9999": "①" } });
    expect(((await extra.json()) as ExamResult).total_score).toBe(100);
  });

  it("400: JSON hỏng, thiếu trường, sai kiểu, kind lạ, thời gian không hợp lệ", async () => {
    const broken = await post("{khong-phai-json", true);
    expect(broken.status).toBe(400);
    expect((await errorOf(broken)).code).toBe("invalid_json");

    for (const body of [
      {},
      { program: "topik-ii", kind: "mini", examId: "doc-01" }, // thiếu answers
      { program: "topik-ii", kind: "mini", answers: {} }, // thiếu examId
      { ...base, answers: [] },
      { ...base, answers: { "r01-0001": 2 } },
      { ...base, kind: "khong-co", answers: {} },
      { ...base, answers: {}, timeSpentMs: -1 },
      { ...base, answers: {}, timeSpentMs: 1.5 },
      { ...base, answers: {}, timedOut: "co" },
      { ...base, program: "", answers: {} },
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
    const bad = await post({ ...base, answers: { ...CORRECT, "r10-0001": "⑤" } });
    expect(bad.status).toBe(400);
    const err = await errorOf(bad);
    expect(err.code).toBe("invalid_choice");
    expect(err.message).toContain("r10-0001");

    const huge = await post({ ...base, answers: {}, pad: "x".repeat(20_000) });
    expect(huge.status).toBe(400);
    expect((await errorOf(huge)).code).toBe("invalid_body");
  });

  it("400: quá nhiều đáp án", async () => {
    const answers = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`q${i}`, null]));
    const res = await post({ ...base, answers });
    expect(res.status).toBe(400);
  });

  it("404: program lạ hoặc đề không tồn tại", async () => {
    const p = await post({ ...base, program: "eps", answers: {} });
    expect(p.status).toBe(404);
    expect((await errorOf(p)).code).toBe("program_not_found");
    const e = await post({ ...base, examId: "doc-99", answers: {} });
    expect(e.status).toBe(404);
    expect((await errorOf(e)).code).toBe("exam_not_found");
    const k = await post({ ...base, kind: "full", answers: {} });
    expect(k.status).toBe(404);
    expect((await errorOf(k)).code).toBe("exam_not_found");
  });
});

describe("exam/queries (hàm 'use cache' cho server component)", () => {
  it("getExams bọc listExams", async () => {
    const all = await getExams("topik-ii");
    expect(all.map((e) => e.id)).toEqual(["doc-01"]);
    expect(await getExams("topik-ii", "mini")).toHaveLength(1);
    expect(await getExams("topik-ii", "full")).toEqual([]);
    expect(await getExams("eps")).toEqual([]);
  });

  it("getExam trả PublicExam không đáp án, hoặc null", async () => {
    const exam = await getExam("topik-ii", "mini", "doc-01");
    expect(exam?.sections[0]?.blocks).toHaveLength(9);
    const text = JSON.stringify(exam);
    for (const key of ['"correct"', '"note_vi"', '"trap"', '"explanation_vi"']) {
      expect(text).not.toContain(key);
    }
    expect(await getExam("topik-ii", "mini", "khong-co")).toBeNull();
    expect(await getExam("topik-ii", "full", "doc-01")).toBeNull();
  });
});
