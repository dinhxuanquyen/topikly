import type { CheckResponse, ChoiceLabel } from "@/lib/practice/types";
import type { ProgressRecord } from "./guest-stats";

/**
 * Trạng thái của trình làm bài, tách khỏi giao diện để test được.
 *
 * Vòng đời một câu:
 *   answering  --submit-start--> submitting --submit-ok--> done
 *                                     \--submit-fail--> answering (kèm lỗi)
 *   (mở lại trang) restored --reveal-start--> revealing --reveal-ok--> done
 *   done|restored --retry--> answering
 */

export type Phase = "answering" | "submitting" | "restored" | "revealing" | "done";

export interface QuestionState {
  phase: Phase;
  /** Lựa chọn hiện tại (hoặc lựa chọn lần trước khi `restored`). */
  selected: ChoiceLabel | null;
  result: CheckResponse | null;
  marked: boolean;
  /** Thời gian đã làm ở lượt hiện tại (ms). */
  spentMs: number;
  error: string | null;
  /** Đang hỏi xác nhận nộp bài trống. */
  confirmEmpty: boolean;
  /** Chỉ có khi `restored`: kết quả lần trước. */
  restoredCorrect: boolean | null;
}

export type RunnerState = Record<string, QuestionState>;

export const INITIAL_QUESTION: QuestionState = {
  phase: "answering",
  selected: null,
  result: null,
  marked: false,
  spentMs: 0,
  error: null,
  confirmEmpty: false,
  restoredCorrect: null,
};

export type RunnerAction =
  | { type: "load-progress"; records: readonly ProgressRecord[]; labels: readonly string[] }
  | { type: "select"; id: string; label: ChoiceLabel }
  | { type: "tick"; id: string; ms: number }
  | { type: "toggle-mark"; id: string }
  | { type: "ask-confirm-empty"; id: string }
  | { type: "cancel-confirm-empty"; id: string }
  | { type: "submit-start"; id: string }
  | { type: "submit-ok"; id: string; result: CheckResponse }
  | { type: "submit-fail"; id: string; message: string }
  | { type: "reveal-start"; id: string }
  | { type: "reveal-ok"; id: string; result: CheckResponse }
  | { type: "reveal-fail"; id: string; message: string }
  | { type: "retry"; id: string };

export function questionState(state: RunnerState, id: string): QuestionState {
  return state[id] ?? INITIAL_QUESTION;
}

/** Câu còn nguyên, chưa được người học đụng tới: an toàn để ghi đè bằng tiến độ đã lưu. */
function isPristine(q: QuestionState): boolean {
  return q.phase === "answering" && q.selected === null && q.error === null;
}

function isChoiceLabel(value: string | null, labels: readonly string[]): value is ChoiceLabel {
  return value !== null && labels.includes(value);
}

export function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  if (action.type === "load-progress") {
    const next: RunnerState = { ...state };
    for (const rec of action.records) {
      const current = questionState(next, rec.questionId);
      if (!isPristine(current)) continue;
      if (rec.answered) {
        next[rec.questionId] = {
          ...current,
          phase: "restored",
          selected: isChoiceLabel(rec.lastSelected, action.labels) ? rec.lastSelected : null,
          marked: current.marked || rec.marked,
          restoredCorrect: rec.lastCorrect,
        };
      } else if (rec.marked) {
        next[rec.questionId] = { ...current, marked: true };
      }
    }
    return next;
  }

  const id = action.id;
  const q = questionState(state, id);
  const set = (patch: Partial<QuestionState>): RunnerState => ({
    ...state,
    [id]: { ...q, ...patch },
  });

  switch (action.type) {
    case "select":
      if (q.phase !== "answering") return state;
      return set({ selected: action.label, confirmEmpty: false, error: null });
    case "tick":
      if (q.phase !== "answering") return state;
      return set({ spentMs: q.spentMs + action.ms });
    case "toggle-mark":
      return set({ marked: !q.marked });
    case "ask-confirm-empty":
      if (q.phase !== "answering") return state;
      return set({ confirmEmpty: true });
    case "cancel-confirm-empty":
      return set({ confirmEmpty: false });
    case "submit-start":
      if (q.phase !== "answering") return state;
      return set({ phase: "submitting", confirmEmpty: false, error: null });
    case "submit-ok":
      return set({ phase: "done", result: action.result, selected: action.result.selectedLabel });
    case "submit-fail":
      return set({ phase: "answering", error: action.message });
    case "reveal-start":
      if (q.phase !== "restored") return state;
      return set({ phase: "revealing", error: null });
    case "reveal-ok":
      return set({ phase: "done", result: action.result, selected: action.result.selectedLabel });
    case "reveal-fail":
      return set({ phase: "restored", error: action.message });
    case "retry":
      if (q.phase !== "done" && q.phase !== "restored") return state;
      return {
        ...state,
        [id]: { ...INITIAL_QUESTION, marked: q.marked },
      };
  }
}

/** mm:ss (không giờ; quá 99 phút thì vẫn hiện số phút đầy đủ). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Trạng thái hiển thị của một câu trên dải số câu. */
export type NavStatus = "todo" | "correct" | "wrong" | "done";

export function navStatus(q: QuestionState): NavStatus {
  if (q.phase === "done" && q.result) return q.result.correct ? "correct" : "wrong";
  if (q.phase === "restored" || q.phase === "revealing") {
    if (q.restoredCorrect === null) return "done";
    return q.restoredCorrect ? "correct" : "wrong";
  }
  return "todo";
}
