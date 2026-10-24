/**
 * Nguồn dữ liệu TẠM của trụ Lý thuyết (từ vựng, ngữ pháp): đọc thẳng
 * content/<program>/vocab/*.yaml (lô theo chủ đề + _hanja-syllables.yaml) và
 * content/<program>/grammar/*.yaml + grammar/groups/*.yaml theo docs/vocab-grammar-spec.md,
 * chạy validateLexicon rồi dựng dữ liệu công khai trong bộ nhớ. Khi có Supabase, thay file này
 * bằng truy vấn CSDL nhưng GIỮ NGUYÊN chữ ký hàm.
 *
 * CHỈ DÙNG TRÊN SERVER (đọc fs). Không import file này từ component "use client".
 * Cùng khuôn với lib/practice/source.ts: hàm ĐỒNG BỘ (readFileSync), memo theo module; server
 * component không gọi trực tiếp mà gọi các hàm "use cache" ở ./queries.ts.
 *
 * Mọi kiểu trả về đều là bản công khai (./types.ts): KHÔNG có notes_internal, reviewed_by,
 * verification_vi, level_basis, refs. Mỗi mục được dựng bằng WHITELIST từng trường.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { ContentFileInput } from "@/lib/db/content-validation";
import { effectiveReviewedBy, effectiveSource, validateLexicon } from "@/lib/db/lexicon-validation";
import { findProgram, type ProgramConfig } from "@/lib/db/programs";
import type {
  CompareCriterionKey,
  CompareGroup,
  CompareGroupSummary,
  FacetCount,
  FamilyMember,
  FalseFriend,
  GrammarFacets,
  GrammarFilter,
  GrammarPoint,
  GrammarPointRef,
  GrammarPointSummary,
  HanjaEntry,
  HanjaFamily,
  HanjaSyllable,
  LabelRef,
  LevelFacet,
  LexiconSearchResponse,
  SyllableFamily,
  VocabFacets,
  VocabFilter,
  VocabWord,
  VocabWordDetail,
  VocabWordSummary,
  WordSyllable,
} from "./types";

export interface LexiconSourceOptions {
  /** Thư mục content gốc (chứa <program>/{vocab,grammar}). Mặc định: `<process.cwd()>/content`. */
  contentRoot?: string;
  /**
   * true = chỉ lấy mục có reviewed_by hiệu lực ≠ null và source = original (như khi import vào
   * CSDL, vocab-grammar-spec §7.3.6). Mặc định false vì nội dung mẫu chưa có người duyệt: mục chưa
   * duyệt vẫn hiện, có cờ `reviewed: false`.
   */
  requireReviewed?: boolean;
}

// ------------------------------------------------------------------ schema đọc YAML

const syllableSchema = z.object({ ko: z.string(), hanja: z.string(), hv: z.string() });

const wordSchema = z.object({
  id: z.string(),
  hangul: z.string(),
  hanja: z.string().nullable(),
  han_viet: z.string().nullable(),
  syllables: z.array(syllableSchema).nullish(),
  meaning_vi: z.string(),
  pos: z.string(),
  level: z.number(),
  topics: z.array(z.string()).nullish(),
  example_ko: z.string(),
  example_vi: z.string(),
  false_friend: z
    .object({
      kind: z.enum(["full", "partial"]),
      vi_meaning: z.string(),
      note_vi: z.string(),
    })
    .nullable(),
  collocations: z.array(z.object({ ko: z.string(), vi: z.string() })).nullish(),
  note_vi: z.string().nullish(),
  status: z.enum(["active", "retired"]).nullish(),
});

const tableSchema = z.object({
  syllables: z.array(
    z.object({
      ko: z.string(),
      hanja: z.string(),
      hv: z.string(),
      alt_hv: z.array(z.string()).nullish(),
      meaning_vi: z.string(),
    }),
  ),
});

