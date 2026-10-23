import { describe, expect, it } from "vitest";
import {
  buildDraft,
  buildSubmitRequest,
  clampBlockIndex,
  countAnswered,
  countMarked,
  EMPTY_SESSION,
  firstUnanswered,
  listBlocks,
  listQuestions,
  practiceHrefForGroup,
  ratePercent,
  remainingMs,
  sessionFromDraft,
  sessionReducer,
  summarizeStatuses,
  timeWarning,
  toMinutes,
  toResultRecord,
} from "./exam-state";
import { EXAM, RESULT } from "./test-fixtures";

describe("cấu trúc đề", () => {
  it("liệt kê khối và câu theo thứ tự làm bài", () => {
    expect(listBlocks(EXAM).map((b) => b.block.type_group)).toEqual(["R01-2", "R19-20"]);
    const questions = listQuestions(EXAM);
    expect(questions.map((q) => [q.number, q.id, q.blockIndex])).toEqual([
      [1, "r01-0001", 0],
      [2, "r03-0001", 0],
      [3, "r19-0001", 1],
      [4, "r20-0001", 1],
    ]);
  });

  it("clampBlockIndex giữ chỉ số trong khoảng hợp lệ", () => {
    expect(clampBlockIndex(EXAM, -3)).toBe(0);
    expect(clampBlockIndex(EXAM, 99)).toBe(1);
    expect(clampBlockIndex(EXAM, Number.NaN)).toBe(0);
  });
});

describe("sessionReducer", () => {
  it("chọn, đổi, bỏ chọn và đánh dấu", () => {
    let s = sessionReducer(EMPTY_SESSION, { type: "select", id: "a", label: "①" });
    expect(s.answers).toEqual({ a: "①" });
    s = sessionReducer(s, { type: "select", id: "a", label: "③" });
    expect(s.answers).toEqual({ a: "③" });
    s = sessionReducer(s, { type: "toggle-mark", id: "a" });
    expect(s.marked).toEqual({ a: true });
    s = sessionReducer(s, { type: "clear", id: "a" });
    expect(s.answers).toEqual({});
    expect(s.marked).toEqual({ a: true });
    s = sessionReducer(s, { type: "toggle-mark", id: "a" });
    expect(s.marked).toEqual({});
  });

  it("không đổi tham chiếu khi không có thay đổi", () => {
    const s = sessionReducer(EMPTY_SESSION, { type: "select", id: "a", label: "①" });
    expect(sessionReducer(s, { type: "select", id: "a", label: "①" })).toBe(s);
    expect(sessionReducer(s, { type: "clear", id: "khong-co" })).toBe(s);
  });

  it("đếm câu đã làm, đã đánh dấu và tìm câu chưa làm đầu tiên", () => {
    const questions = listQuestions(EXAM);
    let s = sessionReducer(EMPTY_SESSION, { type: "select", id: "r01-0001", label: "②" });
    s = sessionReducer(s, { type: "toggle-mark", id: "r20-0001" });
    s = sessionReducer(s, { type: "toggle-mark", id: "khong-thuoc-de" });
    expect(countAnswered(questions, s)).toBe(1);
    expect(countMarked(questions, s)).toBe(1);
    expect(firstUnanswered(questions, s)?.id).toBe("r03-0001");
  });
});

describe("thời gian", () => {
  it("remainingMs tính từ startedAt và không âm", () => {
    expect(remainingMs(1_000, 900, 1_000)).toBe(900_000);
    expect(remainingMs(1_000, 900, 601_000)).toBe(300_000);
    expect(remainingMs(1_000, 900, 5_000_000)).toBe(0);
  });

  it("mức cảnh báo 5 phút / 1 phút / hết giờ; đề ngắn không phát cảnh báo thừa", () => {
    expect(timeWarning(301_000, 900)).toBe("none");
    expect(timeWarning(300_000, 900)).toBe("five");
    expect(timeWarning(61_000, 900)).toBe("five");
    expect(timeWarning(60_000, 900)).toBe("one");
    expect(timeWarning(0, 900)).toBe("over");
    expect(timeWarning(200_000, 300)).toBe("none");
    expect(timeWarning(60_000, 60)).toBe("none");
  });

  it("toMinutes làm tròn lên", () => {
    expect(toMinutes(900)).toBe(15);
    expect(toMinutes(901)).toBe(16);
  });
});

