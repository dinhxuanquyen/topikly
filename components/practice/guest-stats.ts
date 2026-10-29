/**
 * Phần THUẦN của chế độ khách: kiểu bản ghi và các hàm tổng hợp thống kê.
 * Không đụng IndexedDB (xem guest-store.ts) nên test được trong môi trường node.
 */
import type { PracticeSkill } from "@/lib/practice/types";

/** Một lượt trả lời (nộp bài). Lưu mọi lượt để sau này tính tiến bộ theo thời gian. */
export interface AnswerRecord {
  /** Khoá tự tăng của IndexedDB; chưa có trước khi ghi. */
  id?: number;
  program: string;
  questionId: string;
  type_code: string;
  skill: PracticeSkill;
  /** "①"–"④"; null = nộp để trống. */
  selectedLabel: string | null;
  correct: boolean;
  timeSpentMs: number;
  /** Epoch ms. */
  answeredAt: number;
}

/** Tiến độ theo câu: trạng thái mới nhất, dùng để dựng lại màn hình khi mở lại trang. */
export interface ProgressRecord {
  /** `${program}:${questionId}` */
  key: string;
  program: string;
  questionId: string;
  type_code: string;
  skill: PracticeSkill;
  /** false khi mới chỉ đánh dấu, chưa nộp lần nào. */
  answered: boolean;
  lastSelected: string | null;
  lastCorrect: boolean | null;
  marked: boolean;
  updatedAt: number;
}

export interface QuestionMeta {
  program: string;
  questionId: string;
  type_code: string;
  skill: PracticeSkill;
}

export interface TypeStats {
  /** Số câu khác nhau đã làm. */
  attempted: number;
  /** Số câu đúng, tính theo lượt MỚI NHẤT của từng câu. */
  correct: number;
  /** correct / attempted trong [0, 1]; null khi chưa làm câu nào. */
  rate: number | null;
}

export const EMPTY_STATS: TypeStats = { attempted: 0, correct: 0, rate: null };

export function progressKey(program: string, questionId: string): string {
  return `${program}:${questionId}`;
}

/** Lượt mới nhất của từng câu. Cùng `answeredAt` thì lượt đứng sau trong mảng thắng. */
export function latestAnswerByQuestion(
  answers: readonly AnswerRecord[],
): Map<string, AnswerRecord> {
  const latest = new Map<string, AnswerRecord>();
  for (const a of answers) {
    const key = progressKey(a.program, a.questionId);
    const prev = latest.get(key);
    if (!prev || a.answeredAt >= prev.answeredAt) latest.set(key, a);
  }
  return latest;
}

/** Thống kê của một nhóm lượt trả lời (thường là mọi lượt thuộc một dạng câu). */
export function computeTypeStats(answers: readonly AnswerRecord[]): TypeStats {
  const latest = latestAnswerByQuestion(answers);
  let correct = 0;
  for (const a of latest.values()) if (a.correct) correct += 1;
  const attempted = latest.size;
  return { attempted, correct, rate: attempted === 0 ? null : correct / attempted };
}

/** Gom mọi lượt trả lời theo type_code rồi tính thống kê từng dạng. */
export function groupStatsByType(answers: readonly AnswerRecord[]): Record<string, TypeStats> {
  const byType = new Map<string, AnswerRecord[]>();
  for (const a of answers) {
    const list = byType.get(a.type_code);
    if (list) list.push(a);
    else byType.set(a.type_code, [a]);
  }
  const out: Record<string, TypeStats> = {};
  for (const [typeCode, list] of byType) out[typeCode] = computeTypeStats(list);
  return out;
}

/** Tỉ lệ đúng làm tròn thành phần trăm nguyên (0–100). */
export function ratePercent(rate: number | null): number {
  return rate === null ? 0 : Math.round(rate * 100);
}

/** Cập nhật tiến độ sau khi nộp bài, giữ nguyên cờ đánh dấu. */
export function applyAnswerToProgress(
  prev: ProgressRecord | undefined,
  answer: AnswerRecord,
): ProgressRecord {
  return {
    key: progressKey(answer.program, answer.questionId),
    program: answer.program,
    questionId: answer.questionId,
    type_code: answer.type_code,
    skill: answer.skill,
    answered: true,
    lastSelected: answer.selectedLabel,
    lastCorrect: answer.correct,
    marked: prev?.marked ?? false,
    updatedAt: answer.answeredAt,
  };
}

/** Bật/tắt đánh dấu mà không đụng tới kết quả làm bài đã lưu. */
export function applyMarkToProgress(
  prev: ProgressRecord | undefined,
  meta: QuestionMeta,
  marked: boolean,
  now: number,
): ProgressRecord {
  return {
    key: progressKey(meta.program, meta.questionId),
    program: meta.program,
    questionId: meta.questionId,
    type_code: meta.type_code,
    skill: meta.skill,
    answered: prev?.answered ?? false,
    lastSelected: prev?.lastSelected ?? null,
    lastCorrect: prev?.lastCorrect ?? null,
    marked,
    updatedAt: now,
  };
}

// ------------------------------------------------------------------ hôm nay & chuỗi ngày

/** Khoá ngày theo giờ máy người học, ví dụ "2026-10-28". */
export function localDayKey(epochMs: number): string {
  const d = new Date(epochMs);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface DailySummary {
  /** Số lượt nộp bài trong ngày hôm nay (giờ máy). */
  todayCount: number;
  /**
   * Số ngày liên tiếp có học, tính tới hôm nay. Hôm nay chưa học thì vẫn giữ chuỗi tới hôm qua
   * (chưa coi là đứt cho tới hết ngày). 0 = chưa có chuỗi.
   */
  streakDays: number;
}

export function dailySummary(answers: readonly AnswerRecord[], now: number): DailySummary {
  const days = new Set(answers.map((a) => localDayKey(a.answeredAt)));
  const today = localDayKey(now);
  const todayCount = answers.filter((a) => localDayKey(a.answeredAt) === today).length;
  const cursor = new Date(now);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  while (days.has(localDayKey(cursor.getTime()))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { todayCount, streakDays };
}

/**
 * Dạng nên học tiếp: dạng đầu tiên (theo thứ tự đưa vào) còn câu chưa làm; làm hết rồi thì dạng
 * có tỉ lệ đúng thấp nhất. Trả về chỉ số trong `types`, -1 khi danh sách rỗng.
 */
export function nextTypeIndex(
  types: readonly { type_code: string; question_count: number }[],
  stats: Readonly<Record<string, TypeStats>>,
): number {
  if (types.length === 0) return -1;
  const unfinished = types.findIndex(
    (t) => (stats[t.type_code]?.attempted ?? 0) < t.question_count,
  );
  if (unfinished !== -1) return unfinished;
  let worst = 0;
  types.forEach((t, i) => {
    const rate = stats[t.type_code]?.rate ?? 1;
    if (rate < (stats[types[worst]!.type_code]?.rate ?? 1)) worst = i;
  });
  return worst;
}
