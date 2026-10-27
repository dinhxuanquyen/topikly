import { z } from "zod";
import { checkExamLabelRules } from "./content-rules";
import type { Severity, ValidationIssue } from "./content-validation";
import { EXAM_KINDS, getExamBlueprint } from "./programs";
import type { ExamKindCode, ProgramConfig } from "./programs";

/**
 * Kiểm tra FILE ĐỀ THI: content/<program>/exams/<kind>/<id>.yaml.
 * Định dạng file đề và ý nghĩa từng trường được ghi ở comment đầu lib/exam/source.ts.
 *
 * Phân loại mức độ theo `status` của đề:
 *  - LỖI chặn luôn (mọi trạng thái): sai cấu trúc, id/kind/program lệch đường dẫn, câu không tồn
 *    tại, sai kỹ năng của phần, câu trùng, bộ group_key thiếu câu hoặc không liền nhau.
 *  - Chỉ chặn khi `published` (draft chỉ cảnh báo): số câu khác blueprint, và luật nhãn đúng của
 *    đề lắp ráp (content-spec §4.1: ~25% mỗi nhãn, không quá 3 câu liền cùng nhãn, không chu kỳ lặp).
 *  - Phần Viết (`writing`): id câu phải là đề Viết tồn tại (nguồn Viết), không trùng; type_code TĂNG
 *    DẦN NGHIÊM NGẶT (W51 < W52 < W53 < W54, mỗi dạng một câu) và có điểm trong `writing_points` ->
 *    LỖI chặn mọi trạng thái. Số câu theo blueprint như các phần khác (draft cảnh báo, published lỗi).
 *    Luật audio và luật nhãn đúng KHÔNG áp dụng cho Viết.
 *  - Luật audio: mọi câu Nghe (phần `listening`) trong đề phải có `audio_url` khác rỗng; thiếu thì
 *    gộp MỘT cảnh báo liệt kê id thiếu (draft) hoặc MỘT lỗi chặn (published). Áp dụng mọi kind.
 *  - Riêng đề `placement` (Test trình độ), cũng chỉ chặn khi `published`: đề phải phủ đủ bậc độ khó,
 *    liên tục từ bậc thấp nhất, mỗi bậc đủ câu
 *    (xem PLACEMENT_MIN_BANDS / PLACEMENT_MIN_PER_BAND) để ước lượng trình độ có nghĩa.
 */

export const EXAM_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GROUP_KEY_REGEX = /^([lr])([0-9]{2})-([0-9]{2})-([0-9]{4})$/;
/** Tối đa 6 giờ cho một phần thi, chặn giá trị rác. */
const MAX_SECTION_DURATION_SEC = 6 * 60 * 60;

/** Kỹ năng đề thi hiện hỗ trợ: trắc nghiệm (chấm tự động) và Viết (người học tự chấm). Nói chưa có. */
export const EXAM_SKILLS = ["listening", "reading", "writing"] as const;
export type ExamSkill = (typeof EXAM_SKILLS)[number];

/**
 * Luật phủ bậc độ khó của đề `placement`: ít nhất bấy nhiêu bậc khác nhau trong `difficulty_range`,
 * các bậc LIÊN TỤC từ `difficulty_range.min` (không lỗ, không thiếu bậc thấp nhất), mỗi bậc có mặt
 * trong đề phải có ít nhất bấy nhiêu câu. Với ngưỡng 60%: 2 câu = phải đúng hết, 3 câu = đúng >= 2/3.
 */
export const PLACEMENT_MIN_BANDS = 3;
export const PLACEMENT_MIN_PER_BAND = 3;

/** Số id tối đa liệt kê trong thông báo thiếu audio (còn lại gộp thành "và N câu khác"). */
const AUDIO_MISSING_LIST_LIMIT = 12;

export const EXAM_STATUSES = ["draft", "published"] as const;

// ------------------------------------------------------------------ schema

const required = (typeMsg: string) => (iss: { input?: unknown }) =>
  iss.input === undefined ? "thiếu trường bắt buộc" : typeMsg;

const nonBlank = z
  .string({ error: required("phải là chuỗi văn bản") })
  .refine((s) => s.trim().length > 0, { error: "không được để trống" });

function enumOf<const T extends readonly [string, ...string[]]>(values: T, what = "giá trị") {
  return z.enum(values, {
    error: (iss) =>
      iss.input === undefined
        ? "thiếu trường bắt buộc"
        : `${what} không hợp lệ, cho phép: ${values.join(", ")}`,
  });
}

