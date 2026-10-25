import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { countChars } from "./char-count";
import {
  analyzeAnswerLabels,
  checkChartSemantics,
  checkParagraphWhitespace,
  checkTags,
} from "./content-rules";
import { validateExamFile, type ExamQuestionRef } from "./exam-validation";
import { isLexiconPath, validateLexicon } from "./lexicon-validation";
import { estimateManuscriptCells } from "./manuscript";
import { listPrograms } from "./programs";
import type { ProgramConfig, QuestionTypeConfig } from "./programs";

/**
 * Kiểm tra nội dung câu hỏi trong content/ theo content-spec mục 5 (5.1–5.9).
 * Logic thuần (không đọc đĩa) để test dễ; đọc thư mục + in báo cáo ở scripts/validate-content.ts.
 *
 * Quy ước: mỗi file = MỘT câu hỏi, đường dẫn content/<program>/practice/<TYPE_CODE>/<id>.yaml.
 * File đề thi: content/<program>/exams/<kind>/<id>.yaml (kiểm ở ./exam-validation.ts, đối chiếu
 * với các câu hỏi cùng lượt kiểm). File từ vựng & ngữ pháp (<program>/vocab/**, <program>/grammar/**)
 * kiểm ở ./lexicon-validation.ts (vocab-grammar-spec §8). YAML ngoài các thư mục trên (strategies…) -> bỏ qua.
 *
 * Theo content-spec v0.3. Chưa làm (TODO, đều là cảnh báo hoặc phụ thuộc định dạng chưa chốt):
 *  - cảnh báo "độ dài ngữ liệu lệch quá 30% so với mục 4" (cần bảng độ dài chuẩn theo nhóm
 *    dạng ở §4.4–4.6 đưa vào cấu hình chương trình; transcript đếm sau khi bỏ nhãn);
 *  - cảnh báo "phân bố nhãn đúng lệch" (spec chỉ nói "khoảng 25% mỗi nhãn", chưa có ngưỡng);
 *  - luật của ĐỀ LẮP RÁP (phân bố nhãn, không quá 3 câu liền nhau cùng nhãn, không chu kỳ lặp) đã
 *    chạy trên file đề (./exam-validation.ts): lỗi khi `published`, cảnh báo khi `draft`. Lô soạn
 *    theo từng thư mục type_code (từ 8 câu trở lên) vẫn chỉ cảnh báo.
 *  - "Chỉ định dạng" (§8.2) được xác nhận bởi lib/db/format-only.ts + cờ --format-only-against.
 */

// ------------------------------------------------------------------ kiểu công khai

export type Severity = "error" | "warning";

export interface ValidationIssue {
  severity: Severity;
  /** Đường dẫn file, tương đối so với thư mục content, dùng dấu "/". */
  file: string;
  /** Đường dẫn trường trong file, vd. "choices[1].note_vi". Rỗng = cả file. */
  path: string;
  message: string;
  /** Mã nhóm lỗi, dùng để gộp báo cáo (vd. "not-reviewed"). */
  code?: string;
}

export interface ContentFileInput {
  file: string;
  text: string;
}

export interface ValidationOptions {
  /** Mặc định: registry trong lib/db/programs. Truyền vào để test chương trình giả. */
  programs?: readonly ProgramConfig[];
  /**
   * Chế độ import vào CSDL (luật 12): reviewed_by null hoặc source khác "original"
   * thành LỖI. Mặc định là cảnh báo vì lúc soạn reviewed_by luôn null.
   */
  forImport?: boolean;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  filesChecked: number;
  /** File YAML không phải câu hỏi, đề thi hay từ vựng/ngữ pháp (vd. strategies/) nên bỏ qua. */
  filesSkipped: number;
  questionsChecked: number;
  /** Số file đề thi (<program>/exams/**) đã kiểm. */
  examsChecked: number;
  /** Số file từ vựng & ngữ pháp (<program>/vocab/**, <program>/grammar/**) đã kiểm. */
  lexiconChecked: number;
}

// ------------------------------------------------------------------ hằng số theo spec

export const ID_REGEX = /^[lrw][0-9]{2}-[0-9]{4}$/;
export const TYPE_CODE_REGEX = /^(L(0[1-9]|[1-4][0-9]|50)|R(0[1-9]|[1-4][0-9]|50)|W5[1-4])$/;
export const CHOICE_LABELS = ["①", "②", "③", "④"] as const;
const BLANK_LABELS = ["㉠", "㉡"] as const;
const GROUP_KEY_REGEX = /^([lr])([0-9]{2})-([0-9]{2})-([0-9]{4})$/;
/** Số câu tối thiểu trong một thư mục type_code để kiểm nhãn đúng của lô. */
const MIN_BATCH_FOR_LABEL_CHECK = 8;
const TRANSCRIPT_LABEL = /^(남자|여자)( [0-9])?: /u;
/** Đuôi câu không hợp văn phong 문어체 (-요. / -습니다. / -ㅂ니다.) trong bài mẫu Viết. */
const SPOKEN_ENDING = /(요|니다)\s*[.?!]/u;
const PLACEHOLDER_NOTE = /^[\s.…\-–—?!]*$|^(todo|tbd|xxx)$/i;
/** Biên an toàn của bài mẫu so với giới hạn ký tự (spec 5.7). */
const SAMPLE_MARGIN = 10;

type Variant = "A" | "B" | "C1" | "C2";

function variantOf(typeCode: string): Variant | undefined {
  if (!TYPE_CODE_REGEX.test(typeCode)) return undefined;
  if (typeCode.startsWith("R")) return "A";
  if (typeCode.startsWith("L")) return "B";
  return typeCode === "W51" || typeCode === "W52" ? "C1" : "C2";
}

// ------------------------------------------------------------------ schema zod

const miss = (typeMsg: string) => (iss: { input?: unknown }) =>
  iss.input === undefined ? "thiếu trường bắt buộc" : typeMsg;

const nonBlank = (s: string) => s.trim().length > 0;

function str(what = "chuỗi văn bản") {
  return z
    .string({ error: miss(`phải là ${what}`) })
    .refine(nonBlank, { error: "không được để trống" });
}

function strOptional() {
  return z.string({ error: "phải là chuỗi văn bản" }).optional();
}

function list<T extends z.ZodType>(item: T) {
  return z.array(item, { error: miss("phải là danh sách") });
}