const pointSchema = z.object({
  id: z.string(),
  slug: z.string(),
  pattern: z.string(),
  variants: z.array(z.string()).nullish(),
  meaning_vi: z.string(),
  level: z.number(),
  function: z.string(),
  compare_group: z.string().nullable(),
  form: z.array(
    z.object({
      host: z.enum(["V", "A", "N", "V/A"]),
      attach: z.string(),
      note_vi: z.string().nullish(),
    }),
  ),
  constraints: z.object({
    register: z.enum(["spoken", "written", "both"]),
    polarity: z.enum(["any", "negative", "positive"]).nullish(),
    subject_vi: z.string().nullish(),
    tense_vi: z.string().nullish(),
    main_clause_vi: z.string().nullish(),
    other_vi: z.string().nullish(),
  }),
  examples: z.array(z.object({ ko: z.string(), vi: z.string(), note_vi: z.string().nullish() })),
  non_examples: z
    .array(z.object({ ko: z.string(), fix_ko: z.string().nullish(), note_vi: z.string() }))
    .nullish(),
  common_mistakes_vi: z.array(z.string()),
  related: z.array(z.string()).nullish(),
  body_md: z.string(),
  status: z.enum(["active", "retired"]).nullish(),
});

const groupSchema = z.object({
  slug: z.string(),
  title_vi: z.string(),
  function: z.string(),
  level: z.number(),
  members: z.array(z.string()),
  summary_vi: z.string(),
  compare_table: z.object({
    columns: z.array(z.string()),
    rows: z.array(
      z.object({
        criterion_key: z.enum([
          "meaning",
          "pos",
          "subject",
          "tense",
          "main_clause",
          "nuance",
          "register",
          "other",
        ]),
        criterion: z.string(),
        cells: z.array(z.string()),
      }),
    ),
  }),
  contrast_examples: z.array(
    z.object({
      situation_vi: z.string(),
      items: z.array(
        z.object({
          member: z.string(),
          ko: z.string(),
          vi: z.string(),
          ok: z.boolean(),
          note_vi: z.string(),
        }),
      ),
    }),
  ),
  decision_tips_vi: z.array(z.string()),
  topik_traps_vi: z.array(z.string()).nullish(),
});

// ------------------------------------------------------------------ đọc file

/** Đọc đệ quy *.yaml|*.yml dưới content/<program>/{vocab,grammar}; `file` tương đối so với contentRoot. */
export function collectLexiconYaml(contentRoot: string, program: string): ContentFileInput[] {
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
  // Mỗi thư mục một path.join với hằng chuỗi (không dùng biến vòng lặp): next build chỉ trace
  // content/*/vocab và content/*/grammar thay vì cả dự án.
  const vocabDir = path.join(contentRoot, program, "vocab");
  if (isDir(vocabDir)) walk(vocabDir);
  const grammarDir = path.join(contentRoot, program, "grammar");
  if (isDir(grammarDir)) walk(grammarDir);
  return out;
}

