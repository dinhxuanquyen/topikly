/**
 * Nguồn dữ liệu TẠM của Luyện tập Viết (W51–W54): đọc thẳng content/<program>/practice/W5x/*.yaml,
 * chạy validateContent rồi dựng đề (phần hiển thị trước khi viết) và phần tự so sánh (bài mẫu,
 * đáp án) trong bộ nhớ. Khi có Supabase, thay file này bằng truy vấn CSDL nhưng GIỮ NGUYÊN chữ ký hàm.
 *
 * CHỈ DÙNG TRÊN SERVER (đọc fs). Không import file này từ component "use client".
 * Cùng khuôn với ./source.ts: hàm ĐỒNG BỘ (readFileSync), memo theo module; server component không gọi
 * trực tiếp mà gọi các hàm "use cache" ở ./writing-queries.ts.
 *
 * Phạm vi MVP: chỉ phục vụ đề và bài mẫu để người học tự so sánh. Không chấm, không rule check.
 */
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { countChars } from "@/lib/db/char-count";
import { validateContent } from "@/lib/db/content-validation";
import { estimateManuscriptCells } from "@/lib/db/manuscript";
import { findProgram, type QuestionTypeConfig } from "@/lib/db/programs";
import { collectYaml, type PracticeSourceOptions } from "./source";
import type { ChartData } from "./types";
import {
  WRITING_TYPE_CODES,
  type WritingBlankReveal,
  type WritingFormat,
  type WritingModelAnswer,
  type WritingPrompt,
  type WritingReveal,
  type WritingTypeCode,
  type WritingTypeSummary,
} from "./writing-types";

// ------------------------------------------------------------------ đọc & dựng

const chartSchema = z.object({
  chart_type: z.enum(["line", "bar", "pie", "table"]),
  title: z.string(),
  caption: z.string().optional(),
  unit: z.string(),
  series: z.array(
    z.object({
      name: z.union([z.string(), z.number()]),
      points: z.array(z.object({ x: z.union([z.string(), z.number()]), y: z.number() })),
    }),
  ),
});

const blankSchema = z.object({
  label: z.string(),
  accepted_answers: z.array(z.string()),
  partial_answers: z.array(z.string()).nullish(),
  rejected_answers: z.array(z.object({ text: z.string(), reason_vi: z.string() })).nullish(),
  required_elements_vi: z.array(z.string()),
  note_vi: z.string().nullish(),
});

const modelAnswerSchema = z.object({
  level: z.number(),
  text: z.string(),
  covers: z.array(z.string()),
  rubric_notes_vi: z.object({
    task_fulfillment: z.string(),
    organization: z.string(),
    language_use: z.string(),
  }),
});

const writingSchema = z.object({
  id: z.string(),
  type_code: z.string(),
  subskill: z.string(),
  difficulty: z.number(),
  stem: z.string(),
  explanation_vi: z.string(),
  scoring_notes_vi: z.string(),
  common_mistakes_vi: z.array(z.string()),
  // W51–W52
  passage: z.string().nullish(),
  register: z.enum(["formal_polite", "polite", "written_plain"]).nullish(),
  blanks: z.array(blankSchema).nullish(),
  // W53–W54
  task: z.string().nullish(),
  image_desc: z.string().nullish(),
  image_url: z.string().nullish(),
  chart_data: z.array(chartSchema).nullish(),
  data_is_fictional: z.boolean().nullish(),
  required_points: z.array(z.object({ id: z.string(), ko: z.string(), vi: z.string() })).nullish(),
  char_limit: z.object({ min: z.number(), max: z.number() }).nullish(),
  model_answers: z.array(modelAnswerSchema).nullish(),
  outline_vi: z.string().nullish(),
  expression_bank: z.array(z.object({ ko: z.string(), vi: z.string() })).nullish(),
});

function toChartData(charts: z.infer<typeof chartSchema>[]): ChartData[] {
  return charts.map((c) => ({
    chart_type: c.chart_type,
    title: c.title,
    ...(c.caption ? { caption: c.caption } : {}),
    unit: c.unit,
    series: c.series.map((s) => ({
      name: String(s.name),
      points: s.points.map((p) => ({ x: String(p.x), y: p.y })),
    })),
  }));
}

function isWritingTypeCode(code: string): code is WritingTypeCode {
  return (WRITING_TYPE_CODES as readonly string[]).includes(code);
}

function formatOf(code: WritingTypeCode): WritingFormat {
  return code === "W51" || code === "W52" ? "fill_blanks" : "essay";
}

