/**
 * Phần THUẦN của trình làm đề: dựng danh sách khối/câu từ đề, reducer đáp án, đếm thời gian,
 * dựng body nộp bài và các kiểu bản ghi lưu chế độ khách. Không đụng IndexedDB (xem exam-store.ts)
 * nên test được trong môi trường node.
 */
import { CHOICE_LABELS } from "@/lib/practice/types";
import type {
  ExamKind,
  ExamResult,
  ExamSubmitRequest,
  PublicExam,
  PublicExamBlock,
} from "@/lib/exam/types";

// ------------------------------------------------------------------ cấu trúc đề

export interface BlockRef {
  /** Chỉ số khối trong toàn đề (qua mọi phần thi). */
  index: number;
  sectionIndex: number;
  skill: PublicExam["sections"][number]["skill"];
  block: PublicExamBlock;
}

export interface FlatQuestion {
  id: string;
  number: number;
  blockIndex: number;
  sectionIndex: number;
}

/** Mọi khối của đề theo thứ tự làm bài. */
export function listBlocks(exam: PublicExam): BlockRef[] {
  const blocks: BlockRef[] = [];
  exam.sections.forEach((section, sectionIndex) => {
    for (const block of section.blocks) {
      blocks.push({ index: blocks.length, sectionIndex, skill: section.skill, block });
    }
  });
  return blocks;
}

/** Mọi câu của đề theo thứ tự làm bài. */
export function listQuestions(exam: PublicExam): FlatQuestion[] {
  const questions: FlatQuestion[] = [];
  for (const ref of listBlocks(exam)) {
    for (const { number, question } of ref.block.questions) {
      questions.push({
        id: question.id,
        number,
        blockIndex: ref.index,
        sectionIndex: ref.sectionIndex,
      });
    }
  }
  return questions;
}

// ------------------------------------------------------------------ đáp án & đánh dấu

export interface ExamSession {
  /** questionId -> "①"–"④". Câu chưa chọn không có khoá. */
  answers: Record<string, string>;
  /** questionId -> true. */
  marked: Record<string, true>;
}

export const EMPTY_SESSION: ExamSession = { answers: {}, marked: {} };

export type SessionAction =
  | { type: "select"; id: string; label: string }
  | { type: "clear"; id: string }
  | { type: "toggle-mark"; id: string }
  | { type: "restore"; session: ExamSession }
  | { type: "reset" };

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

export function sessionReducer(state: ExamSession, action: SessionAction): ExamSession {
  switch (action.type) {
    case "select":
      if (state.answers[action.id] === action.label) return state;
      return { ...state, answers: { ...state.answers, [action.id]: action.label } };
    case "clear": {
      if (!(action.id in state.answers)) return state;
      return { ...state, answers: without(state.answers, action.id) };
    }
    case "toggle-mark": {
      if (state.marked[action.id]) {
        return { ...state, marked: without(state.marked, action.id) };
      }
      return { ...state, marked: { ...state.marked, [action.id]: true } };
    }
    case "restore":
      return action.session;
    case "reset":
      return EMPTY_SESSION;
  }
}

export function countAnswered(questions: readonly FlatQuestion[], session: ExamSession): number {
  return questions.filter((q) => q.id in session.answers).length;
}

export function countMarked(questions: readonly FlatQuestion[], session: ExamSession): number {
  return questions.filter((q) => session.marked[q.id]).length;
}

/** Câu đầu tiên chưa có đáp án, hoặc undefined nếu đã làm hết. */
export function firstUnanswered(
  questions: readonly FlatQuestion[],
  session: ExamSession,
): FlatQuestion | undefined {
  return questions.find((q) => !(q.id in session.answers));
}

// ------------------------------------------------------------------ thời gian

/** Mốc cảnh báo còn lại (giây). */
export const WARN_FIVE_MINUTES_SEC = 300;
export const WARN_ONE_MINUTE_SEC = 60;

export type TimeWarning = "none" | "five" | "one" | "over";

