/**
 * Phần Viết của đề thi ở server: kiểm hình dạng bài nộp, chuẩn hoá, đếm ký tự và dựng
 * `ExamResult.writing`. KHÔNG chấm điểm (MVP: người học tự chấm, xem ./writing-self-score.ts).
 *
 * Hàm thuần: không đọc đĩa, không đọc đồng hồ. Chỉ dùng kiểu của ./source (FullExam…) nên test được
 * bằng đề dựng tay.
 */
import { countChars } from "@/lib/db/char-count";
import { charLimitStatus } from "@/lib/practice/writing-types";
import type { FullExamSection, FullWritingItem } from "./source";
import type {
  ExamWritingAnswer,
  LevelProjectionBasis,
  WritingReview,
  WritingReviewItem,
} from "./types";
import { WRITING_BLANK_MAX_CHARS, WRITING_TEXT_MAX_CHARS } from "./writing-self-score";

/**
 * Bài Viết nộp lên sai hình dạng so với đề hoặc quá dài. Route đổi thành lỗi 400
 * `invalid_writing_answer`; `message` là tiếng Việt, hiển thị được cho người học.
 */
export class InvalidWritingAnswerError extends Error {
  readonly code = "invalid_writing_answer";
  constructor(
    /** id câu Viết gây lỗi; `undefined` khi lỗi nằm ở cả trường `writing`. */
    readonly questionId: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "InvalidWritingAnswerError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const present = (value: unknown): boolean => value !== undefined && value !== null;

/**
 * Chuẩn hoá bài nộp của MỘT câu Viết theo `format` của đề.
 *  - essay: chỉ nhận `text` (chuỗi, bỏ trống = ""); có `blanks` -> lỗi.
 *  - fill_blanks: chỉ nhận `blanks` (khoá thuộc nhãn của đề, giá trị chuỗi); có `text` -> lỗi. Kết quả
 *    luôn có ĐỦ mọi nhãn theo thứ tự trong đề (chỗ thiếu = "").
 * `raw` undefined/null = bỏ trống cả câu.
 */
export function normalizeWritingAnswer(item: FullWritingItem, raw: unknown): ExamWritingAnswer {
  const { prompt } = item;
  const id = prompt.id;
  const fail = (message: string): never => {
    throw new InvalidWritingAnswerError(id, `Câu ${id} (${prompt.type_code}): ${message}`);
  };

  if (present(raw) && !isPlainObject(raw)) {
    return fail(
      prompt.format === "essay"
        ? "bài làm phải có dạng { text: chuỗi }."
        : "bài làm phải có dạng { blanks: { nhãn: chuỗi } }.",
    );
  }
  const body: Record<string, unknown> = isPlainObject(raw) ? raw : {};

  if (prompt.format === "essay") {
    if (present(body.blanks)) {
      return fail("đây là câu viết bài, hãy gửi `text` chứ không phải `blanks`.");
    }
    const text = body.text ?? "";
    if (typeof text !== "string") return fail("`text` phải là chuỗi văn bản.");
    if (text.length > WRITING_TEXT_MAX_CHARS) {
      return fail(`bài viết quá dài (tối đa ${WRITING_TEXT_MAX_CHARS} ký tự).`);
    }
    return { text };
  }

  // fill_blanks
  if (present(body.text)) {
    return fail("đây là câu điền chỗ trống, hãy gửi `blanks` chứ không phải `text`.");
  }
  const labels = (prompt.blanks ?? []).map((b) => b.label);
  const given = body.blanks ?? {};
  if (!isPlainObject(given)) return fail("`blanks` phải là object { nhãn: chuỗi }.");
  for (const key of Object.keys(given)) {
    if (!labels.includes(key)) {
      return fail(
        `nhãn chỗ trống "${key}" không thuộc đề (các nhãn của đề: ${labels.join(", ")}).`,
      );
    }
  }
  const blanks: Record<string, string> = {};
  for (const label of labels) {
    const value = given[label] ?? "";
    if (typeof value !== "string") return fail(`đáp án chỗ trống ${label} phải là chuỗi văn bản.`);
    if (value.length > WRITING_BLANK_MAX_CHARS) {
      return fail(`đáp án chỗ trống ${label} quá dài (tối đa ${WRITING_BLANK_MAX_CHARS} ký tự).`);
    }
    blanks[label] = value;
  }
  return { blanks };
}

/**
 * Dựng phần xem lại của một phần Viết từ bài nộp thô (`ExamSubmitRequest.writing`, chưa tin cậy).
 * `rawWriting` undefined/null = người học chưa viết gì; không phải object -> `InvalidWritingAnswerError`.
 * Khoá không thuộc đề bị bỏ qua.
 */
export function buildWritingReview(
  section: FullExamSection,
  rawWriting: unknown,
  levelBasis: LevelProjectionBasis,
): WritingReview {
  if (present(rawWriting) && !isPlainObject(rawWriting)) {
    throw new InvalidWritingAnswerError(
      undefined,
      "Trường `writing` phải là object { id câu Viết: bài làm }.",
    );
  }
  const submitted: Record<string, unknown> = isPlainObject(rawWriting) ? rawWriting : {};

  const items: WritingReviewItem[] = (section.writing_items ?? []).map((item) => {
    const { prompt } = item;
    const answer = normalizeWritingAnswer(
      item,
      Object.prototype.hasOwnProperty.call(submitted, prompt.id) ? submitted[prompt.id] : undefined,
    );
    const charCount = answer.text !== undefined ? countChars(answer.text) : undefined;
    return {
      number: item.number,
      id: prompt.id,
      type_code: prompt.type_code,
      type_group: item.type_group,
      subskill: prompt.subskill,
      format: prompt.format,
      prompt,
      answer,
      ...(charCount !== undefined ? { char_count: charCount } : {}),
      ...(charCount !== undefined && prompt.char_limit
        ? { char_status: charLimitStatus(charCount, prompt.char_limit) }
        : {}),
      max_points: item.max_points,
      reveal: item.reveal,
    };
  });

  return {
    order: section.order,
    duration_sec: section.duration_sec,
    items,
    max_score: section.max_score,
    max_points_total: items.reduce((n, i) => n + i.max_points, 0),
    level_basis: levelBasis,
  };
}