/** Bỏ ký tự xuống dòng thừa ở cuối khối văn bản `|` của YAML. */
const trimEnd = (s: string): string => s.replace(/\s+$/u, "");

interface WritingItem {
  prompt: WritingPrompt;
  reveal: WritingReveal;
}

function buildItem(
  programCode: string,
  type: QuestionTypeConfig,
  doc: unknown,
): WritingItem | undefined {
  const parsed = writingSchema.safeParse(doc);
  if (!parsed.success || !isWritingTypeCode(type.code)) return undefined;
  const q = parsed.data;
  const code = type.code;
  const format = formatOf(code);
  const program = findProgram(programCode);
  if (!program) return undefined;

  if (format === "fill_blanks" && (!q.passage || !q.blanks || q.blanks.length === 0)) {
    return undefined;
  }
  if (format === "essay" && (!q.task || !q.model_answers || q.model_answers.length === 0)) {
    return undefined;
  }

  // Giới hạn ký tự lấy từ cấu hình chương trình (nguồn sự thật), YAML chỉ được phép khớp với nó.
  const charLimit = type.char_limit ?? (q.char_limit ? { ...q.char_limit } : undefined);

  // WHITELIST từng trường: không spread từ doc để trường nhạy cảm mới thêm vào YAML không tự rò rỉ.
  const prompt: WritingPrompt = {
    id: q.id,
    program: programCode,
    type_code: code,
    skill: "writing",
    subskill: q.subskill,
    difficulty: q.difficulty,
    format,
    stem: q.stem,
    ...(format === "fill_blanks"
      ? {
          passage: trimEnd(q.passage!),
          blanks: q.blanks!.map((b) => ({ label: b.label })),
        }
      : {}),
    ...(q.task ? { task: trimEnd(q.task) } : {}),
    ...(q.image_desc ? { image_desc: q.image_desc } : {}),
    ...(q.image_url !== undefined ? { image_url: q.image_url } : {}),
    ...(q.chart_data ? { chart_data: toChartData(q.chart_data) } : {}),
    ...(q.data_is_fictional != null ? { data_is_fictional: q.data_is_fictional } : {}),
    ...(format === "essay" && charLimit ? { char_limit: charLimit } : {}),
  };

  const blanks: WritingBlankReveal[] | undefined =
    format === "fill_blanks"
      ? q.blanks!.map((b) => ({
          label: b.label,
          accepted_answers: b.accepted_answers,
          partial_answers: b.partial_answers ?? [],
          rejected_answers: (b.rejected_answers ?? []).map((r) => ({
            text: r.text,
            reason_vi: r.reason_vi,
          })),
          required_elements_vi: b.required_elements_vi,
          ...(b.note_vi ? { note_vi: b.note_vi } : {}),
        }))
      : undefined;

  const modelAnswers: WritingModelAnswer[] | undefined =
    format === "essay"
      ? q
          .model_answers!.map((m) => {
            const text = trimEnd(m.text);
            return {
              level: m.level,
              text,
              char_count: countChars(text),
              manuscript_cells: estimateManuscriptCells(text, program.manuscript),
              covers: m.covers,
              rubric_notes_vi: {
                task_fulfillment: m.rubric_notes_vi.task_fulfillment,
                organization: m.rubric_notes_vi.organization,
                language_use: m.rubric_notes_vi.language_use,
              },
            };
          })
          .sort((a, b) => a.level - b.level)
      : undefined;

  const reveal: WritingReveal = {
    id: q.id,
    type_code: code,
    format,
    ...(q.register ? { register: q.register } : {}),
    ...(blanks ? { blanks } : {}),
    ...(q.required_points && format === "essay"
      ? {
          required_points: q.required_points.map((p) => ({ id: p.id, ko: p.ko, vi: p.vi })),
        }
      : {}),
    ...(modelAnswers ? { model_answers: modelAnswers } : {}),
    ...(q.outline_vi ? { outline_vi: trimEnd(q.outline_vi) } : {}),
    ...(q.expression_bank
      ? { expression_bank: q.expression_bank.map((e) => ({ ko: e.ko, vi: e.vi })) }
      : {}),
    scoring_notes_vi: trimEnd(q.scoring_notes_vi),
    common_mistakes_vi: q.common_mistakes_vi,
    explanation_vi: trimEnd(q.explanation_vi),
  };

  return { prompt, reveal };
}

interface WritingBank {
  /** Đã sắp theo id. */
  items: WritingItem[];
  byId: Map<string, WritingItem>;
}

