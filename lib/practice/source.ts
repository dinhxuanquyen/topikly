/**
 * Nguồn dữ liệu TẠM của chế độ Luyện tập: đọc thẳng content/<program>/practice/**\/*.yaml,
 * chạy validateContent, rồi dựng câu hỏi trắc nghiệm (Đọc, Nghe) trong bộ nhớ.
 * Khi có Supabase, thay file này bằng truy vấn CSDL nhưng GIỮ NGUYÊN chữ ký hàm.
 *
 * CHỈ DÙNG TRÊN SERVER (đọc fs). Không import file này từ component "use client".
 * Cùng lý do, không import vào client: bản đầy đủ (`FullQuestion`) có đáp án và lời giải.
 *
 * Ghi chú Next 16 (cacheComponents): các hàm ở đây ĐỒNG BỘ (readFileSync) và memo theo module.
 * Server component không gọi trực tiếp mà gọi các hàm "use cache" ở ./queries.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { validateContent, type ContentFileInput } from "@/lib/db/content-validation";
import { findProgram, type QuestionTypeConfig } from "@/lib/db/programs";
import {
  CHOICE_LABELS,
  type ChartData,
  type ChoiceLabel,
  type PracticeSkill,
  type PracticeTypeSummary,
  type PublicChoice,
  type PublicQuestion,
} from "./types";

// ------------------------------------------------------------------ kiểu nội bộ

export interface FullChoice extends PublicChoice {
  correct: boolean;
  note_vi?: string;
  trap?: string;
}

/** Bản đầy đủ của câu hỏi: CÓ đáp án và lời giải. Không bao giờ gửi xuống client. */
export interface FullQuestion extends Omit<PublicQuestion, "choices"> {
  choices: FullChoice[];
  correctLabel: ChoiceLabel;
  explanation_vi: string;
  transcript_vi?: string;
}

export interface PracticeSourceOptions {
  /** Thư mục content gốc (chứa <program>/practice). Mặc định: `<process.cwd()>/content`. */
  contentRoot?: string;
  /**
   * true = coi `reviewed_by: null` / `source` khác `original` là LỖI (bỏ câu đó), như khi import
   * vào CSDL (content-spec luật 12). Mặc định false vì nội dung mẫu chưa có người duyệt.
   * Bật khi lên môi trường thật.
   */
  requireReviewed?: boolean;
}

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

const choiceSchema = z.object({
  label: z.string(),
  text: z.union([z.string(), z.number()]),
  correct: z.boolean().nullish(),
  note_vi: z.string().nullish(),
  trap: z.string().nullish(),
  image_desc: z.string().nullish(),
  chart_data: z.array(chartSchema).nullish(),
});