function dateStr() {
  return z.string({ error: "phải là ngày dạng YYYY-MM-DD" }).regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: "phải là ngày dạng YYYY-MM-DD",
  });
}

function enumOf<const T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values, {
    error: (iss) =>
      iss.input === undefined
        ? "thiếu trường bắt buộc"
        : `giá trị không hợp lệ, cho phép: ${values.join(", ")}`,
  });
}

const chartSchema = z.object(
  {
    chart_type: enumOf(["line", "bar", "pie", "table"]),
    title: str(),
    caption: strOptional(),
    unit: str(),
    series: list(
      z.object({
        name: z.union([z.string(), z.number()], { error: miss("phải là chuỗi hoặc số") }),
        points: list(
          z.object({
            x: z.union([z.string(), z.number()], { error: miss("phải là chuỗi hoặc số") }),
            y: z.number({ error: miss("phải là số") }),
          }),
        ),
      }),
    ),
  },
  { error: miss("phải là đối tượng biểu đồ") },
);

/** chart_data luôn là list (kể cả 1 biểu đồ); lỗi báo đúng đường dẫn bên trong. */
const chartData = z
  .unknown()
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined || value === null) return;
    if (!Array.isArray(value)) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "phải là danh sách biểu đồ (luôn là list, kể cả khi chỉ có 1 biểu đồ)",
      });
      return;
    }
    value.forEach((item, i) => {
      const result = chartSchema.safeParse(item);
      if (result.success) return;
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", path: [i, ...issue.path], message: issue.message });
      }
    });
  });

function buildSchemas(program: ProgramConfig) {
  const traps = program.traps.map((t) => t.code) as [string, ...string[]];
  const { min, max } = program.difficulty_range;

  const choice = z.object(
    {
      label: str(),
      // Cho phép "" với phương án là hình (L01–L03) — luật cụ thể kiểm riêng ở dưới.
      text: z.union([z.string(), z.number()], { error: miss("phải là chuỗi văn bản") }),
      correct: z.boolean({ error: "phải là true hoặc false" }).optional(),
      note_vi: strOptional(),
      trap: enumOf(traps).optional(),
      image_desc: strOptional(),
      chart_data: chartData,
    },
    { error: miss("mỗi phương án phải là một đối tượng") },
  );

  const common = {
    id: str(),
    program: strOptional(),
    type_code: str(),
    subskill: str(),
    difficulty: z
      .number({ error: miss(`phải là số nguyên từ ${min} đến ${max}`) })
      .int({ error: `phải là số nguyên từ ${min} đến ${max}` })
      .min(min, { error: `phải nằm trong khoảng ${min}–${max}` })
      .max(max, { error: `phải nằm trong khoảng ${min}–${max}` }),
    tags: list(z.string({ error: "mỗi tag phải là chuỗi" })).min(1, {
      error: "cần ít nhất 1 tag",
    }),
    stem: str(),
    explanation_vi: str(),
    group_key: z.string({ error: "phải là chuỗi văn bản" }).nullable().optional(),
    pair_with: z
      .array(z.string({ error: "mỗi phần tử phải là id" }), { error: "phải là danh sách id" })
      .nullable()
      .optional(),
    source: str(),
    authored_by: str(),
    created_at: dateStr().optional(),
    // Bắt buộc có khoá, giá trị null khi soạn (spec 5.2).
    reviewed_by: z
      .string({ error: miss("phải là chuỗi hoặc null") })
      .nullable()
      .refine((v) => v === null || nonBlank(v), { error: "không được để trống (dùng null)" }),
    reviewed_at: dateStr().nullable().optional(),
    notes_internal: strOptional(),
  };

  const figure = {
    image_desc: strOptional(),
    image_url: z.string({ error: "phải là chuỗi hoặc null" }).nullable().optional(),
    chart_data: chartData,
    data_is_fictional: z.boolean({ error: "phải là true hoặc false" }).optional(),
  };

  const choices = list(choice).length(4, { error: "phải có đúng 4 phương án" });

  const speaker = z.object(
    {
      label: str(),
      gender: enumOf(["male", "female"]),
      role_vi: strOptional(),
      age_range: enumOf(program.speaker_age_ranges as unknown as [string, ...string[]]).optional(),
      voice_hint_vi: strOptional(),
    },
    { error: miss("mỗi người nói phải là một đối tượng") },
  );

  const ttsNotes = z.object(
    {
      speed: z.number({ error: miss("phải là số") }),
      style_vi: str(),
      pauses_vi: strOptional(),
      pronunciation_vi: strOptional(),
    },
    { error: miss("phải là đối tượng") },
  );

  const blank = z.object(
    {
      label: str(),
      accepted_answers: list(z.string({ error: "mỗi đáp án phải là chuỗi" })),
      required_elements_vi: list(z.string({ error: "phải là chuỗi" })).min(1, {
        error: "cần ít nhất 1 yếu tố",
      }),
      partial_answers: z.array(z.string()).optional(),
      rejected_answers: z
        .array(z.object({ text: str(), reason_vi: str() }, { error: "phải là {text, reason_vi}" }))
        .optional(),
      note_vi: strOptional(),
    },
    { error: miss("mỗi chỗ trống phải là một đối tượng") },
  );

  const modelAnswer = z.object(
    {
      level: z.number({ error: miss("phải là số") }).int({ error: "phải là số nguyên" }),
      text: str(),
      char_count: z
        .number({ error: miss("phải là số nguyên") })
        .int({ error: "phải là số nguyên" }),
      covers: list(z.string()),
      rubric_notes_vi: z.object(
        { task_fulfillment: str(), organization: str(), language_use: str() },
        { error: miss("phải có task_fulfillment, organization, language_use") },
      ),
    },
    { error: miss("mỗi bài mẫu phải là một đối tượng") },
  );

  const shapes = {
    A: {
      ...common,
      // Bắt buộc trừ R10 (spec §5.3) — kiểm ở checkReading.
      passage: str().optional(),
      insert_sentence: strOptional(),
      ...figure,
      choices,
    },
    B: {
      ...common,
      transcript_ko: str(),
      transcript_vi: str(),
      speakers: list(speaker).min(1, { error: "cần ít nhất 1 người nói" }),
      audio_url: z.string({ error: miss("phải là chuỗi hoặc null") }).nullable(),
      tts_notes: ttsNotes,
      ...figure,
      choices,
    },
    C1: {
      ...common,
      passage: str(),
      register: enumOf(["formal_polite", "polite", "written_plain"]),
      blanks: list(blank),
      scoring_notes_vi: str(),
      common_mistakes_vi: list(z.string({ error: "phải là chuỗi" })).min(1, {
        error: "cần ít nhất 1 lỗi thường gặp",
      }),
    },
    C2: {
      ...common,
      task: str(),
      ...figure,
      required_points: list(
        z.object({ id: str(), ko: str(), vi: str() }, { error: miss("phải là {id, ko, vi}") }),
      ).min(1, { error: "cần ít nhất 1 điểm yêu cầu" }),
      char_limit: z.object(
        {
          min: z.number({ error: miss("phải là số nguyên") }).int({ error: "phải là số nguyên" }),
          max: z.number({ error: miss("phải là số nguyên") }).int({ error: "phải là số nguyên" }),
        },
        { error: miss("phải là {min, max}") },
      ),
      model_answers: list(modelAnswer),
      outline_vi: strOptional(),
      expression_bank: z
        .array(z.object({ ko: str(), vi: str() }, { error: "phải là {ko, vi}" }))
        .optional(),
      scoring_notes_vi: str(),
      common_mistakes_vi: list(z.string({ error: "phải là chuỗi" })).min(1, {
        error: "cần ít nhất 1 lỗi thường gặp",
      }),
    },
  } as const;

  // Biến thể A/B/C1/C2 phân biệt bằng trường `variant` do validator suy ra từ type_code.
  const union = z.discriminatedUnion("variant", [
    z.looseObject({ variant: z.literal("A"), ...shapes.A }),
    z.looseObject({ variant: z.literal("B"), ...shapes.B }),
    z.looseObject({ variant: z.literal("C1"), ...shapes.C1 }),
    z.looseObject({ variant: z.literal("C2"), ...shapes.C2 }),
  ]);

  const knownKeys: Record<Variant, Set<string>> = {
    A: new Set(["variant", ...Object.keys(shapes.A)]),
    B: new Set(["variant", ...Object.keys(shapes.B)]),
    C1: new Set(["variant", ...Object.keys(shapes.C1)]),
    C2: new Set(["variant", ...Object.keys(shapes.C2)]),
  };

  return { union, commonOnly: z.looseObject(common), knownKeys };
}