function loadBank(program: string, options: PracticeSourceOptions): WritingBank {
  const config = findProgram(program);
  const empty: WritingBank = { items: [], byId: new Map() };
  if (!config) return empty;

  const contentRoot = options.contentRoot ?? path.join(process.cwd(), "content");
  const files = collectYaml(contentRoot, program).filter((f) => {
    const typeCode = f.file.split("/")[2];
    return typeCode !== undefined && isWritingTypeCode(typeCode);
  });
  if (files.length === 0) return empty;

  const result = validateContent(files, { forImport: options.requireReviewed === true });
  const badFiles = new Set<string>();
  for (const issue of result.issues) {
    if (issue.severity !== "error") continue;
    if (!badFiles.has(issue.file)) {
      console.warn(
        `[practice/writing] Bỏ qua ${issue.file}: ${issue.path ? `${issue.path}: ` : ""}${issue.message}`,
      );
    }
    badFiles.add(issue.file);
  }

  const items: WritingItem[] = [];
  for (const file of files) {
    if (badFiles.has(file.file)) continue;
    const typeCode = file.file.split("/")[2];
    const type = config.question_types.find((t) => t.code === typeCode);
    if (!type || type.format !== "constructed") continue;
    let doc: unknown;
    try {
      doc = parseYaml(file.text);
    } catch {
      continue;
    }
    const item = buildItem(program, type, doc);
    if (item) items.push(item);
    else console.warn(`[practice/writing] Bỏ qua ${file.file}: không dựng được đề Viết`);
  }
  items.sort((a, b) => a.prompt.id.localeCompare(b.prompt.id));
  return { items, byId: new Map(items.map((i) => [i.prompt.id, i])) };
}

const memo = new Map<string, WritingBank>();

function getBank(program: string, options: PracticeSourceOptions): WritingBank {
  // Dev: đọc lại mỗi lần để sửa nội dung YAML thấy ngay (số file nhỏ).
  if (process.env.NODE_ENV === "development") return loadBank(program, options);
  const key = JSON.stringify([
    program,
    options.contentRoot ?? "",
    options.requireReviewed === true,
  ]);
  let bank = memo.get(key);
  if (!bank) {
    bank = loadBank(program, options);
    memo.set(key, bank);
  }
  return bank;
}

/** Xoá memo (dùng trong test hoặc sau khi cập nhật nội dung lúc chạy). */
export function clearWritingCache(): void {
  memo.clear();
}

// ------------------------------------------------------------------ API

/** Dạng Viết đang có ≥1 đề, sắp theo type_code. Program lạ trả []. */
export function listWritingTypes(
  program: string,
  options: PracticeSourceOptions = {},
): WritingTypeSummary[] {
  const config = findProgram(program);
  if (!config) return [];
  const counts = new Map<string, number>();
  for (const item of getBank(program, options).items) {
    counts.set(item.prompt.type_code, (counts.get(item.prompt.type_code) ?? 0) + 1);
  }
  const out: WritingTypeSummary[] = [];
  for (const type of config.question_types) {
    const count = counts.get(type.code);
    if (!count || !isWritingTypeCode(type.code) || type.format !== "constructed") continue;
    const group = config.type_groups.find((g) => g.group === type.type_group);
    out.push({
      type_code: type.code,
      skill: "writing",
      name_vi: type.name_vi,
      type_group: type.type_group,
      group_name_vi: group?.name_vi ?? type.name_vi,
      format: formatOf(type.code),
      ...(type.char_limit ? { char_limit: { ...type.char_limit } } : {}),
      question_count: count,
    });
  }
  return out.sort((a, b) => a.type_code.localeCompare(b.type_code));
}

/** Đề của một dạng, sắp theo id. Không có (hoặc program/dạng lạ) trả []. */
export function listWritingPrompts(
  program: string,
  typeCode: string,
  options: PracticeSourceOptions = {},
): WritingPrompt[] {
  return getBank(program, options)
    .items.filter((i) => i.prompt.type_code === typeCode)
    .map((i) => i.prompt);
}

export function getWritingPrompt(
  program: string,
  id: string,
  options: PracticeSourceOptions = {},
): WritingPrompt | undefined {
  return getBank(program, options).byId.get(id)?.prompt;
}

/** Phần tự so sánh (bài mẫu, đáp án). Chỉ trả qua API sau khi người học bấm xem. */
export function getWritingReveal(
  program: string,
  id: string,
  options: PracticeSourceOptions = {},
): WritingReveal | undefined {
  return getBank(program, options).byId.get(id)?.reveal;
}
