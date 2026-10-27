import { describe, expect, it } from "vitest";
import {
  audioPlayedFromDraft,
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
import {
  applySelfPoints,
  attemptOf,
  buildWritingPayload,
  countIncompleteWriting,
  hasWritingContent,
  isAnswered,
  listWritingItems,
  numberOfWritingType,
  recordScoreOf,
  sanitizeSelfPoints,
  type ExamResultRecord,
} from "./exam-state";
import { EXAM, RESULT, WRITING_EXAM, WRITING_RESULT } from "./test-fixtures";

describe("cấu trúc đề", () => {
  it("liệt kê khối và câu theo thứ tự làm bài", () => {
    expect(
      listBlocks(EXAM).flatMap((b) => (b.kind === "choice" ? [b.block.type_group] : [])),
    ).toEqual(["R01-2", "R19-20"]);
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
      writing: {},
    });
  });

  it("bản nháp giữ danh sách audio đã phát và lọc id không còn trong đề", () => {
    const draft = buildDraft(EXAM, EMPTY_SESSION, 5_000, 0, 6_000, { "r01-0001": true });
    expect(draft.audioPlayed).toEqual(["r01-0001"]);
    expect(audioPlayedFromDraft(EXAM, draft)).toEqual({ "r01-0001": true });
    expect(
      audioPlayedFromDraft(EXAM, { ...draft, audioPlayed: ["r01-0001", "cu-da-xoa"] }),
    ).toEqual({ "r01-0001": true });
    // Bản nháp cũ (trước khi có trường này) vẫn đọc được.
    const { audioPlayed: _omit, ...legacy } = draft;
    void _omit;
    expect(audioPlayedFromDraft(EXAM, legacy)).toEqual({});
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

describe("đề có phần Viết", () => {
  it("mỗi câu Viết là một khối riêng; số câu hiển thị là số thật 51~54 suy từ type_code", () => {
    const blocks = listBlocks(WRITING_EXAM);
    expect(blocks.map((b) => b.kind)).toEqual(["writing", "writing", "writing", "writing"]);
    expect(listWritingItems(WRITING_EXAM).map((i) => i.number)).toEqual([1, 2, 3, 4]);
    const questions = listQuestions(WRITING_EXAM);
    expect(questions.map((q) => [q.number, q.id, q.kind, q.blockIndex])).toEqual([
      [51, "w51-0001", "writing", 0],
      [52, "w52-0001", "writing", 1],
      [53, "w53-0002", "writing", 2],
      [54, "w54-0001", "writing", 3],
    ]);
    expect(questions[0]!.blankLabels).toEqual(["㉠", "㉡"]);
    expect(questions[2]!.blankLabels).toBeUndefined();
    expect(numberOfWritingType("W54", 4)).toBe(54);
    expect(numberOfWritingType("???", 4)).toBe(4);
  });

  it("câu Viết 'đã làm' khi có nội dung; khoảng trắng không tính; điền một phần tính là chưa đủ", () => {
    const questions = listQuestions(WRITING_EXAM);
    let s = sessionReducer(EMPTY_SESSION, { type: "write-text", id: "w53-0002", text: "   \n " });
    expect(countAnswered(questions, s)).toBe(0);
    expect(firstUnanswered(questions, s)?.id).toBe("w51-0001");

    s = sessionReducer(s, { type: "write-text", id: "w53-0002", text: "글" });
    s = sessionReducer(s, { type: "write-blank", id: "w51-0001", label: "㉠", text: "답" });
    expect(countAnswered(questions, s)).toBe(2);
    expect(isAnswered(questions[0]!, s)).toBe(true);
    expect(countIncompleteWriting(questions, s)).toBe(1);

    s = sessionReducer(s, { type: "write-blank", id: "w51-0001", label: "㉡", text: "답2" });
    expect(countIncompleteWriting(questions, s)).toBe(0);
    s = sessionReducer(s, { type: "write-blank", id: "w52-0001", label: "㉡", text: "답" });
    expect(countIncompleteWriting(questions, s)).toBe(1);
  });

  it("reducer Viết không đổi tham chiếu khi nội dung không đổi; câu đánh dấu tính cả câu Viết", () => {
    const a = sessionReducer(EMPTY_SESSION, { type: "write-text", id: "w53-0002", text: "x" });
    expect(sessionReducer(a, { type: "write-text", id: "w53-0002", text: "x" })).toBe(a);
    const b = sessionReducer(a, { type: "write-blank", id: "w51-0001", label: "㉠", text: "y" });
    expect(sessionReducer(b, { type: "write-blank", id: "w51-0001", label: "㉠", text: "y" })).toBe(
      b,
    );
    const marked = sessionReducer(b, { type: "toggle-mark", id: "w54-0001" });
    expect(countMarked(listQuestions(WRITING_EXAM), marked)).toBe(1);
    expect(hasWritingContent(undefined)).toBe(false);
    expect(hasWritingContent({ blanks: { "㉠": " " } })).toBe(false);
  });

  it("body nộp bài: answers rỗng, writing đủ mọi câu theo hình dạng (essay { text }, điền chỗ trống { blanks })", () => {
    let s = sessionReducer(EMPTY_SESSION, { type: "write-text", id: "w53-0002", text: "bài" });
    s = sessionReducer(s, { type: "write-blank", id: "w51-0001", label: "㉡", text: "câu hai" });
    const request = buildSubmitRequest(WRITING_EXAM, s, 1_000, 61_000, false);
    expect(request.answers).toEqual({});
    expect(request.writing).toEqual({
      "w51-0001": { blanks: { "㉠": "", "㉡": "câu hai" } },
      "w52-0001": { blanks: { "㉠": "", "㉡": "" } },
      "w53-0002": { text: "bài" },
      "w54-0001": { text: "" },
    });
    expect(request).toMatchObject({ examId: "viet-01", timeSpentMs: 60_000, timedOut: false });
  });

  it("đề trắc nghiệm không gửi trường writing", () => {
    const request = buildSubmitRequest(EXAM, EMPTY_SESSION, 1, 2, false);
    expect(request).not.toHaveProperty("writing");
    expect(buildWritingPayload(EXAM, EMPTY_SESSION)).toBeUndefined();
  });

  it("bản nháp lưu và khôi phục bài Viết, lọc câu/nhãn lạ và cắt quá giới hạn", () => {
    let s = sessionReducer(EMPTY_SESSION, { type: "write-text", id: "w53-0002", text: "bài viết" });
    s = sessionReducer(s, { type: "write-blank", id: "w51-0001", label: "㉠", text: "đáp án" });
    const draft = buildDraft(WRITING_EXAM, s, 1, 2, 3);
    expect(draft.writing).toEqual(s.writing);
    expect(sessionFromDraft(WRITING_EXAM, draft)).toEqual({
      answers: {},
      marked: {},
      writing: {
        "w51-0001": { blanks: { "㉠": "đáp án" } },
        "w53-0002": { text: "bài viết" },
      },
    });

    const dirty = {
      ...draft,
      writing: {
        "w53-0002": { text: "x".repeat(6000) },
        "w51-0001": { blanks: { "㉠": "a", "㉢": "lạ", "㉡": 5 as unknown as string } },
        "cu-da-xoa": { text: "bỏ" },
        "w54-0001": { blanks: { "㉠": "sai hình dạng" } },
      },
    };
    const restored = sessionFromDraft(WRITING_EXAM, dirty).writing;
    expect(restored["w53-0002"]!.text).toHaveLength(5000);
    expect(restored["w51-0001"]).toEqual({ blanks: { "㉠": "a" } });
    expect(restored).not.toHaveProperty("cu-da-xoa");
    expect(restored).not.toHaveProperty("w54-0001");
  });

  it("bản nháp đề trắc nghiệm giữ nguyên hình dạng cũ (không có trường writing)", () => {
    expect(buildDraft(EXAM, EMPTY_SESSION, 1, 0, 2)).not.toHaveProperty("writing");
  });
});

describe("điểm tự chấm Viết trong bản ghi kết quả", () => {
  it("sanitizeSelfPoints chỉ giữ id câu Viết của kết quả, làm tròn và kẹp theo max_points", () => {
    expect(
      sanitizeSelfPoints(WRITING_RESULT, {
        "w51-0001": 7.6,
        "w53-0002": 99,
        "w54-0001": -3,
        "w52-0001": "x",
        "cu-da-xoa": 5,
      }),
    ).toEqual({ "w51-0001": 8, "w53-0002": 30, "w54-0001": 0 });
    expect(sanitizeSelfPoints(RESULT, { a: 1 })).toEqual({});
    expect(sanitizeSelfPoints(WRITING_RESULT, null)).toEqual({});
  });

  it("recordScoreOf: chưa tự chấm thì chờ; đã tự chấm thì điểm Viết /100 và cấp ước lượng", () => {
    expect(recordScoreOf(WRITING_RESULT)).toMatchObject({
      score: 0,
      maxScore: 0,
      levelLabel: "",
      writingPending: true,
    });
    const scored = recordScoreOf(WRITING_RESULT, {
      "w51-0001": 10,
      "w52-0001": 10,
      "w53-0002": 20,
      "w54-0001": 30,
    });
    // 70/100 -> 210/300 -> 5급
    expect(scored).toMatchObject({
      score: 70,
      maxScore: 100,
      levelLabel: "5급",
      isEstimate: true,
      selfScored: true,
    });
    expect(scored.writingPending).toBeUndefined();
    // Đề không có Viết: không đổi.
    expect(recordScoreOf(RESULT)).toEqual({
      score: 50,
      maxScore: 100,
      levelLabel: "3급",
      isEstimate: true,
    });
  });

  it("toResultRecord kèm điểm tự chấm; applySelfPoints cập nhật đúng lần nộp và tính lại tóm tắt", () => {
    const record = toResultRecord(WRITING_RESULT);
    expect(record).toMatchObject({ examId: "viet-01", selfPoints: {}, writingPending: true });
    const rows: ExamResultRecord[] = [
      { ...toResultRecord({ ...WRITING_RESULT, submittedAt: 1 }), id: 1 },
      { ...record, id: 2 },
    ];
    const updated = applySelfPoints(rows, WRITING_RESULT, { "w53-0002": 30, "w54-0001": 50 });
    expect(updated).toMatchObject({
      id: 2,
      submittedAt: WRITING_RESULT.submittedAt,
      selfPoints: { "w53-0002": 30, "w54-0001": 50 },
      score: 80,
      maxScore: 100,
      levelLabel: "6급",
      selfScored: true,
    });
    expect(updated).not.toHaveProperty("writingPending");
    // Xoá hết điểm -> quay lại trạng thái chờ.
    const cleared = applySelfPoints([updated!], WRITING_RESULT, {});
    expect(cleared).toMatchObject({ writingPending: true, selfPoints: {} });
    expect(cleared).not.toHaveProperty("selfScored");
    // Không có lần nộp đó / đề không có Viết.
    expect(applySelfPoints([], WRITING_RESULT, {})).toBeNull();
    expect(applySelfPoints([{ ...toResultRecord(RESULT), id: 1 }], RESULT, {})).toBeNull();
  });

  it("attemptOf trả kết quả kèm điểm tự chấm đã lọc", () => {
    const row = { ...toResultRecord(WRITING_RESULT, { "w51-0001": 4 }), id: 1 };
    expect(attemptOf(row)).toEqual({ result: WRITING_RESULT, selfPoints: { "w51-0001": 4 } });
    expect(attemptOf({ ...toResultRecord(RESULT), id: 2 }).selfPoints).toEqual({});
  });

  it("summarizeStatuses chuyển cờ tự chấm / chờ tự chấm của lần gần nhất", () => {
    const base = { examId: "viet-01", maxScore: 0, levelLabel: "", isEstimate: true, score: 0 };
    const pending = summarizeStatuses([], [{ ...base, submittedAt: 5, writingPending: true }]);
    expect(pending["viet-01"]!.latest).toMatchObject({ writingPending: true });
    const scored = summarizeStatuses(
      [],
      [
        { ...base, submittedAt: 5, writingPending: true },
        { ...base, submittedAt: 9, score: 70, maxScore: 100, levelLabel: "5급", selfScored: true },
      ],
    );
    expect(scored["viet-01"]!.latest).toMatchObject({ selfScored: true, score: 70 });
    expect(scored["viet-01"]!.latest).not.toHaveProperty("writingPending");
  });
});
