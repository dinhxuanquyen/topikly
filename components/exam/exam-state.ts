/**
 * Phần THUẦN của trình làm đề: dựng danh sách khối/câu từ đề, reducer đáp án, đếm thời gian,
 * dựng body nộp bài và các kiểu bản ghi lưu chế độ khách. Không đụng IndexedDB (xem exam-store.ts)
 * nên test được trong môi trường node.
 *
 * Đề có phần Viết: mỗi câu Viết là MỘT khối riêng (`WritingBlockRef`), bài Viết nằm ở
 * `ExamSession.writing` và được tính vào "đã làm" khi có nội dung.
 */
import { CHOICE_LABELS, type PracticeSkill } from "@/lib/practice/types";
import type {
  ExamKind,
  ExamResult,
  ExamSubmitRequest,
  ExamWritingAnswer,
  PublicExam,
  PublicExamBlock,
  PublicWritingItem,
} from "@/lib/exam/types";
import {
  clampSelfPoints,
  projectLevelWithWriting,
  WRITING_BLANK_MAX_CHARS,
  WRITING_TEXT_MAX_CHARS,
} from "@/lib/exam/writing-self-score";

// ------------------------------------------------------------------ cấu trúc đề

interface BlockRefBase {
  /** Chỉ số khối trong toàn đề (qua mọi phần thi). */
  index: number;
  sectionIndex: number;
}

/** Khối trắc nghiệm (Đọc, Nghe): một nhóm câu in chung lệnh đề. */
export interface ChoiceBlockRef extends BlockRefBase {
  kind: "choice";
  skill: PracticeSkill;
  block: PublicExamBlock;
}

/** Khối Viết: mỗi câu Viết là một khối riêng (đề, ngữ liệu, ô nhập). */
export interface WritingBlockRef extends BlockRefBase {
  kind: "writing";
  skill: "writing";
  item: PublicWritingItem;
  /** Số câu thật trong đề (51~54), suy từ `prompt.type_code`; `item.number` chỉ là vị trí. */
  number: number;
}

export type BlockRef = ChoiceBlockRef | WritingBlockRef;

export function isChoiceBlock(ref: BlockRef): ref is ChoiceBlockRef {
  return ref.kind === "choice";
}

export interface FlatQuestion {
  id: string;
  /** Số hiển thị: câu trắc nghiệm = vị trí trong phần; câu Viết = số thật 51~54. */
  number: number;
  blockIndex: number;
  sectionIndex: number;
  kind: "choice" | "writing";
  /** Câu Viết điền chỗ trống: nhãn các chỗ trống ("㉠", "㉡"). */
  blankLabels?: string[];
}

/**
 * Số câu thật của câu Viết, suy từ type_code ("W53" -> 53). `number` của PublicWritingItem chỉ là vị
 * trí 1..4 nên không dùng để hiển thị. Không suy được thì lấy vị trí.
 */
export function writingQuestionNumber(item: PublicWritingItem): number {
  return numberOfWritingType(item.prompt.type_code, item.number);
}

