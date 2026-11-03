import { describe, expect, it } from "vitest";
import { applyAnswerToProgress } from "@/components/practice/guest-stats";
import { reviewQueue, type ReviewItem } from "./review";

const catalog: ReviewItem[] = [
  { id: "r1", skill: "reading", type_code: "R01", title: "Đọc" },
  { id: "l1", skill: "listening", type_code: "L01", title: "Nghe" },
];
const wrong = applyAnswerToProgress(undefined, {
  program: "topik-ii",
  questionId: "r1",
  type_code: "R01",
  skill: "reading",
  selectedLabel: "①",
  correct: false,
  timeSpentMs: 10,
  answeredAt: 1,
});
describe("sổ câu", () => {
  it("đúng lần mới nhất ra khỏi câu sai, nhưng giữ đánh dấu", () => {
    const marked = { ...wrong, marked: true };
    const corrected = { ...marked, lastCorrect: true };
    expect(reviewQueue(catalog, [marked], { mode: "wrong", skill: "", type: "" })).toHaveLength(1);
    expect(reviewQueue(catalog, [corrected], { mode: "wrong", skill: "", type: "" })).toHaveLength(
      0,
    );
    expect(reviewQueue(catalog, [corrected], { mode: "marked", skill: "", type: "" })).toHaveLength(
      1,
    );
  });
  it("lọc kỹ năng/dạng và bỏ câu không còn trong ngân hàng", () => {
    expect(reviewQueue(catalog, [wrong], { mode: "wrong", skill: "listening", type: "" })).toEqual(
      [],
    );
    expect(reviewQueue(catalog, [wrong], { mode: "wrong", skill: "", type: "L01" })).toEqual([]);
    expect(
      reviewQueue(catalog, [{ ...wrong, questionId: "deleted" }], {
        mode: "wrong",
        skill: "",
        type: "",
      }),
    ).toEqual([]);
  });
});