const schemaCache = new WeakMap<ProgramConfig, ReturnType<typeof buildSchemas>>();
function schemasFor(program: ProgramConfig) {
  let s = schemaCache.get(program);
  if (!s) {
    s = buildSchemas(program);
    schemaCache.set(program, s);
  }
  return s;
}

// ------------------------------------------------------------------ tiện ích

function formatPath(segments: readonly PropertyKey[]): string {
  let out = "";
  for (const seg of segments) {
    if (typeof seg === "number") out += `[${seg}]`;
    else out += out ? `.${String(seg)}` : String(seg);
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyLines(text: unknown): string[] {
  return typeof text === "string"
    ? text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0)
    : [];
}

/** Gom mọi chuỗi trong tài liệu để kiểm NFC. */
function collectNonNfc(value: unknown, path: string, out: string[]): void {
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectNonNfc(v, `${path}[${i}]`, out));
  } else if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) {
      collectNonNfc(v, path ? `${path}.${k}` : k, out);
    }
  }
}

/** Trường dùng chung trong bộ câu (spec 1.3): phải giống hệt giữa các file cùng group_key. */
const SHARED_FIELDS = ["passage", "transcript_ko", "transcript_vi", "audio_url"] as const;

interface Parsed {
  file: string;
  /** Thư mục type_code chứa file và chương trình — để phân tích nhãn đúng theo lô. */
  dirType: string;
  programCode: string;
  /** Chỉ số (0–3) của đáp án đúng, nếu là câu trắc nghiệm hợp lệ. */
  correctIndex: number | undefined;
  /** Độ khó khai báo trong file (số nguyên), nếu có — luật phủ bậc độ khó của đề placement. */
  difficulty: number | undefined;
  id: string | undefined;
  groupKey: string | undefined;
  pairWith: string[] | undefined;
  shared: Record<(typeof SHARED_FIELDS)[number], unknown>;
}

type Reporter = (path: string, message: string, code?: string) => void;

// ------------------------------------------------------------------ kiểm tra một file câu hỏi

interface FileContext {
  file: string;
  program: ProgramConfig;
  dirType: string;
  basename: string;
  forImport: boolean;
}