export const examFileSchema = z.object({
  id: z
    .string({ error: required("phải là chuỗi văn bản") })
    .regex(EXAM_ID_REGEX, { error: "id đề chỉ gồm chữ thường, số và dấu gạch ngang (vd. doc-01)" }),
  kind: enumOf(EXAM_KINDS),
  title: nonBlank,
  status: enumOf(EXAM_STATUSES),
  program: z.string({ error: "phải là chuỗi văn bản" }).optional(),
  sections: z
    .array(
      z.object({
        skill: enumOf(EXAM_SKILLS, "kỹ năng (hoặc chưa hỗ trợ)"),
        duration_sec: z
          .number({ error: "phải là số nguyên giây" })
          .int({ error: "phải là số nguyên giây" })
          .positive({ error: "phải lớn hơn 0" })
          .max(MAX_SECTION_DURATION_SEC, { error: "quá lớn (tối đa 6 giờ)" })
          .optional(),
        questions: z
          .array(nonBlank, { error: required("phải là danh sách id câu hỏi") })
          .min(1, { error: "phần thi phải có ít nhất 1 câu" }),
      }),
      { error: required("phải là danh sách phần thi") },
    )
    .min(1, { error: "đề phải có ít nhất 1 phần thi" }),
});

export type ExamFile = z.infer<typeof examFileSchema>;

// ------------------------------------------------------------------ kiểm tra một file đề

/** Thông tin tối thiểu của câu hỏi mà luật đề cần (lấy từ file câu hỏi đã phân tích). */
export interface ExamQuestionRef {
  id: string;
  type_code: string;
  group_key?: string;
  /** Chỉ số (0–3) của đáp án đúng; undefined nếu chưa xác định được. */
  correctIndex?: number;
  /** Độ khó (số nguyên, thang `difficulty_range`); undefined nếu chưa xác định được. */
  difficulty?: number;
  /** `audio_url` của câu (chỉ câu Nghe). undefined/null/rỗng = chưa có audio. */
  audio_url?: string | null;
}

export interface ExamFileContext {
  file: string;
  program: ProgramConfig;
  /** Tên thư mục kind trong đường dẫn (vd. "mini"). */
  dirKind: string;
  /** Tên file bỏ đuôi .yaml. */
  basename: string;
}

function formatPath(segments: readonly PropertyKey[]): string {
  let out = "";
  for (const seg of segments) {
    if (typeof seg === "number") out += `[${seg}]`;
    else out += out ? `.${String(seg)}` : String(seg);
  }
  return out;
}

const CHOICE_LABELS = ["①", "②", "③", "④"] as const;

type Reporter = (path: string, message: string, code?: string) => void;

/**
 * Kiểm tra một file đề đã parse YAML. `questions` là kho câu hỏi (theo id) để đối chiếu.
 * Trả về nội dung đề nếu qua được schema (kể cả khi còn lỗi ngữ nghĩa khác), ngược lại undefined.
 */