export function remainingMs(startedAt: number, durationSec: number, now: number): number {
  return Math.max(0, startedAt + durationSec * 1000 - now);
}

/** Mức cảnh báo theo thời gian còn lại. Đề dưới 5 phút không phát cảnh báo 5 phút. */
export function timeWarning(remaining: number, durationSec: number): TimeWarning {
  if (remaining <= 0) return "over";
  if (remaining <= WARN_ONE_MINUTE_SEC * 1000 && durationSec > WARN_ONE_MINUTE_SEC) return "one";
  if (remaining <= WARN_FIVE_MINUTES_SEC * 1000 && durationSec > WARN_FIVE_MINUTES_SEC) {
    return "five";
  }
  return "none";
}

/** Thời gian làm bài tính cho báo cáo: không vượt quá thời gian của đề. */
export function elapsedForSubmit(startedAt: number, durationSec: number, now: number): number {
  return Math.min(Math.max(0, now - startedAt), durationSec * 1000);
}

// ------------------------------------------------------------------ body nộp bài

export function buildSubmitRequest(
  exam: PublicExam,
  session: ExamSession,
  startedAt: number,
  now: number,
  timedOut: boolean,
): ExamSubmitRequest {
  const answers: Record<string, string | null> = {};
  for (const question of listQuestions(exam)) {
    answers[question.id] = session.answers[question.id] ?? null;
  }
  return {
    program: exam.program,
    kind: exam.kind,
    examId: exam.id,
    answers,
    startedAt,
    timeSpentMs: elapsedForSubmit(startedAt, exam.duration_sec, now),
    timedOut,
  };
}

// ------------------------------------------------------------------ bản ghi chế độ khách

export function examKey(program: string, kind: string, examId: string): string {
  return `${program}:${kind}:${examId}`;
}

export function groupKey(program: string, kind: string): string {
  return `${program}:${kind}`;
}

/** Bài làm dở: đủ để dựng lại đúng màn hình và đúng giờ sau khi tải lại trang. */
export interface ExamDraft {
  key: string;
  group: string;
  program: string;
  kind: ExamKind;
  examId: string;
  /** ms epoch, đồng hồ máy khách. Đồng hồ đếm ngược tính từ mốc này. */
  startedAt: number;
  answers: Record<string, string>;
  marked: string[];
  blockIndex: number;
  /** Id audio đã bắt đầu phát (chế độ thi: mỗi audio chỉ nghe một lần, tải lại trang không mở khoá). */
  audioPlayed?: string[];
  updatedAt: number;
}

export function buildDraft(
  exam: PublicExam,
  session: ExamSession,
  startedAt: number,
  blockIndex: number,
  now: number,
  audioPlayed: Readonly<Record<string, true>> = {},
): ExamDraft {
  return {
    key: examKey(exam.program, exam.kind, exam.id),
    group: groupKey(exam.program, exam.kind),
    program: exam.program,
    kind: exam.kind,
    examId: exam.id,
    startedAt,
    answers: session.answers,
    marked: Object.keys(session.marked),
    blockIndex,
    audioPlayed: Object.keys(audioPlayed),
    updatedAt: now,
  };
}

/** Audio đã phát lấy từ bản nháp, chỉ giữ id còn là câu của đề (id audio = id câu đầu của khối). */
export function audioPlayedFromDraft(exam: PublicExam, draft: ExamDraft): Record<string, true> {
  const ids = new Set(listQuestions(exam).map((q) => q.id));
  const played: Record<string, true> = {};
  for (const id of draft.audioPlayed ?? []) {
    if (ids.has(id)) played[id] = true;
  }
  return played;
}

/** Lọc bản nháp theo đề hiện tại: bỏ câu không còn trong đề, nhãn không hợp lệ. */
export function sessionFromDraft(exam: PublicExam, draft: ExamDraft): ExamSession {
  const ids = new Set(listQuestions(exam).map((q) => q.id));
  const labels = new Set<string>(CHOICE_LABELS);
  const answers: Record<string, string> = {};
  for (const [id, label] of Object.entries(draft.answers ?? {})) {
    if (ids.has(id) && typeof label === "string" && labels.has(label)) answers[id] = label;
  }
  const marked: Record<string, true> = {};
  for (const id of draft.marked ?? []) {
    if (ids.has(id)) marked[id] = true;
  }
  return { answers, marked };
}

