import { describe, expect, it } from "vitest";
import type { CheckResponse } from "@/lib/practice/types";
import type { ProgressRecord } from "./guest-stats";
import {
  formatClock,
  INITIAL_QUESTION,
  navStatus,
  questionState,
  runnerReducer,
  type RunnerState,
} from "./practice-state";

const LABELS = ["①", "②", "③", "④"];

function result(partial: Partial<CheckResponse> = {}): CheckResponse {
  return {
    questionId: "q1",
    correct: true,
    selectedLabel: "③",
    correctLabel: "③",
    explanation_vi: "**Đáp án ③.**",
    choices: [],
    ...partial,
  };
}

function progress(partial: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    key: "topik-ii:q1",
    program: "topik-ii",
    questionId: "q1",
    type_code: "R10",
    skill: "reading",
    answered: true,
    lastSelected: "③",
    lastCorrect: true,
    marked: false,
    updatedAt: 1,
    ...partial,
  };
}

describe("runnerReducer", () => {
  it("chọn đáp án rồi nộp: submitting -> done, khoá lựa chọn", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "select", id: "q1", label: "③" });
    state = runnerReducer(state, { type: "submit-start", id: "q1" });
    expect(questionState(state, "q1").phase).toBe("submitting");

    // đang chấm / đã chấm thì không đổi được lựa chọn
    state = runnerReducer(state, { type: "select", id: "q1", label: "①" });
    expect(questionState(state, "q1").selected).toBe("③");

    state = runnerReducer(state, { type: "submit-ok", id: "q1", result: result() });
    const q = questionState(state, "q1");
    expect(q.phase).toBe("done");
    expect(q.result?.correct).toBe(true);
    state = runnerReducer(state, { type: "select", id: "q1", label: "②" });
    expect(questionState(state, "q1").selected).toBe("③");
  });

  it("lỗi mạng: quay về answering, giữ lựa chọn và báo lỗi, cho nộp lại", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "select", id: "q1", label: "②" });
    state = runnerReducer(state, { type: "submit-start", id: "q1" });
    state = runnerReducer(state, { type: "submit-fail", id: "q1", message: "Mất mạng" });
    const q = questionState(state, "q1");
    expect(q).toMatchObject({ phase: "answering", selected: "②", error: "Mất mạng" });
    state = runnerReducer(state, { type: "submit-start", id: "q1" });
    expect(questionState(state, "q1").error).toBeNull();
  });

  it("đồng hồ chỉ chạy khi đang làm", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "tick", id: "q1", ms: 1000 });
    state = runnerReducer(state, { type: "tick", id: "q1", ms: 1000 });
    expect(questionState(state, "q1").spentMs).toBe(2000);
    state = runnerReducer(state, { type: "select", id: "q1", label: "③" });
    state = runnerReducer(state, { type: "submit-start", id: "q1" });
    state = runnerReducer(state, { type: "tick", id: "q1", ms: 1000 });
    expect(questionState(state, "q1").spentMs).toBe(2000);
  });

  it("làm lại: xoá lựa chọn, kết quả, đồng hồ; giữ cờ đánh dấu", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "toggle-mark", id: "q1" });
    state = runnerReducer(state, { type: "select", id: "q1", label: "③" });
    state = runnerReducer(state, { type: "submit-start", id: "q1" });
    state = runnerReducer(state, { type: "submit-ok", id: "q1", result: result() });
    state = runnerReducer(state, { type: "retry", id: "q1" });
    expect(questionState(state, "q1")).toEqual({ ...INITIAL_QUESTION, marked: true });
  });

  it("không cho 'làm lại' khi đang làm dở", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "select", id: "q1", label: "③" });
    const after = runnerReducer(state, { type: "retry", id: "q1" });
    expect(questionState(after, "q1").selected).toBe("③");
  });

  it("xác nhận nộp trống: bật/tắt cờ, bị xoá khi chọn đáp án", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "ask-confirm-empty", id: "q1" });
    expect(questionState(state, "q1").confirmEmpty).toBe(true);
    state = runnerReducer(state, { type: "select", id: "q1", label: "①" });
    expect(questionState(state, "q1").confirmEmpty).toBe(false);
  });

  it("câu độc lập với nhau", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "select", id: "q1", label: "①" });
    state = runnerReducer(state, { type: "select", id: "q2", label: "④" });
    expect(questionState(state, "q1").selected).toBe("①");
    expect(questionState(state, "q2").selected).toBe("④");
  });
});

describe("runnerReducer: nạp tiến độ khách", () => {
  it("câu đã làm được khôi phục (restored) với lựa chọn và kết quả cũ", () => {
    const state = runnerReducer(
      {},
      {
        type: "load-progress",
        records: [progress({ lastCorrect: false, lastSelected: "②" })],
        labels: LABELS,
      },
    );
    expect(questionState(state, "q1")).toMatchObject({
      phase: "restored",
      selected: "②",
      restoredCorrect: false,
    });
    expect(navStatus(questionState(state, "q1"))).toBe("wrong");
  });

  it("không ghi đè câu người học đã bắt đầu chọn", () => {
    let state: RunnerState = {};
    state = runnerReducer(state, { type: "select", id: "q1", label: "④" });
    state = runnerReducer(state, { type: "load-progress", records: [progress()], labels: LABELS });
    expect(questionState(state, "q1")).toMatchObject({ phase: "answering", selected: "④" });
  });

  it("chỉ đánh dấu (chưa làm): giữ phase answering, bật cờ marked", () => {
    const state = runnerReducer(
      {},
      {
        type: "load-progress",
        records: [
          progress({ answered: false, lastSelected: null, lastCorrect: null, marked: true }),
        ],
        labels: LABELS,
      },
    );
    expect(questionState(state, "q1")).toMatchObject({ phase: "answering", marked: true });
  });

  it("đã nộp trống: restored với selected null", () => {
    const state = runnerReducer(
      {},
      {
        type: "load-progress",
        records: [progress({ lastSelected: null, lastCorrect: false })],
        labels: LABELS,
      },
    );
    expect(questionState(state, "q1")).toMatchObject({ phase: "restored", selected: null });
  });

  it("nhãn lạ trong dữ liệu cũ bị bỏ qua, không làm vỡ trạng thái", () => {
    const state = runnerReducer(
      {},
      { type: "load-progress", records: [progress({ lastSelected: "⑤" })], labels: LABELS },
    );
    expect(questionState(state, "q1").selected).toBeNull();
  });

  it("xem lời giải: restored -> revealing -> done; lỗi thì về restored", () => {
    let state = runnerReducer({}, { type: "load-progress", records: [progress()], labels: LABELS });
    state = runnerReducer(state, { type: "reveal-start", id: "q1" });
    expect(questionState(state, "q1").phase).toBe("revealing");
    state = runnerReducer(state, { type: "reveal-fail", id: "q1", message: "Lỗi" });
    expect(questionState(state, "q1")).toMatchObject({ phase: "restored", error: "Lỗi" });
    state = runnerReducer(state, { type: "reveal-start", id: "q1" });
    state = runnerReducer(state, { type: "reveal-ok", id: "q1", result: result() });
    expect(questionState(state, "q1").phase).toBe("done");
  });
});

describe("formatClock", () => {
  it("định dạng mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(59_999)).toBe("00:59");
    expect(formatClock(61_000)).toBe("01:01");
    expect(formatClock(3_600_000)).toBe("60:00");
    expect(formatClock(-5)).toBe("00:00");
  });
});