export function validateExamFile(
  doc: unknown,
  ctx: ExamFileContext,
  questions: ReadonlyMap<string, ExamQuestionRef>,
  out: ValidationIssue[],
): ExamFile | undefined {
  const { file, program } = ctx;
  const add = (severity: Severity, path: string, message: string, code?: string) =>
    out.push({ severity, file, path, message, ...(code ? { code } : {}) });
  const error: Reporter = (path, message, code) => add("error", path, message, code);

  const parsed = examFileSchema.safeParse(doc);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) error(formatPath(issue.path), issue.message);
    return undefined;
  }
  const exam = parsed.data;
  const kind: ExamKindCode = exam.kind;

  // Draft chỉ cảnh báo, published thì chặn.
  const soft: Severity = exam.status === "published" ? "error" : "warning";
  const softAdd: Reporter = (path, message, code) => add(soft, path, message, code);

  if (exam.id !== ctx.basename) {
    error("id", `id "${exam.id}" không khớp tên file "${ctx.basename}"`);
  }
  if (exam.kind !== ctx.dirKind) {
    error("kind", `kind "${exam.kind}" không khớp thư mục "${ctx.dirKind}"`);
  }
  if (exam.program !== undefined && exam.program !== program.code) {
    error("program", `program "${exam.program}" không khớp thư mục chương trình "${program.code}"`);
  }

  const skillOf = (typeCode: string) =>
    program.question_types.find((t) => t.code === typeCode)?.skill;

  const seenSkills = new Set<string>();
  const placementDifficulties: number[] = [];
  const seenIds = new Map<string, string>(); // id -> "sections[i].questions[j]"

  exam.sections.forEach((section, si) => {
    const base = `sections[${si}]`;
    if (seenSkills.has(section.skill)) {
      error(`${base}.skill`, `kỹ năng "${section.skill}" xuất hiện ở hai phần thi`);
    }
    seenSkills.add(section.skill);

    const blueprint = getExamBlueprint(program, kind, section.skill);
    if (!blueprint) {
      error(
        `${base}.skill`,
        `chương trình ${program.code} không có phần thi "${section.skill}" cho đề loại "${kind}"`,
      );
    } else if (section.questions.length !== blueprint.question_count) {
      softAdd(
        `${base}.questions`,
        `phần ${section.skill} có ${section.questions.length} câu, cấu hình đề "${kind}" yêu cầu ${blueprint.question_count}`,
        "question-count",
      );
    }

    const resolved: ExamQuestionRef[] = [];
    section.questions.forEach((id, qi) => {
      const path = `${base}.questions[${qi}]`;
      const prev = seenIds.get(id);
      if (prev) {
        error(path, `câu "${id}" bị trùng (đã có ở ${prev})`);
        return;
      }
      seenIds.set(id, path);
      const ref = questions.get(id);
      if (!ref) {
        error(path, `câu "${id}" không tồn tại trong practice/ (hoặc file câu hỏi bị lỗi)`);
        return;
      }
      const skill = skillOf(ref.type_code);
      if (skill !== section.skill) {
        error(
          path,
          `câu "${id}" (${ref.type_code}) thuộc kỹ năng ${skill ?? "?"}, không thuộc phần ${section.skill}`,
        );
        return;
      }
      resolved.push(ref);
      if (ref.difficulty !== undefined) placementDifficulties.push(ref.difficulty);
    });

    checkGroups(section.questions, questions, base, error);

    if (section.skill === "writing") {
      checkWritingSection(resolved, program, base, error);
      return; // Viết không có audio, không có nhãn đúng: bỏ qua hai luật bên dưới.
    }

    // Luật audio: đề có phần Nghe thì mọi câu Nghe phải có audio_url (gộp một thông báo).
    if (section.skill === "listening") {
      const noAudio = resolved.filter((r) => !r.audio_url || r.audio_url.trim() === "");
      if (noAudio.length > 0) {
        const shown = noAudio.slice(0, AUDIO_MISSING_LIST_LIMIT).map((r) => r.id);
        const rest = noAudio.length - shown.length;
        softAdd(
          `${base}.questions`,
          `${noAudio.length}/${resolved.length} câu Nghe thiếu audio_url: ${shown.join(", ")}${rest > 0 ? ` và ${rest} câu khác` : ""}`,
          "audio-missing",
        );
      }
    }

    // Luật nhãn đúng: tính trên các câu đã xác định được đáp án, theo thứ tự trong đề.
    if (resolved.length === section.questions.length) {
      const known = resolved.filter((r) => r.correctIndex !== undefined);
      if (known.length < resolved.length) {
        softAdd(
          `${base}.questions`,
          `${resolved.length - known.length} câu chưa xác định được nhãn đúng, bỏ qua khi kiểm phân bố nhãn`,
          "label-unknown",
        );
      }
      const indexes = known.map((r) => r.correctIndex!);
      for (const problem of checkExamLabelRules(indexes, CHOICE_LABELS)) {
        softAdd(`${base}.questions`, `luật nhãn đúng của đề: ${problem.message}`, "label-rule");
      }
    }
  });

  if (kind === "placement") {
    checkPlacementBands(placementDifficulties, program, softAdd);
  }

  return exam;
}

/**
 * Luật riêng của phần Viết: type_code tăng dần NGHIÊM NGẶT (đúng thứ tự đề thật, mỗi dạng tối đa một
 * câu) và mỗi dạng phải có điểm trong `writing_points` (không có thì không tính được điểm tối đa).
 */