export function clampBlockIndex(exam: PublicExam, index: number): number {
  const total = listBlocks(exam).length;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), Math.max(0, total - 1));
}

/** Một lần làm đã nộp, lưu kèm kết quả đầy đủ để xem lại không cần gọi server. */
export interface ExamResultRecord {
  id?: number;
  examKey: string;
  group: string;
  program: string;
  kind: ExamKind;
  examId: string;
  submittedAt: number;
  score: number;
  maxScore: number;
  levelLabel: string;
  isEstimate: boolean;
  result: ExamResult;
}

export function toResultRecord(result: ExamResult): Omit<ExamResultRecord, "id"> {
  return {
    examKey: examKey(result.program, result.kind, result.examId),
    group: groupKey(result.program, result.kind),
    program: result.program,
    kind: result.kind,
    examId: result.examId,
    submittedAt: result.submittedAt,
    score: result.total_score,
    maxScore: result.total_max_score,
    levelLabel: result.level.label,
    isEstimate: result.level.is_estimate,
    result,
  };
}

/** Tình trạng của một đề trong chế độ khách, dùng cho thẻ ở trang danh sách. */
export interface ExamStatusSummary {
  /** Có bài làm dở. */
  draft: boolean;
  attempts: number;
  latest?: {
    score: number;
    maxScore: number;
    levelLabel: string;
    isEstimate: boolean;
    submittedAt: number;
  };
}

export function summarizeStatuses(
  drafts: readonly Pick<ExamDraft, "examId">[],
  results: readonly Pick<
    ExamResultRecord,
    "examId" | "submittedAt" | "score" | "maxScore" | "levelLabel" | "isEstimate"
  >[],
): Record<string, ExamStatusSummary> {
  const out: Record<string, ExamStatusSummary> = {};
  const entry = (examId: string): ExamStatusSummary =>
    (out[examId] ??= { draft: false, attempts: 0 });
  for (const draft of drafts) entry(draft.examId).draft = true;
  for (const record of results) {
    const status = entry(record.examId);
    status.attempts += 1;
    if (!status.latest || record.submittedAt >= status.latest.submittedAt) {
      status.latest = {
        score: record.score,
        maxScore: record.maxScore,
        levelLabel: record.levelLabel,
        isEstimate: record.isEstimate,
        submittedAt: record.submittedAt,
      };
    }
  }
  return out;
}

// ------------------------------------------------------------------ hiển thị

export function ratePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/** Phút làm tròn lên, dùng cho "15 phút". */
export function toMinutes(sec: number): number {
  return Math.ceil(sec / 60);
}

/** Dạng câu thuộc kỹ năng nào, suy từ tiền tố type_code (L = nghe, R = đọc, W = viết). */
export function skillSlugOfType(typeCode: string): "nghe" | "doc" | "viet" | null {
  switch (typeCode.charAt(0).toUpperCase()) {
    case "L":
      return "nghe";
    case "R":
      return "doc";
    case "W":
      return "viet";
    default:
      return null;
  }
}

/**
 * Đường dẫn "Luyện dạng này" của một nhóm: type_code đầu tiên trong nhóm có câu luyện.
 * `available` = các type_code đang có câu luyện; undefined = coi như mọi dạng đều có.
 * null = nhóm chưa có dạng nào luyện được.
 */
export function practiceHrefForGroup(
  program: string,
  typeCodes: readonly string[],
  available?: ReadonlySet<string>,
): string | null {
  for (const code of typeCodes) {
    if (available && !available.has(code)) continue;
    const skill = skillSlugOfType(code);
    if (skill) return `/${program}/luyen-tap/${skill}/${code}`;
  }
  return null;
}