/** "W53" -> 53; không có chữ số thì trả `fallback`. */
export function numberOfWritingType(typeCode: string, fallback: number): number {
  const parsed = Number.parseInt(typeCode.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Mọi khối của đề theo thứ tự làm bài. */
export function listBlocks(exam: PublicExam): BlockRef[] {
  const blocks: BlockRef[] = [];
  exam.sections.forEach((section, sectionIndex) => {
    if (section.skill === "writing") {
      for (const item of section.writing_items) {
        blocks.push({
          kind: "writing",
          index: blocks.length,
          sectionIndex,
          skill: "writing",
          item,
          number: writingQuestionNumber(item),
        });
      }
      return;
    }
    for (const block of section.blocks) {
      blocks.push({
        kind: "choice",
        index: blocks.length,
        sectionIndex,
        skill: section.skill,
        block,
      });
    }
  });
  return blocks;
}

/** Số câu Nghe của đề và số câu trong đó chưa có audio. */
export interface ListeningAudioStatus {
  listening: number;
  missing: number;
}

/**
 * Đếm câu Nghe thiếu audio (`audio_url` null hoặc rỗng). Khối dùng chung bài nghe chỉ phát audio
 * của câu đầu khối (xem ExamBlockView), nên cả khối tính theo audio đó.
 */
export function listeningAudioStatus(exam: PublicExam): ListeningAudioStatus {
  let listening = 0;
  let missing = 0;
  for (const ref of listBlocks(exam)) {
    if (!isChoiceBlock(ref)) continue;
    const { block } = ref;
    for (const item of block.questions) {
      if (item.question.skill !== "listening") continue;
      listening += 1;
      const source = block.shared_material ? (block.questions[0] ?? item) : item;
      const url = source.question.audio_url;
      if (typeof url !== "string" || url.trim() === "") missing += 1;
    }
  }
  return { listening, missing };
}

/** Mọi câu của đề theo thứ tự làm bài. */
export function listQuestions(exam: PublicExam): FlatQuestion[] {
  const questions: FlatQuestion[] = [];
  for (const ref of listBlocks(exam)) {
    if (ref.kind === "writing") {
      const { prompt } = ref.item;
      questions.push({
        id: prompt.id,
        number: ref.number,
        blockIndex: ref.index,
        sectionIndex: ref.sectionIndex,
        kind: "writing",
        ...(prompt.format === "fill_blanks"
          ? { blankLabels: (prompt.blanks ?? []).map((blank) => blank.label) }
          : {}),
      });
      continue;
    }
    for (const { number, question } of ref.block.questions) {
      questions.push({
        id: question.id,
        number,
        blockIndex: ref.index,
        sectionIndex: ref.sectionIndex,
        kind: "choice",
      });
    }
  }
  return questions;
}

/** Các câu Viết của đề theo thứ tự làm bài. */
export function listWritingItems(exam: PublicExam): PublicWritingItem[] {
  return listBlocks(exam).flatMap((ref) => (ref.kind === "writing" ? [ref.item] : []));
}

// ------------------------------------------------------------------ đáp án & đánh dấu

export interface ExamSession {
  /** questionId -> "①"–"④". Câu chưa chọn không có khoá. */
  answers: Record<string, string>;
  /** questionId -> true. */
  marked: Record<string, true>;
  /** Bài Viết, khoá = id câu Viết. essay: `{ text }`; điền chỗ trống: `{ blanks: { "㉠": "…" } }`. */
  writing: Record<string, ExamWritingAnswer>;
}

export const EMPTY_SESSION: ExamSession = { answers: {}, marked: {}, writing: {} };

export type SessionAction =
  | { type: "select"; id: string; label: string }
  | { type: "clear"; id: string }
  | { type: "toggle-mark"; id: string }
  | { type: "write-text"; id: string; text: string }
  | { type: "write-blank"; id: string; label: string; text: string }
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
    case "write-text": {
      if ((state.writing[action.id]?.text ?? "") === action.text) return state;
      return { ...state, writing: { ...state.writing, [action.id]: { text: action.text } } };
    }
    case "write-blank": {
      const current = state.writing[action.id]?.blanks ?? {};
      if ((current[action.label] ?? "") === action.text) return state;
      return {
        ...state,
        writing: {
          ...state.writing,
          [action.id]: { blanks: { ...current, [action.label]: action.text } },
        },
      };
    }
    case "restore":
      return action.session;
    case "reset":
      return EMPTY_SESSION;
  }
}

/** Câu Viết có nội dung (chữ khác khoảng trắng) thì tính là "đã làm". */
export function hasWritingContent(answer: ExamWritingAnswer | undefined): boolean {
  if (!answer) return false;
  if (typeof answer.text === "string" && answer.text.trim() !== "") return true;
  return Object.values(answer.blanks ?? {}).some((value) => value.trim() !== "");
}

/** Câu đã làm: trắc nghiệm = đã chọn đáp án; Viết = có nội dung. */
export function isAnswered(question: FlatQuestion, session: ExamSession): boolean {
  return question.kind === "writing"
    ? hasWritingContent(session.writing[question.id])
    : question.id in session.answers;
}

/** Câu điền chỗ trống đã điền một phần: có ít nhất một chỗ trống trống và ít nhất một chỗ có chữ. */
export function isWritingIncomplete(question: FlatQuestion, session: ExamSession): boolean {
  if (question.kind !== "writing" || !question.blankLabels) return false;
  const blanks = session.writing[question.id]?.blanks ?? {};
  const filled = question.blankLabels.filter((label) => (blanks[label] ?? "").trim() !== "");
  return filled.length > 0 && filled.length < question.blankLabels.length;
}

export function countAnswered(questions: readonly FlatQuestion[], session: ExamSession): number {
  return questions.filter((q) => isAnswered(q, session)).length;
}

export function countMarked(questions: readonly FlatQuestion[], session: ExamSession): number {
  return questions.filter((q) => session.marked[q.id]).length;
}

/** Số câu điền chỗ trống mới điền một phần (hộp xác nhận nộp bài cảnh báo riêng). */
export function countIncompleteWriting(
  questions: readonly FlatQuestion[],
  session: ExamSession,
): number {
  return questions.filter((q) => isWritingIncomplete(q, session)).length;
}