function checkWritingSection(
  resolved: readonly ExamQuestionRef[],
  program: ProgramConfig,
  base: string,
  error: Reporter,
): void {
  const codes = resolved.map((r) => r.type_code);
  const bad = codes.findIndex((c, i) => i > 0 && c <= codes[i - 1]!);
  if (bad >= 0) {
    error(
      `${base}.questions`,
      `các câu Viết phải xếp theo type_code tăng dần và mỗi dạng một câu (W51, W52, W53, W54), đề đang có: ${codes.join(", ")}`,
      "writing-order",
    );
  }
  for (const ref of resolved) {
    if (program.writing_points[ref.type_code] === undefined) {
      error(
        `${base}.questions`,
        `chương trình ${program.code} chưa cấu hình điểm (writing_points) cho dạng ${ref.type_code} của câu "${ref.id}"`,
        "writing-points-missing",
      );
    }
  }
}

/**
 * Đề `placement` phải phủ ≥ PLACEMENT_MIN_BANDS bậc độ khó khác nhau trong `difficulty_range`, mỗi bậc
 * có mặt ≥ PLACEMENT_MIN_PER_BAND câu. Tính trên mọi phần của đề (câu đã tra được độ khó).
 */
function checkPlacementBands(
  difficulties: readonly number[],
  program: ProgramConfig,
  report: Reporter,
): void {
  const { min, max } = program.difficulty_range;
  const counts = new Map<number, number>();
  for (const d of difficulties) {
    if (d >= min && d <= max) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  if (counts.size < PLACEMENT_MIN_BANDS) {
    report(
      "sections",
      `đề placement chỉ phủ ${counts.size} bậc độ khó (${[...counts.keys()].sort((a, b) => a - b).join(", ") || "không có"}), cần ít nhất ${PLACEMENT_MIN_BANDS} bậc khác nhau trong ${min}–${max}`,
      "placement-bands",
    );
  }
  // Liên tục từ bậc thấp nhất: mọi bậc từ min đến bậc cao nhất có câu đều phải có mặt.
  if (counts.size > 0) {
    const top = Math.max(...counts.keys());
    const missing: number[] = [];
    for (let d = min; d <= top; d++) if (!counts.has(d)) missing.push(d);
    if (missing.length > 0) {
      report(
        "sections",
        `đề placement thiếu bậc độ khó ${missing.join(", ")}: các bậc phải liên tục từ ${min} đến bậc cao nhất của đề (${top}), không bỏ cách bậc nào`,
        "placement-band-gap",
      );
    }
  }
  for (const [difficulty, count] of [...counts].sort((a, b) => a[0] - b[0])) {
    if (count < PLACEMENT_MIN_PER_BAND) {
      report(
        "sections",
        `đề placement: bậc độ khó ${difficulty} chỉ có ${count} câu, cần ít nhất ${PLACEMENT_MIN_PER_BAND} câu mỗi bậc`,
        "placement-band-size",
      );
    }
  }
}

/** Bộ câu dùng chung ngữ liệu (cùng group_key) phải đủ câu, liền nhau, đúng thứ tự type_code. */
function checkGroups(
  ids: readonly string[],
  questions: ReadonlyMap<string, ExamQuestionRef>,
  base: string,
  error: Reporter,
): void {
  const byKey = new Map<string, number[]>();
  ids.forEach((id, i) => {
    const key = questions.get(id)?.group_key;
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), i]);
  });
  for (const [key, positions] of byKey) {
    const m = GROUP_KEY_REGEX.exec(key);
    const path = `${base}.questions[${positions[0]}]`;
    if (!m) continue; // group_key sai định dạng đã bị báo ở file câu hỏi
    const expected = Number(m[3]) - Number(m[2]) + 1;
    if (positions.length !== expected) {
      error(
        path,
        `bộ "${key}" cần đủ ${expected} câu dùng chung ngữ liệu, đề chỉ có ${positions.length} (${positions.map((p) => ids[p]).join(", ")})`,
        "group-incomplete",
      );
      continue;
    }
    const first = positions[0]!;
    const last = positions[positions.length - 1]!;
    if (last - first + 1 !== positions.length) {
      error(path, `các câu của bộ "${key}" phải đứng liền nhau trong phần thi`, "group-contiguous");
      continue;
    }
    const codes = positions.map((p) => questions.get(ids[p]!)!.type_code);
    if (codes.some((c, i) => i > 0 && c <= codes[i - 1]!)) {
      error(
        path,
        `các câu của bộ "${key}" phải xếp theo type_code tăng dần (${codes.join(", ")})`,
        "group-order",
      );
    }
  }
}