function checkQuestionFile(doc: unknown, ctx: FileContext, out: ValidationIssue[]): Parsed {
  const { file, program } = ctx;
  const add = (severity: Severity, path: string, message: string, code?: string) =>
    out.push({ severity, file, path, message, ...(code ? { code } : {}) });
  const error: Reporter = (path, message, code) => add("error", path, message, code);
  const warn: Reporter = (path, message, code) => add("warning", path, message, code);

  const parsed: Parsed = {
    file,
    dirType: ctx.dirType,
    programCode: program.code,
    correctIndex: undefined,
    difficulty: undefined,
    id: undefined,
    groupKey: undefined,
    pairWith: undefined,
    shared: {
      passage: undefined,
      transcript_ko: undefined,
      transcript_vi: undefined,
      audio_url: undefined,
    },
  };

  if (!isRecord(doc)) {
    error(
      "",
      Array.isArray(doc)
        ? "mỗi file chỉ chứa MỘT câu hỏi (không dùng danh sách)"
        : "file phải là một đối tượng YAML (một câu hỏi)",
    );
    return parsed;
  }
  if ("questions" in doc) {
    error("questions", "mỗi file chỉ chứa MỘT câu hỏi; không dùng questions: [...]");
    return parsed;
  }

  const data = doc;
  const typeCode = typeof data.type_code === "string" ? data.type_code.trim() : undefined;
  const type: QuestionTypeConfig | undefined = typeCode
    ? program.question_types.find((t) => t.code === typeCode)
    : undefined;
  const variant = typeCode ? variantOf(typeCode) : undefined;
  const schemas = schemasFor(program);

  // ---- 1) Cấu trúc & kiểu dữ liệu (zod, phân biệt biến thể)
  if (variant) {
    const result = schemas.union.safeParse({ ...data, variant });
    if (!result.success) {
      for (const issue of result.error.issues) error(formatPath(issue.path), issue.message);
    }
    for (const key of Object.keys(data)) {
      if (!schemas.knownKeys[variant].has(key)) {
        warn(key, `trường "${key}" không có trong schema biến thể ${variant}`, "unknown-field");
      }
    }
  } else {
    const result = schemas.commonOnly.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) error(formatPath(issue.path), issue.message);
    }
  }

  // ---- 2) id
  const id = typeof data.id === "string" ? data.id.trim() : undefined;
  parsed.id = id;
  if (id !== undefined) {
    if (!ID_REGEX.test(id)) {
      error("id", `id "${id}" sai định dạng, cần dạng ${ID_REGEX.source} (vd. r39-0001)`);
    } else {
      if (id !== ctx.basename) {
        error("id", `id "${id}" không khớp tên file "${ctx.basename}"`);
      }
      if (typeCode && !id.startsWith(typeCode.toLowerCase() + "-")) {
        error("id", `tiền tố của id "${id}" không khớp type_code "${typeCode}"`);
      }
    }
  }

  // ---- 3) type_code
  if (typeCode !== undefined) {
    if (!TYPE_CODE_REGEX.test(typeCode)) {
      error("type_code", `type_code "${typeCode}" sai định dạng (L01–L50, R01–R50, W51–W54)`);
    } else if (!type) {
      error(
        "type_code",
        `type_code "${typeCode}" không có trong question_types của chương trình ${program.code}`,
      );
    }
    if (typeCode !== ctx.dirType) {
      error("type_code", `type_code "${typeCode}" không khớp thư mục "${ctx.dirType}" chứa file`);
    }
  }

  // ---- chương trình khai báo trong file phải khớp đường dẫn
  if (typeof data.program === "string" && data.program !== program.code) {
    error("program", `program "${data.program}" không khớp thư mục chương trình "${program.code}"`);
  }

  // ---- 4) subskill
  if (type && typeof data.subskill === "string") {
    if (!program.subskills.some((s) => s.code === data.subskill)) {
      error("subskill", `subskill "${data.subskill}" không có trong danh mục subskill`);
    } else if (!type.allowed_subskills.includes(data.subskill)) {
      error(
        "subskill",
        `subskill "${data.subskill}" ngoài tập cho phép của ${type.code}: ${type.allowed_subskills.join(", ")}`,
      );
    }
  }

  // ---- độ khó điển hình (cảnh báo): lệch ±1 được phép nhưng phải ghi lý do ở notes_internal
  if (type && typeof data.difficulty === "number" && Number.isInteger(data.difficulty)) {
    const [lo, hi] = type.typical_difficulty;
    if (data.difficulty < lo - 1 || data.difficulty > hi + 1) {
      warn(
        "difficulty",
        `độ khó ${data.difficulty} lệch hơn 1 bậc so với mức điển hình ${lo}–${hi} của ${type.code}`,
      );
    } else if (
      (data.difficulty < lo || data.difficulty > hi) &&
      !(typeof data.notes_internal === "string" && data.notes_internal.trim())
    ) {
      warn(
        "difficulty",
        `độ khó ${data.difficulty} lệch mức điển hình ${lo}–${hi} của ${type.code}; cần nêu lý do ở notes_internal`,
      );
    }
  }

  // ---- tags (spec §6, §5.9 lỗi 13)
  if (Array.isArray(data.tags) && data.tags.every((t) => typeof t === "string")) {
    const tags = data.tags as string[];
    for (const problem of checkTags(tags, program.tag_vocabulary)) {
      error(`tags${problem.path}`, problem.message);
    }
    if (tags.length > program.tag_vocabulary.max_tags) {
      warn("tags", `có ${tags.length} tag, nên tối đa ${program.tag_vocabulary.max_tags}`);
    }
  }

  // ---- khoảng trắng của các trường theo quy ước ngăn đoạn (spec §5.9 lỗi 14)
  checkParagraphFields(data, error);

  // ---- 12) source & reviewed_by: lỗi khi import, cảnh báo khi soạn
  if (typeof data.source === "string" && data.source !== "original") {
    add(
      ctx.forImport ? "error" : "warning",
      "source",
      `source phải là "original" (nội dung tự biên soạn), hiện là "${data.source}"`,
    );
  }
  if (data.reviewed_by === null) {
    add(
      ctx.forImport ? "error" : "warning",
      "reviewed_by",
      ctx.forImport
        ? "reviewed_by là null: chưa được người dùng duyệt nên không được import"
        : "chưa duyệt (reviewed_by: null)",
      "not-reviewed",
    );
  }

  // ---- NFC
  const nonNfc: string[] = [];
  collectNonNfc(data, "", nonNfc);
  for (const p of nonNfc) warn(p, "văn bản chưa ở dạng chuẩn hoá NFC", "non-nfc");

  // ---- group_key & pair_with (spec 1.3)
  const groupKey = typeof data.group_key === "string" ? data.group_key.trim() : undefined;
  parsed.groupKey = groupKey || undefined;
  if (Array.isArray(data.pair_with)) {
    parsed.pairWith = data.pair_with.filter((v): v is string => typeof v === "string");
  }
  if (type?.paired && !groupKey) {
    error("group_key", `${type.code} thuộc bộ câu ${type.type_group}: thiếu group_key`);
  }
  if (type && !type.paired && groupKey) {
    warn("group_key", `${type.code} không thuộc bộ dùng chung ngữ liệu; nên bỏ group_key`);
  }
  if (groupKey && type) {
    const m = GROUP_KEY_REGEX.exec(groupKey);
    if (!m) {
      error(
        "group_key",
        `group_key "${groupKey}" sai định dạng, cần dạng l21-22-0007 / r48-50-0002`,
      );
    } else {
      const serial = id && ID_REGEX.test(id) ? id.slice(4) : undefined;
      const expected = `${type.code[0]!.toLowerCase()}${String(type.range[0]).padStart(2, "0")}-${String(type.range[1]).padStart(2, "0")}`;
      if (`${m[1]}${m[2]}-${m[3]}` !== expected) {
        error(
          "group_key",
          `group_key "${groupKey}" không khớp nhóm ${type.type_group} (phải bắt đầu bằng "${expected}-")`,
        );
      }
      if (serial && m[4] !== serial) {
        error("group_key", `serial của group_key (${m[4]}) khác serial của id (${serial})`);
      }
    }
  }
  for (const f of SHARED_FIELDS) parsed.shared[f] = data[f];
  if (typeof data.difficulty === "number" && Number.isInteger(data.difficulty)) {
    parsed.difficulty = data.difficulty;
  }

  // ---- luật riêng theo biến thể
  checkCharts(data, warn);
  if (variant === "A" || variant === "B") {
    checkMultipleChoice(data, type, program, error, warn);
    if (Array.isArray(data.choices)) {
      const idx = data.choices.findIndex((c) => isRecord(c) && c.correct === true);
      if (idx >= 0) parsed.correctIndex = idx;
    }
  }
  if (variant === "A") checkReading(data, type, error);
  if (variant === "B") checkListening(data, error, warn);
  if (variant === "C1") checkWritingBlanks(data, typeCode, error, warn);
  if (variant === "C2") checkWritingEssay(data, type, typeCode, program, error, warn);

  return parsed;
}