/** Câu đầu tiên chưa làm, hoặc undefined nếu đã làm hết. */
export function firstUnanswered(
  questions: readonly FlatQuestion[],
  session: ExamSession,
): FlatQuestion | undefined {
  return questions.find((q) => !isAnswered(q, session));
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

/**
 * Bài Viết gửi lên theo hình dạng của từng câu: essay `{ text }`, điền chỗ trống `{ blanks }` đủ mọi
 * nhãn (chỗ chưa điền = ""). undefined khi đề không có câu Viết (đề trắc nghiệm không gửi `writing`).
 */
export function buildWritingPayload(
  exam: PublicExam,
  session: ExamSession,
): Record<string, ExamWritingAnswer> | undefined {
  const items = listWritingItems(exam);
  if (items.length === 0) return undefined;
  const payload: Record<string, ExamWritingAnswer> = {};
  for (const { prompt } of items) {
    const entry = session.writing[prompt.id];
    if (prompt.format === "fill_blanks") {
      const blanks: Record<string, string> = {};
      for (const { label } of prompt.blanks ?? []) blanks[label] = entry?.blanks?.[label] ?? "";
      payload[prompt.id] = { blanks };
    } else {
      payload[prompt.id] = { text: entry?.text ?? "" };
    }
  }
  return payload;
}

export function buildSubmitRequest(
  exam: PublicExam,
  session: ExamSession,
  startedAt: number,
  now: number,
  timedOut: boolean,
): ExamSubmitRequest {
  const answers: Record<string, string | null> = {};
  for (const question of listQuestions(exam)) {
    if (question.kind === "choice") answers[question.id] = session.answers[question.id] ?? null;
  }
  const writing = buildWritingPayload(exam, session);
  return {
    program: exam.program,
    kind: exam.kind,
    examId: exam.id,
    answers,
    ...(writing ? { writing } : {}),
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
  /** Bài Viết đang soạn (đề có phần Viết); bản nháp cũ không có trường này. */
  writing?: Record<string, ExamWritingAnswer>;
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
    // Đề trắc nghiệm không có bài Viết: không thêm trường để bản nháp giữ nguyên hình dạng cũ.
    ...(Object.keys(session.writing).length > 0 ? { writing: session.writing } : {}),
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

/**
 * Chọn bản nháp mới hơn giữa IndexedDB và bản sao đồng bộ trong localStorage (xem `stashDraft` ở
 * exam-store). Bản sao chỉ thắng khi cùng một lần làm (`startedAt` giống) và `updatedAt` lớn hơn:
 * nó được ghi ngay khi gõ nên không bị mất khi trang đóng trước lúc IndexedDB kịp ghi. Hoà thì lấy IndexedDB.
 */
export function pickNewerDraft(idb: ExamDraft | null, stash: ExamDraft | null): ExamDraft | null {
  if (!stash) return idb;
  if (!idb) return stash;
  return stash.startedAt === idb.startedAt && stash.updatedAt > idb.updatedAt ? stash : idb;
}

/** Lọc bài Viết đọc từ bản nháp theo đề hiện tại: đúng câu, đúng hình dạng, không quá giới hạn. */
function writingFromDraft(exam: PublicExam, draft: ExamDraft): Record<string, ExamWritingAnswer> {
  const saved = draft.writing;
  const out: Record<string, ExamWritingAnswer> = {};
  if (typeof saved !== "object" || saved === null) return out;
  for (const { prompt } of listWritingItems(exam)) {
    const entry = saved[prompt.id];
    if (typeof entry !== "object" || entry === null) continue;
    if (prompt.format === "fill_blanks") {
      const blanks: Record<string, string> = {};
      for (const { label } of prompt.blanks ?? []) {
        const value = entry.blanks?.[label];
        if (typeof value === "string") blanks[label] = value.slice(0, WRITING_BLANK_MAX_CHARS);
      }
      if (Object.keys(blanks).length > 0) out[prompt.id] = { blanks };
    } else if (typeof entry.text === "string") {
      out[prompt.id] = { text: entry.text.slice(0, WRITING_TEXT_MAX_CHARS) };
    }
  }
  return out;
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
  return { answers, marked, writing: writingFromDraft(exam, draft) };
}

export function clampBlockIndex(exam: PublicExam, index: number): number {
  const total = listBlocks(exam).length;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), Math.max(0, total - 1));
}

/** Điểm tự chấm Viết của người học, khoá = id câu Viết. */
export type SelfPoints = Record<string, number>;

/** Giữ điểm tự chấm hợp lệ: đúng id câu Viết của kết quả, số hữu hạn, làm tròn và kẹp [0, max_points]. */
export function sanitizeSelfPoints(result: ExamResult, raw: unknown): SelfPoints {
  const out: SelfPoints = {};
  if (typeof raw !== "object" || raw === null || !result.writing) return out;
  const source = raw as Record<string, unknown>;
  for (const item of result.writing.items) {
    const value = source[item.id];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[item.id] = clampSelfPoints(value, item.max_points);
    }
  }
  return out;
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
  /** Điểm tự chấm Viết (chỉ có khi đề có phần Viết). */
  selfPoints?: SelfPoints;
  /** true = đã tự chấm ít nhất một câu Viết nên score/levelLabel đã gồm điểm Viết tự chấm. */
  selfScored?: boolean;
  /** true = đề có phần Viết nhưng chưa tự chấm câu nào. */
  writingPending?: boolean;
  result: ExamResult;
}

