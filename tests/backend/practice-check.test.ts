import { afterEach, describe, expect, it } from "vitest";
import { checkPracticeAnswer } from "@/lib/practice/check";
import { clearPracticeCache, getFullQuestion } from "@/lib/practice/source";
import { CHOICE_LABELS } from "@/lib/practice/types";

afterEach(() => clearPracticeCache());

function ok(request: Parameters<typeof checkPracticeAnswer>[0]) {
  const out = checkPracticeAnswer(request);
  if (!out.ok) throw new Error(`mong đợi ok, nhận ${out.status} ${out.body.error.code}`);
  return out.response;
}

describe("practice/check: chấm đáp án", () => {
  const full = getFullQuestion("topik-ii", "r10-0001")!;
  const correct = full.correctLabel;
  const wrong = CHOICE_LABELS.find((l) => l !== correct)!;

  it("đáp án đúng", () => {
    const r = ok({ program: "topik-ii", questionId: "r10-0001", selectedLabel: correct });
    expect(r.correct).toBe(true);
    expect(r.selectedLabel).toBe(correct);
    expect(r.correctLabel).toBe("③");
    expect(r.explanation_vi).toContain("Đáp án ③");
  });

  it("đáp án sai vẫn trả đáp án đúng và giải thích từng phương án nhiễu", () => {
    const r = ok({ program: "topik-ii", questionId: "r10-0001", selectedLabel: wrong });
    expect(r.correct).toBe(false);
    expect(r.selectedLabel).toBe(wrong);
    expect(r.correctLabel).toBe(correct);
    expect(r.choices.map((c) => c.label)).toEqual(["①", "②", "③", "④"]);
    expect(r.choices.filter((c) => c.correct)).toHaveLength(1);
    for (const c of r.choices.filter((c) => !c.correct)) {
      expect(c.note_vi).toBeTruthy();
      expect(c.trap).toBeTruthy();
      expect(c.trap_name_vi).toBeTruthy(); // tên bẫy lấy từ program.traps
    }
    const detail = r.choices.find((c) => c.trap === "detail_swap")!;
    expect(detail.trap_name_vi).not.toBe("detail_swap");
  });

  it("null (bỏ trống / hết giờ) là sai nhưng vẫn trả đáp án", () => {
    const r = ok({
      program: "topik-ii",
      questionId: "r10-0001",
      selectedLabel: null,
      timeSpentMs: 90_000,
    });
    expect(r.correct).toBe(false);
    expect(r.selectedLabel).toBeNull();
    expect(r.correctLabel).toBe(correct);
  });

  it("câu Nghe trả transcript_vi; câu Đọc thì không", () => {
    const l = ok({ program: "topik-ii", questionId: "l22-0001", selectedLabel: "②" });
    expect(l.correct).toBe(true);
    expect(l.transcript_vi).toContain("Nữ:");
    const r = ok({ program: "topik-ii", questionId: "r10-0001", selectedLabel: "①" });
    expect(r.transcript_vi).toBeUndefined();
  });

  it("nhãn không thuộc ①–④ là 400 invalid_choice", () => {
    for (const bad of ["⑤", "1", "A", "", "② "]) {
      const out = checkPracticeAnswer({
        program: "topik-ii",
        questionId: "r10-0001",
        selectedLabel: bad,
      });
      expect(out.ok).toBe(false);
      if (!out.ok) {
        expect(out.status).toBe(400);
        expect(out.body.error.code).toBe("invalid_choice");
      }
    }
  });

  it("câu không tồn tại hoặc program lạ là 404", () => {
    const q = checkPracticeAnswer({
      program: "topik-ii",
      questionId: "r10-9999",
      selectedLabel: "①",
    });
    expect(q).toMatchObject({ ok: false, status: 404 });
    if (!q.ok) expect(q.body.error.code).toBe("question_not_found");
    const p = checkPracticeAnswer({ program: "eps", questionId: "r10-0001", selectedLabel: "①" });
    expect(p).toMatchObject({ ok: false, status: 404 });
    if (!p.ok) expect(p.body.error.code).toBe("program_not_found");
    // câu Viết không đi qua API trắc nghiệm
    const w = checkPracticeAnswer({
      program: "topik-ii",
      questionId: "w53-0002",
      selectedLabel: "①",
    });
    expect(w).toMatchObject({ ok: false, status: 404 });
  });

  it("chấm đúng mọi câu mẫu: chọn đáp án đúng thì đúng, chọn nhãn khác thì sai", () => {
    for (const id of ["r01-0001", "r47-0001", "l01-0001", "l46-0001"]) {
      const f = getFullQuestion("topik-ii", id)!;
      const right = ok({ program: "topik-ii", questionId: id, selectedLabel: f.correctLabel });
      expect(right.correct).toBe(true);
      const other = CHOICE_LABELS.find((l) => l !== f.correctLabel)!;
      expect(ok({ program: "topik-ii", questionId: id, selectedLabel: other }).correct).toBe(false);
    }
  });
});