/** Kiểm khoảng trắng của các trường theo quy ước ngăn đoạn (lỗi 14). */
function checkParagraphFields(data: Record<string, unknown>, error: Reporter): void {
  const check = (value: unknown, path: string) => {
    if (typeof value !== "string") return;
    for (const problem of checkParagraphWhitespace(value)) {
      error(path, problem.message, "whitespace");
    }
  };
  for (const field of ["passage", "transcript_ko", "transcript_vi", "task"]) {
    check(data[field], field);
  }
  if (Array.isArray(data.model_answers)) {
    data.model_answers.forEach((m, i) => {
      if (isRecord(m)) check(m.text, `model_answers[${i}].text`);
    });
  }
}

/** Cảnh báo ngữ nghĩa biểu đồ (pie cộng 100, series cùng tập x) ở chart_data và choices[].chart_data. */
function checkCharts(data: Record<string, unknown>, warn: Reporter): void {
  const scan = (value: unknown, base: string) => {
    if (!Array.isArray(value)) return;
    value.forEach((chart, i) => {
      if (!isRecord(chart)) return;
      for (const w of checkChartSemantics(chart)) {
        warn(`${base}[${i}]${w.path ? "." + w.path : ""}`, w.message);
      }
    });
  };
  scan(data.chart_data, "chart_data");
  if (Array.isArray(data.choices)) {
    data.choices.forEach((c, i) => {
      if (isRecord(c)) scan(c.chart_data, `choices[${i}].chart_data`);
    });
  }
}

function hasChart(data: Record<string, unknown>): boolean {
  if (data.chart_data !== undefined && data.chart_data !== null) return true;
  return (
    Array.isArray(data.choices) &&
    data.choices.some((c) => isRecord(c) && c.chart_data !== undefined && c.chart_data !== null)
  );
}

function checkMultipleChoice(
  data: Record<string, unknown>,
  type: QuestionTypeConfig | undefined,
  program: ProgramConfig,
  error: Reporter,
  warn: Reporter,
): void {
  // luật 8: có chart_data thì data_is_fictional phải true
  if (hasChart(data) && data.data_is_fictional !== true) {
    error(
      "data_is_fictional",
      "có chart_data nên data_is_fictional phải là true (số liệu giả định)",
    );
  }

  if (!Array.isArray(data.choices)) return;
  const pictureChoices = type !== undefined && /^L0[1-3]$/.test(type.code);
  let correctCount = 0;
  data.choices.forEach((c, i) => {
    if (!isRecord(c)) return;
    const expectedLabel = CHOICE_LABELS[i];
    if (typeof c.label === "string" && expectedLabel !== undefined && c.label !== expectedLabel) {
      error(
        `choices[${i}].label`,
        `nhãn phải là "${expectedLabel}" (đúng thứ tự ①②③④), hiện là "${c.label}"`,
      );
    }
    const isCorrect = c.correct === true;
    if (isCorrect) correctCount += 1;

    // text rỗng chỉ dành cho phương án là hình
    if (typeof c.text === "string" && c.text.trim() === "" && !pictureChoices) {
      error(`choices[${i}].text`, 'text rỗng ("") chỉ dùng cho phương án là hình (L01–L03)');
    }
    if (pictureChoices) {
      const hasPic =
        (typeof c.image_desc === "string" && c.image_desc.trim() !== "") ||
        (c.chart_data !== undefined && c.chart_data !== null);
      if (!hasPic) {
        error(
          `choices[${i}]`,
          `${type.code}: phương án là hình/biểu đồ nên cần image_desc hoặc chart_data`,
        );
      }
    }

    if (!isCorrect) {
      const note = c.note_vi;
      if (note === undefined || note === null || (typeof note === "string" && note.trim() === "")) {
        error(`choices[${i}].note_vi`, "phương án sai thiếu note_vi giải thích vì sao sai");
      } else if (typeof note === "string" && PLACEHOLDER_NOTE.test(note.trim())) {
        warn(
          `choices[${i}].note_vi`,
          "note_vi mới là chỗ giữ chỗ (…/TODO), cần viết lời giải thích thật",
        );
      }
      if (c.trap === undefined || c.trap === null) {
        warn(`choices[${i}].trap`, "phương án sai nên gắn mã trap", "missing-trap");
      }
    }
  });
  if (correctCount !== 1) {
    error("choices", `phải có đúng 1 đáp án đúng (correct: true), hiện có ${correctCount}`);
  }

  // Cảnh báo: ít hơn 2 kiểu trap, trừ các subskill được miễn (§2.2).
  const subskill = typeof data.subskill === "string" ? data.subskill : "";
  if (!program.multi_trap_exempt_subskills.includes(subskill)) {
    const traps = new Set(
      data.choices
        .filter((c) => isRecord(c) && c.correct !== true && typeof c.trap === "string")
        .map((c) => (c as Record<string, unknown>).trap as string),
    );
    if (traps.size < 2) {
      warn(
        "choices",
        `câu có ${traps.size} kiểu trap, nên dùng ít nhất 2 kiểu khác nhau`,
        "few-traps",
      );
    }
  }
}

function checkReading(
  data: Record<string, unknown>,
  type: QuestionTypeConfig | undefined,
  error: Reporter,
): void {
  if (!type) return;
  if (type.code !== "R10" && data.passage === undefined) {
    error("passage", "thiếu trường bắt buộc (chỉ R10 được bỏ passage)");
  }
  const n = Number(type.code.slice(1));
  if (n >= 39 && n <= 41) {
    if (typeof data.insert_sentence !== "string" || data.insert_sentence.trim() === "") {
      error("insert_sentence", `${type.code} (chèn câu) bắt buộc có insert_sentence`);
    }
  }
  if (type.code === "R10") {
    if (typeof data.image_desc !== "string" || data.image_desc.trim() === "") {
      error("image_desc", "R10 bắt buộc có image_desc");
    }
    if (data.chart_data === undefined || data.chart_data === null) {
      error("chart_data", "R10 bắt buộc có chart_data");
    }
  }
}