type RecordScore = Pick<
  ExamResultRecord,
  "score" | "maxScore" | "levelLabel" | "isEstimate" | "selfScored" | "writingPending"
>;

/**
 * Điểm/cấp tóm tắt của một lần làm để hiển thị ở thẻ đề. Đề có Viết và đã tự chấm: gộp điểm Đọc/Nghe
 * tự động với điểm Viết tự chấm (luôn là ước lượng). Chưa tự chấm câu nào: giữ phần tự động và đánh dấu
 * `writingPending`.
 */
export function recordScoreOf(result: ExamResult, selfPoints: SelfPoints = {}): RecordScore {
  const auto: RecordScore = {
    score: result.total_score,
    maxScore: result.total_max_score,
    levelLabel: result.level?.label ?? "",
    isEstimate: result.level?.is_estimate ?? true,
  };
  if (!result.writing) return auto;
  const projection = projectLevelWithWriting(result.writing, selfPoints);
  if (projection.writing.scored_count === 0) return { ...auto, writingPending: true };
  return {
    score: projection.total_score,
    maxScore: projection.total_max_score,
    levelLabel: projection.level.label,
    isEstimate: true,
    selfScored: true,
  };
}

export function toResultRecord(
  result: ExamResult,
  selfPoints: SelfPoints = {},
): Omit<ExamResultRecord, "id"> {
  const points = sanitizeSelfPoints(result, selfPoints);
  return {
    examKey: examKey(result.program, result.kind, result.examId),
    group: groupKey(result.program, result.kind),
    program: result.program,
    kind: result.kind,
    examId: result.examId,
    submittedAt: result.submittedAt,
    ...recordScoreOf(result, points),
    ...(result.writing ? { selfPoints: points } : {}),
    result,
  };
}

/**
 * Ghi điểm tự chấm vào bản ghi có cùng `submittedAt` (lần nộp đang xem). Hàm thuần để test không cần
 * IndexedDB: trả bản ghi đã cập nhật, hoặc null nếu không có lần nộp đó / kết quả không có phần Viết.
 */
export function applySelfPoints(
  rows: readonly ExamResultRecord[],
  result: ExamResult,
  selfPoints: SelfPoints,
): ExamResultRecord | null {
  const row = rows.find((candidate) => candidate.submittedAt === result.submittedAt);
  if (!row || !result.writing) return null;
  const points = sanitizeSelfPoints(result, selfPoints);
  const rest = { ...row };
  delete rest.selfScored;
  delete rest.writingPending;
  return { ...rest, ...recordScoreOf(result, points), selfPoints: points };
}

/** Kết quả đã lưu của một lần làm kèm điểm tự chấm Viết (rỗng nếu chưa chấm hoặc đề không có Viết). */
export interface ExamAttempt {
  result: ExamResult;
  selfPoints: SelfPoints;
}

export function attemptOf(record: ExamResultRecord): ExamAttempt {
  return {
    result: record.result,
    selfPoints: sanitizeSelfPoints(record.result, record.selfPoints),
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
    /** Điểm/cấp đã gồm điểm Viết tự chấm. */
    selfScored?: boolean;
    /** Đề có phần Viết nhưng chưa tự chấm câu nào. */
    writingPending?: boolean;
  };
}

export function summarizeStatuses(
  drafts: readonly Pick<ExamDraft, "examId">[],
  results: readonly Pick<
    ExamResultRecord,
    | "examId"
    | "submittedAt"
    | "score"
    | "maxScore"
    | "levelLabel"
    | "isEstimate"
    | "selfScored"
    | "writingPending"
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
        ...(record.selfScored ? { selfScored: true } : {}),
        ...(record.writingPending ? { writingPending: true } : {}),
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