const questionSchema = z.object({
  id: z.string(),
  type_code: z.string(),
  subskill: z.string(),
  difficulty: z.number(),
  stem: z.string(),
  explanation_vi: z.string(),
  passage: z.string().nullish(),
  insert_sentence: z.string().nullish(),
  image_desc: z.string().nullish(),
  image_url: z.string().nullish(),
  chart_data: z.array(chartSchema).nullish(),
  data_is_fictional: z.boolean().nullish(),
  transcript_ko: z.string().nullish(),
  transcript_vi: z.string().nullish(),
  speakers: z.array(z.object({ label: z.string(), gender: z.enum(["male", "female"]) })).nullish(),
  audio_url: z.string().nullish(),
  group_key: z.string().nullish(),
  choices: z.array(choiceSchema),
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

function isPracticeSkill(skill: string): skill is PracticeSkill {
  return skill === "reading" || skill === "listening";
}

function buildQuestion(
  programCode: string,
  type: QuestionTypeConfig,
  doc: unknown,
): FullQuestion | undefined {
  const parsed = questionSchema.safeParse(doc);
  if (!parsed.success || !isPracticeSkill(type.skill)) return undefined;
  const q = parsed.data;
  if (q.choices.length !== CHOICE_LABELS.length) return undefined;

  const choices: FullChoice[] = [];
  for (const [i, c] of q.choices.entries()) {
    const label = CHOICE_LABELS[i]!;
    if (c.label !== label) return undefined;
    choices.push({
      label,
      text: String(c.text),
      ...(c.image_desc ? { image_desc: c.image_desc } : {}),
      ...(c.chart_data ? { chart_data: toChartData(c.chart_data) } : {}),
      correct: c.correct === true,
      ...(c.note_vi ? { note_vi: c.note_vi } : {}),
      ...(c.trap ? { trap: c.trap } : {}),
    });
  }
  const correct = choices.filter((c) => c.correct);
  if (correct.length !== 1) return undefined;

  return {
    id: q.id,
    program: programCode,
    type_code: type.code,
    skill: type.skill,
    subskill: q.subskill,
    difficulty: q.difficulty,
    stem: q.stem,
    ...(q.passage ? { passage: q.passage } : {}),
    ...(q.insert_sentence ? { insert_sentence: q.insert_sentence } : {}),
    ...(q.image_desc ? { image_desc: q.image_desc } : {}),
    ...(q.image_url !== undefined ? { image_url: q.image_url } : {}),
    ...(q.chart_data ? { chart_data: toChartData(q.chart_data) } : {}),
    ...(q.data_is_fictional != null ? { data_is_fictional: q.data_is_fictional } : {}),
    ...(q.transcript_ko ? { transcript_ko: q.transcript_ko } : {}),
    ...(q.speakers
      ? { speakers: q.speakers.map((s) => ({ label: s.label, gender: s.gender })) }
      : {}),
    ...(q.audio_url !== undefined ? { audio_url: q.audio_url } : {}),
    ...(q.group_key ? { group_key: q.group_key } : {}),
    choices,
    correctLabel: correct[0]!.label,
    explanation_vi: q.explanation_vi,
    ...(q.transcript_vi ? { transcript_vi: q.transcript_vi } : {}),
  };
}

/** Đọc đệ quy *.yaml|*.yml; `file` tương đối so với `contentRoot`, dùng dấu "/". */
export function collectYaml(contentRoot: string, program: string): ContentFileInput[] {
  const base = path.join(contentRoot, program, "practice");
  try {
    if (!statSync(base).isDirectory()) return [];
  } catch {
    return [];
  }
  const out: ContentFileInput[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.ya?ml$/i.test(entry.name)) {
        out.push({
          file: path.relative(contentRoot, full).split(path.sep).join("/"),
          text: readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(base);
  return out;
}

interface Bank {
  /** Đã sắp theo id. */
  questions: FullQuestion[];
  byId: Map<string, FullQuestion>;
}

function loadBank(program: string, options: PracticeSourceOptions): Bank {
  const config = findProgram(program);
  const empty: Bank = { questions: [], byId: new Map() };
  if (!config) return empty;

  const contentRoot = options.contentRoot ?? path.join(process.cwd(), "content");
  const files = collectYaml(contentRoot, program);
  if (files.length === 0) return empty;

  const result = validateContent(files, { forImport: options.requireReviewed === true });
  const badFiles = new Set<string>();
  for (const issue of result.issues) {
    if (issue.severity !== "error") continue;
    if (!badFiles.has(issue.file)) {
      console.warn(
        `[practice] Bỏ qua ${issue.file}: ${issue.path ? `${issue.path}: ` : ""}${issue.message}`,
      );
    }
    badFiles.add(issue.file);
  }

  const questions: FullQuestion[] = [];
  for (const file of files) {
    if (badFiles.has(file.file)) continue;
    // <program>/practice/<TYPE_CODE>/<id>.yaml (đã được validateContent kiểm đường dẫn)
    const typeCode = file.file.split("/")[2];
    const type = config.question_types.find((t) => t.code === typeCode);
    if (!type || type.format !== "multiple_choice") continue; // bỏ Viết
    let doc: unknown;
    try {
      doc = parseYaml(file.text);
    } catch {
      continue;
    }
    const q = buildQuestion(program, type, doc);
    if (q) questions.push(q);
    else console.warn(`[practice] Bỏ qua ${file.file}: không dựng được câu trắc nghiệm`);
  }
  questions.sort((a, b) => a.id.localeCompare(b.id));
  return { questions, byId: new Map(questions.map((q) => [q.id, q])) };
}

const memo = new Map<string, Bank>();

function getBank(program: string, options: PracticeSourceOptions): Bank {
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
export function clearPracticeCache(): void {
  memo.clear();
}

// ------------------------------------------------------------------ chuyển sang bản công khai

/**
 * WHITELIST từng trường: không dùng spread từ FullQuestion để một trường nhạy cảm mới thêm vào
 * FullQuestion sau này không tự rò rỉ xuống client.
 */
export function toPublicQuestion(q: FullQuestion): PublicQuestion {
  return {
    id: q.id,
    program: q.program,
    type_code: q.type_code,
    skill: q.skill,
    subskill: q.subskill,
    difficulty: q.difficulty,
    stem: q.stem,
    ...(q.passage !== undefined ? { passage: q.passage } : {}),
    ...(q.insert_sentence !== undefined ? { insert_sentence: q.insert_sentence } : {}),
    ...(q.image_desc !== undefined ? { image_desc: q.image_desc } : {}),
    ...(q.image_url !== undefined ? { image_url: q.image_url } : {}),
    ...(q.chart_data !== undefined ? { chart_data: q.chart_data } : {}),
    ...(q.data_is_fictional !== undefined ? { data_is_fictional: q.data_is_fictional } : {}),
    ...(q.transcript_ko !== undefined ? { transcript_ko: q.transcript_ko } : {}),
    ...(q.speakers !== undefined ? { speakers: q.speakers } : {}),
    ...(q.audio_url !== undefined ? { audio_url: q.audio_url } : {}),
    ...(q.group_key !== undefined ? { group_key: q.group_key } : {}),
    choices: q.choices.map((c) => ({
      label: c.label,
      text: c.text,
      ...(c.image_desc !== undefined ? { image_desc: c.image_desc } : {}),
      ...(c.chart_data !== undefined ? { chart_data: c.chart_data } : {}),
    })),
  };
}

// ------------------------------------------------------------------ API

/** Dạng đang có ≥1 câu, sắp theo type_code. Program lạ trả []. */
export function listPracticeTypes(
  program: string,
  skill?: PracticeSkill,
  options: PracticeSourceOptions = {},
): PracticeTypeSummary[] {
  const config = findProgram(program);
  if (!config) return [];
  const counts = new Map<string, number>();
  for (const q of getBank(program, options).questions) {
    counts.set(q.type_code, (counts.get(q.type_code) ?? 0) + 1);
  }
  const out: PracticeTypeSummary[] = [];
  for (const type of config.question_types) {
    const count = counts.get(type.code);
    if (!count || !isPracticeSkill(type.skill)) continue;
    if (skill && type.skill !== skill) continue;
    const group = config.type_groups.find((g) => g.group === type.type_group);
    out.push({
      type_code: type.code,
      skill: type.skill,
      name_vi: type.name_vi,
      type_group: type.type_group,
      group_name_vi: group?.name_vi ?? type.name_vi,
      question_count: count,
    });
  }
  return out.sort((a, b) => a.type_code.localeCompare(b.type_code));
}

/** Câu của một dạng, sắp theo id. Không có (hoặc program/dạng lạ) trả []. */
export function listPublicQuestions(
  program: string,
  typeCode: string,
  options: PracticeSourceOptions = {},
): PublicQuestion[] {
  return getBank(program, options)
    .questions.filter((q) => q.type_code === typeCode)
    .map(toPublicQuestion);
}

export function getPublicQuestion(
  program: string,
  id: string,
  options: PracticeSourceOptions = {},
): PublicQuestion | undefined {
  const q = getBank(program, options).byId.get(id);
  return q ? toPublicQuestion(q) : undefined;
}

/** NỘI BỘ server: bản đầy đủ để chấm. Không trả cho client. */
export function getFullQuestion(
  program: string,
  id: string,
  options: PracticeSourceOptions = {},
): FullQuestion | undefined {
  return getBank(program, options).byId.get(id);
}
