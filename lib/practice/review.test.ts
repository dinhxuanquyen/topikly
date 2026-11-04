import { describe, expect, it } from "vitest";
import { applyAnswerToProgress } from "@/components/practice/guest-stats";
import { examReviewQueue, reviewQueue, type ReviewItem } from "./review";
import { RESULT } from "@/components/exam/test-fixtures";
import { toResultRecord } from "@/components/exam/exam-state";

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

it("gom câu sai từ đề, ưu tiên lần nộp mới nhất và bỏ câu đã ôn đúng sau đó", () => {
  const q = { ...RESULT.questions[0]!, questionId: "r1", correct: false, number: 3 };
  const wrongExam = toResultRecord({ ...RESULT, submittedAt: 20, questions: [q] });
  const correctExam = toResultRecord({
    ...RESULT,
    submittedAt: 30,
    questions: [{ ...q, correct: true }],
  });
  const answer = {
    program: "topik-ii",
    questionId: "r1",
    type_code: "R01",
    skill: "reading" as const,
    selectedLabel: "①",
    correct: true,
    timeSpentMs: 1,
    answeredAt: 10,
  };
  const history = { exams: [wrongExam], answers: [answer], progress: [{ ...wrong, marked: true }] };
  const filter = { skill: "", type: "" };
  expect(examReviewQueue(catalog, history, filter)).toMatchObject([
    { id: "r1", examNumber: 3, marked: true },
  ]);
  expect(examReviewQueue(catalog, history, { ...filter, skill: "listening" })).toEqual([]);
  expect(examReviewQueue(catalog, { ...history, exams: [correctExam, wrongExam] }, filter)).toEqual(
    [],
  );
  expect(
    examReviewQueue(catalog, { ...history, answers: [{ ...answer, answeredAt: 40 }] }, filter),
  ).toEqual([]);
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