function isDir(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function safeParse(text: string): unknown {
  try {
    return parseYaml(text);
  } catch {
    return undefined;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Mục được hiển thị không? (requireReviewed: phải có reviewed_by hiệu lực và source = original). */
function isPublishable(
  item: Record<string, unknown>,
  root: Record<string, unknown>,
  requireReviewed: boolean,
): boolean {
  if (!requireReviewed) return true;
  return effectiveReviewedBy(item, root) !== null && effectiveSource(item, root) === "original";
}

// ------------------------------------------------------------------ dựng dữ liệu

interface Bank {
  program: ProgramConfig;
  words: VocabWord[];
  wordById: Map<string, VocabWord>;
  /** Dòng bảng âm tiết theo chữ Hán (mọi cách đọc). */
  syllablesByHanja: Map<string, HanjaSyllable[]>;
  /** Mọi từ chứa mỗi chữ Hán, kèm âm trong từ. */
  membersByHanja: Map<string, FamilyMember[]>;
  points: GrammarPoint[];
  pointBySlug: Map<string, GrammarPoint>;
  groups: CompareGroup[];
  groupBySlug: Map<string, CompareGroup>;
}

function labelOf(list: readonly { code: string; name_vi: string }[], code: string): LabelRef {
  return { code, name_vi: list.find((x) => x.code === code)?.name_vi ?? code };
}

function toSummary(w: VocabWord): VocabWordSummary {
  return {
    id: w.id,
    hangul: w.hangul,
    hanja: w.hanja,
    han_viet: w.han_viet,
    meaning_vi: w.meaning_vi,
    pos: w.pos,
    pos_name_vi: w.pos_name_vi,
    level: w.level,
    topics: w.topics,
    false_friend_kind: w.false_friend_kind,
    reviewed: w.reviewed,
  };
}

function compareWords(a: VocabWordSummary, b: VocabWordSummary): number {
  return a.level - b.level || a.hangul.localeCompare(b.hangul, "ko") || a.id.localeCompare(b.id);
}

function loadBank(programCode: string, options: LexiconSourceOptions): Bank | undefined {
  const program = findProgram(programCode);
  if (!program) return undefined;
  const requireReviewed = options.requireReviewed === true;
  const contentRoot = options.contentRoot ?? path.join(process.cwd(), "content");
  const files = collectLexiconYaml(contentRoot, programCode);

  const bank: Bank = {
    program,
    words: [],
    wordById: new Map(),
    syllablesByHanja: new Map(),
    membersByHanja: new Map(),
    points: [],
    pointBySlug: new Map(),
    groups: [],
    groupBySlug: new Map(),
  };
  if (files.length === 0) return bank;

  const issues = validateLexicon(files, { programs: [program], forImport: false });
  const badFiles = new Set<string>();
  for (const issue of issues) {
    if (issue.severity !== "error") continue;
    if (!badFiles.has(issue.file)) {
      console.warn(
        `[lexicon] Bỏ qua ${issue.file}: ${issue.path ? `${issue.path}: ` : ""}${issue.message}`,
      );
    }
    badFiles.add(issue.file);
  }

  // 1. Bảng âm tiết (dùng được dù có cảnh báo; file lỗi thì bỏ, từ vựng vẫn hiện nhưng thiếu nghĩa chữ)
  const tableFile = files.find((f) => f.file === `${programCode}/vocab/_hanja-syllables.yaml`);
  if (tableFile && !badFiles.has(tableFile.file)) {
    const parsed = tableSchema.safeParse(safeParse(tableFile.text));
    if (parsed.success) {
      for (const row of parsed.data.syllables) {
        const entry: HanjaSyllable = {
          ko: row.ko,
          hanja: row.hanja,
          hv: row.hv,
          alt_hv: row.alt_hv ?? [],
          meaning_vi: row.meaning_vi,
        };
        bank.syllablesByHanja.set(row.hanja, [
          ...(bank.syllablesByHanja.get(row.hanja) ?? []),
          entry,
        ]);
      }
    }
  }
  const rowOf = (ko: string, hanja: string): HanjaSyllable | undefined =>
    bank.syllablesByHanja.get(hanja)?.find((r) => r.ko === ko) ??
    bank.syllablesByHanja.get(hanja)?.[0];

  // 2. Từ vựng
  for (const file of files) {
    const [, kind, name, ...rest] = file.file.split("/");
    if (kind !== "vocab" || rest.length > 0 || !name || name.startsWith("_")) continue;
    if (badFiles.has(file.file)) continue;
    const root = safeParse(file.text);
    if (!isObj(root) || !Array.isArray(root.words)) continue;
    for (const raw of root.words) {
      if (!isObj(raw) || raw.status === "retired") continue;
      if (!isPublishable(raw, root, requireReviewed)) continue;
      const parsed = wordSchema.safeParse(raw);
      if (!parsed.success) continue;
      const w = parsed.data;
      const syllables: WordSyllable[] = (w.syllables ?? []).map((s) => {
        const meaning = rowOf(s.ko, s.hanja)?.meaning_vi;
        return { ko: s.ko, hanja: s.hanja, hv: s.hv, ...(meaning ? { meaning_vi: meaning } : {}) };
      });
      const word: VocabWord = {
        id: w.id,
        program: programCode,
        hangul: w.hangul,
        hanja: w.hanja,
        han_viet: w.han_viet,
        syllables,
        meaning_vi: w.meaning_vi,
        pos: w.pos,
        pos_name_vi: labelOf(program.lexicon.pos, w.pos).name_vi,
        level: w.level,
        topics: (w.topics ?? []).map((t) => labelOf(program.lexicon.topics, t)),
        example_ko: w.example_ko,
        example_vi: w.example_vi,
        false_friend: w.false_friend
          ? ({
              kind: w.false_friend.kind,
              vi_meaning: w.false_friend.vi_meaning,
              note_vi: w.false_friend.note_vi,
            } satisfies FalseFriend)
          : null,
        false_friend_kind: w.false_friend?.kind ?? null,
        collocations: (w.collocations ?? []).map((c) => ({ ko: c.ko, vi: c.vi })),
        ...(w.note_vi ? { note_vi: w.note_vi } : {}),
        reviewed: effectiveReviewedBy(raw, root) !== null,
      };
      if (bank.wordById.has(word.id)) continue;
      bank.words.push(word);
      bank.wordById.set(word.id, word);
    }
  }
  bank.words.sort((a, b) => a.id.localeCompare(b.id));
  for (const word of bank.words) {
    const seen = new Set<string>();
    for (const s of word.syllables) {
      if (seen.has(s.hanja)) continue; // chữ lặp trong từ (漸漸) chỉ tính một lần
      seen.add(s.hanja);
      bank.membersByHanja.set(s.hanja, [
        ...(bank.membersByHanja.get(s.hanja) ?? []),
        { ...toSummary(word), ko: s.ko, hv: s.hv },
      ]);
    }
  }
  for (const list of bank.membersByHanja.values()) list.sort(compareWords);

  // 3. Ngữ pháp
  const functions = program.lexicon.grammar_functions;
  const refs = new Map<string, GrammarPointRef>();
  const rawPoints: Array<{ data: z.infer<typeof pointSchema>; reviewed: boolean }> = [];
  for (const file of files) {
    const [, kind, name, ...rest] = file.file.split("/");
    if (kind !== "grammar" || rest.length > 0 || !name || badFiles.has(file.file)) continue;
    const doc = safeParse(file.text);
    if (!isObj(doc) || doc.status === "retired") continue;
    if (!isPublishable(doc, doc, requireReviewed)) continue;
    const parsed = pointSchema.safeParse(doc);
    if (!parsed.success) continue;
    rawPoints.push({ data: parsed.data, reviewed: effectiveReviewedBy(doc, doc) !== null });
    refs.set(parsed.data.id, {
      id: parsed.data.id,
      slug: parsed.data.slug,
      pattern: parsed.data.pattern,
    });
  }

  // 4. Nhóm so sánh (cần trước để gắn `group` vào điểm)
  const rawGroups: Array<{ data: z.infer<typeof groupSchema>; reviewed: boolean }> = [];
  for (const file of files) {
    const [, kind, sub, name, ...rest] = file.file.split("/");
    if (kind !== "grammar" || sub !== "groups" || !name || rest.length > 0) continue;
    if (badFiles.has(file.file)) continue;
    const doc = safeParse(file.text);
    if (!isObj(doc) || !isPublishable(doc, doc, requireReviewed)) continue;
    const parsed = groupSchema.safeParse(doc);
    if (!parsed.success) continue;
    rawGroups.push({ data: parsed.data, reviewed: effectiveReviewedBy(doc, doc) !== null });
  }
  const groupTitles = new Map(rawGroups.map((g) => [g.data.slug, g.data.title_vi]));

  for (const { data: p, reviewed } of rawPoints) {
    const point: GrammarPoint = {
      id: p.id,
      slug: p.slug,
      pattern: p.pattern,
      variants: p.variants ?? [],
      meaning_vi: p.meaning_vi,
      level: p.level,
      function: p.function,
      function_name_vi: labelOf(functions, p.function).name_vi,
      compare_group: p.compare_group && groupTitles.has(p.compare_group) ? p.compare_group : null,
      reviewed,
      program: programCode,
      form: p.form.map((f) => ({
        host: f.host,
        attach: f.attach,
        ...(f.note_vi ? { note_vi: f.note_vi } : {}),
      })),
      constraints: {
        register: p.constraints.register,
        ...(p.constraints.polarity ? { polarity: p.constraints.polarity } : {}),
        ...(p.constraints.subject_vi ? { subject_vi: p.constraints.subject_vi } : {}),
        ...(p.constraints.tense_vi ? { tense_vi: p.constraints.tense_vi } : {}),
        ...(p.constraints.main_clause_vi ? { main_clause_vi: p.constraints.main_clause_vi } : {}),
        ...(p.constraints.other_vi ? { other_vi: p.constraints.other_vi } : {}),
      },
      examples: p.examples.map((e) => ({
        ko: e.ko,
        vi: e.vi,
        ...(e.note_vi ? { note_vi: e.note_vi } : {}),
      })),
      non_examples: (p.non_examples ?? []).map((e) => ({
        ko: e.ko,
        ...(e.fix_ko ? { fix_ko: e.fix_ko } : {}),
        note_vi: e.note_vi,
      })),
      common_mistakes_vi: p.common_mistakes_vi,
      related: (p.related ?? []).flatMap((id) => {
        const ref = refs.get(id);
        return ref ? [ref] : [];
      }),
      group:
        p.compare_group && groupTitles.has(p.compare_group)
          ? { slug: p.compare_group, title_vi: groupTitles.get(p.compare_group)! }
          : null,
      body_md: p.body_md,
    };
    if (bank.pointBySlug.has(point.slug)) continue;
    bank.points.push(point);
    bank.pointBySlug.set(point.slug, point);
  }
  bank.points.sort((a, b) => a.id.localeCompare(b.id));
  const pointById = new Map(bank.points.map((p) => [p.id, p]));

  for (const { data: g, reviewed } of rawGroups) {
    const members = g.members.flatMap((id) => {
      const p = pointById.get(id);
      return p
        ? [{ id: p.id, slug: p.slug, pattern: p.pattern, meaning_vi: p.meaning_vi, level: p.level }]
        : [];
    });
    // Thiếu thành viên (chưa duyệt / lỗi) thì bảng so sánh lệch cột: bỏ cả nhóm cho nhất quán.
    if (members.length !== g.members.length || members.length < 2) continue;
    const group: CompareGroup = {
      slug: g.slug,
      title_vi: g.title_vi,
      function: g.function,
      function_name_vi: labelOf(functions, g.function).name_vi,
      level: g.level,
      member_count: members.length,
      reviewed,
      program: programCode,
      summary_vi: g.summary_vi,
      members,
      compare_table: {
        columns: g.compare_table.columns,
        rows: g.compare_table.rows.map((r) => ({
          criterion_key: r.criterion_key as CompareCriterionKey,
          criterion: r.criterion,
          cells: r.cells,
        })),
      },
      contrast_examples: g.contrast_examples.map((s) => ({
        situation_vi: s.situation_vi,
        items: s.items.map((it) => ({
          member: it.member,
          pattern: pointById.get(it.member)?.pattern ?? "",
          ko: it.ko,
          vi: it.vi,
          ok: it.ok,
          note_vi: it.note_vi,
        })),
      })),
      decision_tips_vi: g.decision_tips_vi,
      topik_traps_vi: g.topik_traps_vi ?? [],
    };
    bank.groups.push(group);
    bank.groupBySlug.set(group.slug, group);
  }
  bank.groups.sort((a, b) => a.slug.localeCompare(b.slug));
  // Điểm trỏ tới nhóm bị bỏ thì không còn nhóm
  for (const p of bank.points) {
    if (p.compare_group && !bank.groupBySlug.has(p.compare_group)) {
      p.compare_group = null;
      p.group = null;
    }
  }
  return bank;
}

const memo = new Map<string, Bank | undefined>();

function getBank(program: string, options: LexiconSourceOptions): Bank | undefined {
  // Dev: đọc lại mỗi lần để sửa nội dung YAML thấy ngay (số file nhỏ).
  if (process.env.NODE_ENV === "development") return loadBank(program, options);
  const key = JSON.stringify([
    program,
    options.contentRoot ?? "",
    options.requireReviewed === true,
  ]);
  if (!memo.has(key)) memo.set(key, loadBank(program, options));
  return memo.get(key);
}

/** Xoá memo (dùng trong test hoặc sau khi cập nhật nội dung lúc chạy). */
export function clearLexiconCache(): void {
  memo.clear();
}

// ------------------------------------------------------------------ từ vựng: truy vấn

function levelLabel(program: ProgramConfig, level: number): string {
  return program.level_thresholds.find((t) => t.level === level)?.label ?? `${level}급`;
}

function facetCounts(
  values: Iterable<string>,
  labels: readonly { code: string; name_vi: string }[],
): FacetCount[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  // Thứ tự theo danh sách cấu hình; mã ngoài danh sách (nếu có) xếp cuối.
  const known = labels.filter((l) => counts.has(l.code));
  const unknown = [...counts.keys()].filter((c) => !labels.some((l) => l.code === c)).sort();
  return [
    ...known.map((l) => ({ code: l.code, name_vi: l.name_vi, count: counts.get(l.code)! })),
    ...unknown.map((c) => ({ code: c, name_vi: c, count: counts.get(c)! })),
  ];
}

function levelFacets(program: ProgramConfig, levels: Iterable<number>): LevelFacet[] {
  const counts = new Map<number, number>();
  for (const l of levels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({ level, label: levelLabel(program, level), count }));
}

/** Bộ lọc khả dụng (cấp, chủ đề, từ loại) kèm số lượng. Program lạ trả `undefined`. */
export function getVocabFacets(
  program: string,
  options: LexiconSourceOptions = {},
): VocabFacets | undefined {
  const bank = getBank(program, options);
  if (!bank) return undefined;
  return {
    total: bank.words.length,
    levels: levelFacets(
      bank.program,
      bank.words.map((w) => w.level),
    ),
    topics: facetCounts(
      bank.words.flatMap((w) => w.topics.map((t) => t.code)),
      bank.program.lexicon.topics,
    ),
    pos: facetCounts(
      bank.words.map((w) => w.pos),
      bank.program.lexicon.pos,
    ),
    false_friend_count: bank.words.filter((w) => w.false_friend_kind !== null).length,
  };
}

/** Từ theo bộ lọc (cấp, chủ đề, từ loại, bạn giả), sắp theo cấp rồi hangul. Program lạ trả []. */
export function listVocab(
  program: string,
  filter: VocabFilter = {},
  options: LexiconSourceOptions = {},
): VocabWordSummary[] {
  const bank = getBank(program, options);
  if (!bank) return [];
  return bank.words
    .filter(
      (w) =>
        (filter.level === undefined || w.level === filter.level) &&
        (filter.topic === undefined || w.topics.some((t) => t.code === filter.topic)) &&
        (filter.pos === undefined || w.pos === filter.pos) &&
        (filter.falseFriend === undefined || (w.false_friend_kind !== null) === filter.falseFriend),
    )
    .map(toSummary)
    .sort(compareWords);
}

/** Một từ đầy đủ theo id. */
export function getVocabWord(
  program: string,
  id: string,
  options: LexiconSourceOptions = {},
): VocabWord | undefined {
  return getBank(program, options)?.wordById.get(id);
}

/** Từ đầy đủ + gia đình từ theo từng chữ Hán. */
export function getVocabWordDetail(
  program: string,
  id: string,
  options: LexiconSourceOptions = {},
): VocabWordDetail | undefined {
  const bank = getBank(program, options);
  const word = bank?.wordById.get(id);
  if (!bank || !word) return undefined;
  const families: SyllableFamily[] = [];
  const seen = new Set<string>();
  for (const s of word.syllables) {
    if (seen.has(s.hanja)) continue;
    seen.add(s.hanja);
    const readings = bank.syllablesByHanja.get(s.hanja) ?? [];
    const row = readings.find((r) => r.ko === s.ko) ?? readings[0];
    families.push({
      syllable: s,
      alt_hv: row?.alt_hv ?? [],
      words: (bank.membersByHanja.get(s.hanja) ?? []).filter((m) => m.id !== word.id),
    });
  }
  return { word, families };
}

/** Mọi chữ Hán có trong từ vựng, sắp theo âm Hàn rồi chữ Hán. */
export function listHanja(program: string, options: LexiconSourceOptions = {}): HanjaEntry[] {
  const bank = getBank(program, options);
  if (!bank) return [];
  const out: HanjaEntry[] = [];
  for (const [hanja, members] of bank.membersByHanja) {
    out.push({
      hanja,
      readings: bank.syllablesByHanja.get(hanja) ?? [],
      word_count: members.length,
    });
  }
  return out.sort(
    (a, b) =>
      (a.readings[0]?.ko ?? "").localeCompare(b.readings[0]?.ko ?? "", "ko") ||
      a.hanja.localeCompare(b.hanja),
  );
}

/** Trang riêng của một chữ Hán (mọi cách đọc + mọi từ chứa nó). `undefined` nếu chưa có từ nào chứa. */
export function getHanjaFamily(
  program: string,
  hanja: string,
  options: LexiconSourceOptions = {},
): HanjaFamily | undefined {
  const bank = getBank(program, options);
  const members = bank?.membersByHanja.get(hanja);
  if (!bank || !members) return undefined;
  return { hanja, readings: bank.syllablesByHanja.get(hanja) ?? [], words: members };
}

// ------------------------------------------------------------------ ngữ pháp: truy vấn

function toPointSummary(p: GrammarPoint): GrammarPointSummary {
  return {
    id: p.id,
    slug: p.slug,
    pattern: p.pattern,
    variants: p.variants,
    meaning_vi: p.meaning_vi,
    level: p.level,
    function: p.function,
    function_name_vi: p.function_name_vi,
    compare_group: p.compare_group,
    reviewed: p.reviewed,
  };
}

function toGroupSummary(g: CompareGroup): CompareGroupSummary {
  return {
    slug: g.slug,
    title_vi: g.title_vi,
    function: g.function,
    function_name_vi: g.function_name_vi,
    level: g.level,
    member_count: g.member_count,
    reviewed: g.reviewed,
  };
}

export function getGrammarFacets(
  program: string,
  options: LexiconSourceOptions = {},
): GrammarFacets | undefined {
  const bank = getBank(program, options);
  if (!bank) return undefined;
  return {
    total: bank.points.length,
    levels: levelFacets(
      bank.program,
      bank.points.map((p) => p.level),
    ),
    functions: facetCounts(
      bank.points.map((p) => p.function),
      bank.program.lexicon.grammar_functions,
    ),
  };
}

/** Điểm ngữ pháp theo bộ lọc (cấp, chức năng, nhóm), sắp theo cấp rồi id. Program lạ trả []. */
export function listGrammar(
  program: string,
  filter: GrammarFilter = {},
  options: LexiconSourceOptions = {},
): GrammarPointSummary[] {
  const bank = getBank(program, options);
  if (!bank) return [];
  return bank.points
    .filter(
      (p) =>
        (filter.level === undefined || p.level === filter.level) &&
        (filter.function === undefined || p.function === filter.function) &&
        (filter.group === undefined || p.compare_group === filter.group),
    )
    .map(toPointSummary)
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

export function getGrammarPoint(
  program: string,
  slug: string,
  options: LexiconSourceOptions = {},
): GrammarPoint | undefined {
  return getBank(program, options)?.pointBySlug.get(slug);
}

/** Nhóm so sánh (tóm tắt), sắp theo cấp rồi slug. */
export function listCompareGroups(
  program: string,
  options: LexiconSourceOptions = {},
): CompareGroupSummary[] {
  const bank = getBank(program, options);
  if (!bank) return [];
  return bank.groups
    .map(toGroupSummary)
    .sort((a, b) => a.level - b.level || a.slug.localeCompare(b.slug));
}

export function getCompareGroup(
  program: string,
  slug: string,
  options: LexiconSourceOptions = {},
): CompareGroup | undefined {
  return getBank(program, options)?.groupBySlug.get(slug);
}

// ------------------------------------------------------------------ tìm kiếm

/** Bỏ dấu tiếng Việt, đổi đ -> d, chữ thường: để gõ "xa hoi" vẫn khớp "xã hội". */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFC")
    .toLowerCase();
}

/**
 * Tìm từ vựng (hangul, hanja, âm Hán-Việt, nghĩa) và ngữ pháp (pattern, biến thể, nghĩa).
 * Khớp chứa chuỗi, không phân biệt dấu/hoa thường. Kết quả khớp đầu chuỗi xếp trước.
 */
export function searchLexicon(
  program: string,
  query: string,
  limit = 20,
  options: LexiconSourceOptions = {},
): LexiconSearchResponse {
  const q = query.normalize("NFC").trim();
  const bank = getBank(program, options);
  if (!bank || q.length === 0) return { q, vocab: [], grammar: [] };
  const folded = foldText(q);
  // Pattern ngữ pháp chứa ký hiệu: so cả bản bỏ "-", "(", ")" để gõ "느라고" vẫn khớp "-느라고".
  const plain = (s: string) => s.replace(/[-()\s]/g, "");
  const qPlain = plain(q);

  const rank = (fields: string[]): number => {
    let best = Infinity;
    for (const f of fields) {
      const i = foldText(f).indexOf(folded);
      if (i >= 0) best = Math.min(best, i === 0 ? 0 : 1);
    }
    return best;
  };

  const vocab = bank.words
    .map((w) => ({
      w,
      r: rank([w.hangul, w.hanja ?? "", w.han_viet ?? "", w.meaning_vi]),
    }))
    .filter((x) => x.r !== Infinity)
    .sort((a, b) => a.r - b.r || compareWords(a.w, b.w))
    .slice(0, limit)
    .map((x) => toSummary(x.w));

  const grammar = bank.points
    .map((p) => {
      let r = rank([p.pattern, ...p.variants, p.meaning_vi]);
      if (r === Infinity && qPlain.length > 0) {
        const hit = [p.pattern, ...p.variants].some((s) => plain(s).includes(qPlain));
        if (hit) r = 1;
      }
      return { p, r };
    })
    .filter((x) => x.r !== Infinity)
    .sort((a, b) => a.r - b.r || a.p.level - b.p.level || a.p.id.localeCompare(b.p.id))
    .slice(0, limit)
    .map((x) => toPointSummary(x.p));

  return { q, vocab, grammar };
}