function checkListening(data: Record<string, unknown>, error: Reporter, warn: Reporter): void {
  if ("passage" in data) {
    error(
      "passage",
      "đề Nghe không in ngữ liệu: bỏ trường passage (dùng transcript_ko/transcript_vi)",
    );
  }
  const typeCode = typeof data.type_code === "string" ? data.type_code : "";
  if (/^L0[1-3]$/.test(typeCode)) {
    if (typeof data.image_desc !== "string" || data.image_desc.trim() === "") {
      error("image_desc", `${typeCode} bắt buộc có image_desc (bối cảnh chung)`);
    }
  }

  const ko = nonEmptyLines(data.transcript_ko);
  const vi = nonEmptyLines(data.transcript_vi);
  if (
    typeof data.transcript_ko === "string" &&
    typeof data.transcript_vi === "string" &&
    ko.length !== vi.length
  ) {
    error(
      "transcript_vi",
      `số dòng transcript_vi (${vi.length}) khác transcript_ko (${ko.length}); mỗi lượt một dòng`,
    );
  }
  const labels = new Set<string>();
  if (Array.isArray(data.speakers)) {
    for (const s of data.speakers) {
      if (isRecord(s) && typeof s.label === "string") labels.add(s.label.trim());
    }
  }
  const conversational =
    Array.isArray(data.tags) &&
    data.tags.some((t) => t === "genre:conversation" || t === "genre:phone-call");
  let previous: string | undefined;
  ko.forEach((line, i) => {
    const m = TRANSCRIPT_LABEL.exec(line);
    if (!m || line.slice(m[0].length).trim() === "") {
      error(
        "transcript_ko",
        `dòng ${i + 1} không có nhãn hợp lệ (cần dạng "남자: …" / "여자: …" / "남자 1: …")`,
      );
      previous = undefined;
      return;
    }
    const label = m[0].replace(/: $/, "");
    if (!labels.has(label)) {
      error("transcript_ko", `dòng ${i + 1}: người nói "${label}" không có trong speakers`);
    }
    if (conversational && previous === label) {
      warn(
        "transcript_ko",
        `dòng ${i} và ${i + 1} liền nhau cùng nhãn "${label}" trong hội thoại (genre conversation/phone-call)`,
        "same-speaker",
      );
    }
    previous = label;
  });
}

function checkWritingBlanks(
  data: Record<string, unknown>,
  typeCode: string | undefined,
  error: Reporter,
  warn: Reporter,
): void {
  if ("choices" in data) error("choices", "câu Viết không có choices");
  if (typeCode === "W52" && data.register !== undefined && data.register !== "written_plain") {
    error("register", "W52 luôn là văn phong written_plain (-ㄴ다)");
  }
  if (Array.isArray(data.blanks)) {
    if (data.blanks.length !== BLANK_LABELS.length) {
      error(
        "blanks",
        `cần đúng ${BLANK_LABELS.length} chỗ trống (㉠, ㉡), hiện có ${data.blanks.length}`,
      );
    }
    data.blanks.forEach((b, i) => {
      if (!isRecord(b)) return;
      const expected = BLANK_LABELS[i];
      if (typeof b.label === "string" && expected && b.label !== expected) {
        error(`blanks[${i}].label`, `nhãn phải là "${expected}", hiện là "${b.label}"`);
      }
      if (Array.isArray(b.accepted_answers) && b.accepted_answers.length < 3) {
        error(
          `blanks[${i}].accepted_answers`,
          `mỗi chỗ trống cần ít nhất 3 đáp án chấp nhận, hiện có ${b.accepted_answers.length}`,
        );
      }
    });
  }
  if (typeof data.passage === "string") {
    for (const mark of BLANK_LABELS) {
      if (!data.passage.includes(mark)) warn("passage", `passage không có chỗ trống ( ${mark} )`);
    }
  }
}