describe("body nộp bài và bản nháp", () => {
  it("câu chưa chọn là null, thời gian làm bài bị chặn ở thời lượng đề", () => {
    const session = sessionReducer(EMPTY_SESSION, { type: "select", id: "r03-0001", label: "④" });
    const request = buildSubmitRequest(EXAM, session, 1_000, 1_000 + 2_000_000, true);
    expect(request).toEqual({
      program: "topik-ii",
      kind: "mini",
      examId: "doc-01",
      answers: { "r01-0001": null, "r03-0001": "④", "r19-0001": null, "r20-0001": null },
      startedAt: 1_000,
      timeSpentMs: 900_000,
      timedOut: true,
    });
    // Không có đáp án đúng ở bất cứ đâu trong body.
    expect(JSON.stringify(request)).not.toMatch(/correct|explanation/);
  });

  it("bản nháp khứ hồi: lọc câu không còn trong đề và nhãn không hợp lệ", () => {
    let session = sessionReducer(EMPTY_SESSION, { type: "select", id: "r01-0001", label: "②" });
    session = sessionReducer(session, { type: "toggle-mark", id: "r19-0001" });
    const draft = buildDraft(EXAM, session, 5_000, 1, 6_000);
    expect(draft).toMatchObject({
      key: "topik-ii:mini:doc-01",
      group: "topik-ii:mini",
      startedAt: 5_000,
      blockIndex: 1,
      marked: ["r19-0001"],
    });
    expect(sessionFromDraft(EXAM, draft)).toEqual(session);

    const dirty = {
      ...draft,
      answers: { "r01-0001": "②", "r20-0001": "⑤", "cu-da-xoa": "①" },
      marked: ["r19-0001", "cu-da-xoa"],
    };
    expect(sessionFromDraft(EXAM, dirty)).toEqual({
      answers: { "r01-0001": "②" },
      marked: { "r19-0001": true },
    });
  });
});

describe("tình trạng chế độ khách", () => {
  it("gộp bản nháp và các lần làm theo examId; lần gần nhất theo submittedAt", () => {
    const base = { score: 0, maxScore: 100, levelLabel: "Chưa đạt cấp", isEstimate: true };
    const statuses = summarizeStatuses(
      [{ examId: "doc-02" }],
      [
        { ...base, examId: "doc-01", submittedAt: 100, score: 40 },
        { ...base, examId: "doc-01", submittedAt: 300, score: 70, levelLabel: "3급" },
        { ...base, examId: "doc-01", submittedAt: 200, score: 55 },
      ],
    );
    expect(statuses["doc-01"]).toEqual({
      draft: false,
      attempts: 3,
      latest: { score: 70, maxScore: 100, levelLabel: "3급", isEstimate: true, submittedAt: 300 },
    });
    expect(statuses["doc-02"]).toEqual({ draft: true, attempts: 0 });
  });

  it("toResultRecord giữ khoá và điểm để tra nhanh", () => {
    expect(toResultRecord(RESULT)).toMatchObject({
      examKey: "topik-ii:mini:doc-01",
      group: "topik-ii:mini",
      score: 50,
      maxScore: 100,
      levelLabel: "3급",
      isEstimate: true,
    });
  });
});

describe("hiển thị", () => {
  it("ratePercent làm tròn và an toàn khi tổng bằng 0", () => {
    expect(ratePercent(1, 3)).toBe(33);
    expect(ratePercent(2, 3)).toBe(67);
    expect(ratePercent(0, 0)).toBe(0);
  });

  it("link luyện dạng: dạng đầu tiên có câu luyện, đúng slug kỹ năng", () => {
    expect(practiceHrefForGroup("topik-ii", ["R01", "R02"])).toBe("/topik-ii/luyen-tap/doc/R01");
    expect(practiceHrefForGroup("topik-ii", ["R01", "R02"], new Set(["R02"]))).toBe(
      "/topik-ii/luyen-tap/doc/R02",
    );
    expect(practiceHrefForGroup("topik-ii", ["L22"])).toBe("/topik-ii/luyen-tap/nghe/L22");
    expect(practiceHrefForGroup("topik-ii", ["R01"], new Set())).toBeNull();
    expect(practiceHrefForGroup("topik-ii", [])).toBeNull();
  });
});