function checkWritingEssay(
  data: Record<string, unknown>,
  type: QuestionTypeConfig | undefined,
  typeCode: string | undefined,
  program: ProgramConfig,
  error: Reporter,
  warn: Reporter,
): void {
  if ("choices" in data) error("choices", "câu Viết không có choices");

  if (typeCode === "W53") {
    if (typeof data.image_desc !== "string" || data.image_desc.trim() === "") {
      error("image_desc", "W53 bắt buộc có image_desc");
    }
    if (data.chart_data === undefined || data.chart_data === null) {
      error("chart_data", "W53 bắt buộc có chart_data");
    }
    if (data.data_is_fictional !== true) {
      error("data_is_fictional", "W53 bắt buộc data_is_fictional: true (số liệu giả định)");
    }
  } else if (hasChart(data) && data.data_is_fictional !== true) {
    error(
      "data_is_fictional",
      "có chart_data nên data_is_fictional phải là true (số liệu giả định)",
    );
  }

  // char_limit khớp cấu hình chương trình
  const limit = isRecord(data.char_limit) ? data.char_limit : undefined;
  const cfg = type?.char_limit;
  if (limit && cfg && typeof limit.min === "number" && typeof limit.max === "number") {
    if (limit.min !== cfg.min || limit.max !== cfg.max) {
      error(
        "char_limit",
        `char_limit {min: ${limit.min}, max: ${limit.max}} không khớp cấu hình chương trình {min: ${cfg.min}, max: ${cfg.max}}`,
      );
    }
  }
  const min = typeof limit?.min === "number" ? limit.min : cfg?.min;
  const max = typeof limit?.max === "number" ? limit.max : cfg?.max;

  // required_points
  const pointIds = new Set<string>();
  if (Array.isArray(data.required_points)) {
    data.required_points.forEach((p, i) => {
      if (!isRecord(p) || typeof p.id !== "string") return;
      if (pointIds.has(p.id))
        error(`required_points[${i}].id`, `id điểm yêu cầu "${p.id}" bị trùng`);
      pointIds.add(p.id);
    });
  }

  // model_answers (luật 9)
  if (!Array.isArray(data.model_answers)) return;
  if (data.model_answers.length !== 2) {
    error("model_answers", `cần đúng 2 bài mẫu, hiện có ${data.model_answers.length}`);
  }
  data.model_answers.forEach((m, i) => {
    if (!isRecord(m)) return;
    const base = `model_answers[${i}]`;
    if (typeof m.text === "string") {
      const counted = countChars(m.text);
      if (typeof m.char_count === "number" && m.char_count !== counted) {
        error(
          `${base}.char_count`,
          `char_count khai báo ${m.char_count} nhưng đếm lại được ${counted} (cách đếm spec 5.7)`,
        );
      }
      if (min !== undefined && max !== undefined) {
        if (counted < min || counted > max) {
          error(`${base}.text`, `độ dài ${counted} ký tự nằm ngoài char_limit ${min}–${max}`);
        } else if (counted < min + SAMPLE_MARGIN) {
          warn(
            `${base}.text`,
            `độ dài ${counted} ký tự sát biên dưới ${min} (nên cách ít nhất ${SAMPLE_MARGIN} ký tự)`,
          );
        }
      }
      // Giới hạn mềm cho bài mẫu (§4.6): vượt thì cảnh báo, không chặn.
      const soft = typeCode ? program.writing_sample_limits[typeCode] : undefined;
      if (soft) {
        if (counted > soft.max_chars) {
          warn(
            `${base}.text`,
            `${counted} ký tự vượt giới hạn mềm ${soft.max_chars} ký tự của ${typeCode}`,
          );
        }
        const cells = estimateManuscriptCells(m.text, program.manuscript);
        if (cells > soft.max_cells) {
          warn(
            `${base}.text`,
            `ước tính ${cells} ô 원고지 vượt giới hạn mềm ${soft.max_cells} ô của ${typeCode}`,
          );
        }
      }
      const spoken = SPOKEN_ENDING.exec(m.text);
      if (spoken) {
        error(`${base}.text`, `bài mẫu dùng đuôi câu không phải 문어체 (-ㄴ다): "…${spoken[0]}"`);
      }
    }
    if (Array.isArray(m.covers)) {
      const covers = new Set(m.covers.filter((c): c is string => typeof c === "string"));
      const missing = [...pointIds].filter((pid) => !covers.has(pid));
      if (missing.length > 0) {
        error(
          `${base}.covers`,
          `covers chưa phủ hết required_points, thiếu: ${missing.join(", ")}`,
        );
      }
      const unknown = [...covers].filter((cid) => !pointIds.has(cid));
      if (unknown.length > 0) {
        error(
          `${base}.covers`,
          `covers có id không tồn tại trong required_points: ${unknown.join(", ")}`,
        );
      }
    }
  });
}

// ------------------------------------------------------------------ kiểm tra tập file

export function validateContent(
  files: readonly ContentFileInput[],
  options: ValidationOptions = {},
): ValidationResult {
  const programs = options.programs ?? listPrograms();
  const forImport = options.forImport === true;
  const issues: ValidationIssue[] = [];
  let filesChecked = 0;
  let filesSkipped = 0;
  const seen: Parsed[] = [];
  const examInputs: Array<{ file: string; text: string; program: ProgramConfig; parts: string[] }> =
    [];
  const lexiconInputs: ContentFileInput[] = [];

  const sorted = files
    .map((f) => ({ ...f, file: f.file.replace(/\\/g, "/") }))
    .sort((a, b) => a.file.localeCompare(b.file));

  for (const input of sorted) {
    const file = input.file;
    const parts = file.split("/").filter(Boolean);

    // <program>/exams/** là file đề thi (kiểm sau khi đã có toàn bộ câu hỏi).
    if (parts.length >= 2 && parts[1] === "exams") {
      const examProgram = programs.find((p) => p.code === parts[0]);
      if (!examProgram) {
        issues.push({
          severity: "error",
          file,
          path: "",
          message: `thư mục chương trình "${parts[0]}" chưa được cấu hình (có: ${programs.map((p) => p.code).join(", ")})`,
        });
      } else if (!/\.ya?ml$/i.test(file)) {
        filesSkipped += 1;
      } else {
        examInputs.push({ file, text: input.text, program: examProgram, parts });
      }
      continue;
    }

    // <program>/vocab/** và <program>/grammar/** là từ vựng & ngữ pháp (kiểm ở lexicon-validation).
    if (isLexiconPath(parts)) {
      if (/\.ya?ml$/i.test(file)) lexiconInputs.push({ file, text: input.text });
      else filesSkipped += 1;
      continue;
    }

    // Chỉ <program>/practice/** là file câu hỏi; phần còn lại (strategies…) bỏ qua.
    if (parts.length < 2 || parts[1] !== "practice") {
      filesSkipped += 1;
      continue;
    }
    filesChecked += 1;

    const programCode = parts[0]!;
    const program = programs.find((p) => p.code === programCode);
    if (!program) {
      issues.push({
        severity: "error",
        file,
        path: "",
        message: `thư mục chương trình "${programCode}" chưa được cấu hình (có: ${programs.map((p) => p.code).join(", ")})`,
      });
      continue;
    }
    if (parts.length !== 4) {
      issues.push({
        severity: "error",
        file,
        path: "",
        message: `đường dẫn phải có dạng ${programCode}/practice/<TYPE_CODE>/<id>.yaml`,
      });
      continue;
    }

    let doc: unknown;
    try {
      doc = parseYaml(input.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      issues.push({ severity: "error", file, path: "", message: `lỗi cú pháp YAML: ${msg}` });
      continue;
    }
    if (doc === null || doc === undefined) {
      issues.push({ severity: "error", file, path: "", message: "file rỗng" });
      continue;
    }

    const basename = parts[3]!.replace(/\.ya?ml$/i, "");
    seen.push(
      checkQuestionFile(doc, { file, program, dirType: parts[2]!, basename, forImport }, issues),
    );
  }

  crossFileChecks(seen, issues);
  const examsChecked = checkExams(examInputs, seen, issues);
  issues.push(...validateLexicon(lexiconInputs, { programs, forImport }));

  const errorCount = issues.filter((i) => i.severity === "error").length;
  return {
    issues,
    errorCount,
    warningCount: issues.length - errorCount,
    filesChecked,
    filesSkipped,
    questionsChecked: seen.length,
    examsChecked,
    lexiconChecked: lexiconInputs.length,
  };
}

/** Kiểm các file đề thi: đối chiếu id câu với kho câu hỏi vừa phân tích. Trả về số đề đã kiểm. */
function checkExams(
  examInputs: ReadonlyArray<{
    file: string;
    text: string;
    program: ProgramConfig;
    parts: string[];
  }>,
  seen: readonly Parsed[],
  issues: ValidationIssue[],
): number {
  const refsByProgram = new Map<string, Map<string, ExamQuestionRef>>();
  for (const p of seen) {
    if (!p.id) continue;
    let refs = refsByProgram.get(p.programCode);
    if (!refs) {
      refs = new Map();
      refsByProgram.set(p.programCode, refs);
    }
    refs.set(p.id, {
      id: p.id,
      type_code: p.dirType,
      ...(p.groupKey ? { group_key: p.groupKey } : {}),
      ...(p.correctIndex !== undefined ? { correctIndex: p.correctIndex } : {}),
      ...(p.difficulty !== undefined ? { difficulty: p.difficulty } : {}),
    });
  }

  for (const input of examInputs) {
    const { file, parts, program } = input;
    if (parts.length !== 4) {
      issues.push({
        severity: "error",
        file,
        path: "",
        message: `đường dẫn phải có dạng ${program.code}/exams/<kind>/<id>.yaml`,
      });
      continue;
    }
    let doc: unknown;
    try {
      doc = parseYaml(input.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      issues.push({ severity: "error", file, path: "", message: `lỗi cú pháp YAML: ${msg}` });
      continue;
    }
    if (doc === null || doc === undefined) {
      issues.push({ severity: "error", file, path: "", message: "file rỗng" });
      continue;
    }
    validateExamFile(
      doc,
      { file, program, dirKind: parts[2]!, basename: parts[3]!.replace(/\.ya?ml$/i, "") },
      refsByProgram.get(program.code) ?? new Map(),
      issues,
    );
  }
  return examInputs.length;
}

function crossFileChecks(seen: readonly Parsed[], issues: ValidationIssue[]): void {
  const push = (severity: Severity, file: string, path: string, message: string) =>
    issues.push({ severity, file, path, message });

  // id trùng giữa các file
  const byId = new Map<string, Parsed>();
  for (const p of seen) {
    if (!p.id) continue;
    const first = byId.get(p.id);
    if (first) push("error", p.file, "id", `id "${p.id}" trùng với ${first.file}`);
    else byId.set(p.id, p);
  }

  // luật 11: ngữ liệu chung của các file cùng group_key phải giống hệt
  const groups = new Map<string, Parsed>();
  for (const p of seen) {
    if (!p.groupKey) continue;
    const first = groups.get(p.groupKey);
    if (!first) {
      groups.set(p.groupKey, p);
      continue;
    }
    for (const f of SHARED_FIELDS) {
      if (JSON.stringify(first.shared[f] ?? null) !== JSON.stringify(p.shared[f] ?? null)) {
        push(
          "error",
          p.file,
          f,
          `ngữ liệu chung "${f}" khác với ${first.file} (cùng group_key "${p.groupKey}"); phải giống hệt từng ký tự`,
        );
      }
    }
  }

  // Nhãn đúng của lô soạn theo từng thư mục type_code (§4.1) — chỉ cảnh báo, và chỉ khi đủ câu
  // để có ý nghĩa. Với đề lắp ráp quy tắc này bắt buộc, nhưng định dạng exams/ chưa chốt (TODO).
  const byDir = new Map<string, Parsed[]>();
  for (const p of seen) {
    if (p.correctIndex === undefined || !p.id) continue;
    const key = `${p.programCode}/${p.dirType}`;
    byDir.set(key, [...(byDir.get(key) ?? []), p]);
  }
  for (const [dir, list] of byDir) {
    if (list.length < MIN_BATCH_FOR_LABEL_CHECK) continue;
    list.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    const result = analyzeAnswerLabels(list.map((p) => p.correctIndex!));
    if (result.maxRun > 3) {
      const at = list[result.runEnd]!;
      push(
        "warning",
        at.file,
        "choices",
        `${dir}: ${result.maxRun} câu liền nhau cùng nhãn đúng ${CHOICE_LABELS[at.correctIndex!]} (không quá 3)`,
      );
    }
    if (result.cycle) {
      const at = list[result.cycle.start]!;
      push(
        "warning",
        at.file,
        "choices",
        `${dir}: chuỗi nhãn đúng dài ${result.cycle.length} lặp lại liền nhau (chu kỳ lặp nhãn)`,
      );
    }
  }

  // pair_with trỏ tới id chưa tồn tại: chỉ cảnh báo
  for (const p of seen) {
    for (const target of p.pairWith ?? []) {
      if (!byId.has(target)) {
        push(
          "warning",
          p.file,
          "pair_with",
          `pair_with trỏ tới "${target}" chưa tồn tại (chưa soạn?)`,
        );
      }
    }
  }
}

// ------------------------------------------------------------------ báo cáo

export function formatReport(result: ValidationResult): string {
  const lines: string[] = [];
  const byFile = new Map<string, ValidationIssue[]>();
  let unreviewed = 0;

  for (const issue of result.issues) {
    // "chưa duyệt" xuất hiện ở mọi file lúc soạn -> gộp thành một dòng tổng.
    if (issue.severity === "warning" && issue.code === "not-reviewed") {
      unreviewed += 1;
      continue;
    }
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }

  for (const [file, list] of byFile) {
    lines.push(file);
    for (const i of list) {
      const tag = i.severity === "error" ? "LỖI" : "CẢNH BÁO";
      const where = i.path ? ` ${i.path}:` : "";
      lines.push(`  [${tag}]${where} ${i.message}`);
    }
    lines.push("");
  }
  if (unreviewed > 0) {
    lines.push(`[CẢNH BÁO] ${unreviewed} file chưa duyệt (reviewed_by: null)`, "");
  }

  lines.push(
    `Đã kiểm ${result.filesChecked} file câu hỏi, ${result.examsChecked} file đề thi và ${result.lexiconChecked} file từ vựng/ngữ pháp, bỏ qua ${result.filesSkipped} file ngoài practice/, exams/, vocab/ và grammar/.`,
  );
  lines.push(
    result.errorCount === 0
      ? `Hợp lệ. ${result.warningCount} cảnh báo.`
      : `Không hợp lệ: ${result.errorCount} lỗi, ${result.warningCount} cảnh báo.`,
  );
  return lines.join("\n");
}
