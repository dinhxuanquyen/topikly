/**
 * Kiểm tra bài Blog: content/blog/<slug>.md theo docs/blog-spec.md mục 2–5. THUẦN (không fs):
 * nhận nội dung file, trả về lỗi/cảnh báo cùng bài đã phân tích. Đọc file ở ./source.ts, gộp vào
 * `npm run validate:content` ở scripts/lib/validate-content-cli.ts.
 *
 * LỖI chặn (bài bị bỏ khi phục vụ): thiếu/sai kiểu trường bắt buộc, enum sai, slug lệch tên file
 * hoặc trùng route dành riêng, chương trình không có trong registry, `published` thiếu
 * `published_at`, cú pháp Markdown bị cấm (kèm số dòng), H3 trước H2, bảng lệch cột, liên kết sai
 * giao thức (`related[].href` phải bắt đầu "/", `sources[].url` phải "https://").
 * CẢNH BÁO: độ dài title/description/thân bài, ít hơn 2 H2, `related`/liên kết nội bộ không khớp
 * trang có thật (cần `linkIndex`), `published` chưa duyệt (code "not-reviewed"), thiếu `sources`
 * khi bài nêu dữ kiện kỳ thi, tag viết hoa, trường lạ, `updated_at` < `published_at`.
 */
import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";
import type { Severity, ValidationIssue } from "../db/content-validation";
import { listPrograms } from "../db/programs";
import type { ProgramConfig } from "../db/programs";
import { parseBlogMarkdown, isAllowedHref, readingMinutes } from "./markdown";
import {
  BLOG_CATEGORY_CODES,
  RESERVED_BLOG_SLUGS,
  type BlogBlock,
  type BlogCategoryCode,
  type BlogLink,
  type BlogSource,
  type BlogStatus,
  type BlogTocEntry,
} from "./types";

export const BLOG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BLOG_STATUSES = ["draft", "published"] as const;

export const TITLE_MAX_CHARS = 70;
export const DESCRIPTION_MIN_CHARS = 70;
export const DESCRIPTION_MAX_CHARS = 170;
export const BODY_MIN_WORDS = 600;
export const BODY_MAX_WORDS = 2500;
export const MIN_H2 = 2;
export const MAX_TAGS = 8;

// ------------------------------------------------------------------ schema frontmatter

const required = (typeMsg: string) => (iss: { input?: unknown }) =>
  iss.input === undefined ? "thiếu trường bắt buộc" : typeMsg;

const nonBlank = z
  .string({ error: required("phải là chuỗi văn bản") })
  .refine((s) => s.trim().length > 0, { error: "không được để trống" });

/** "YYYY-MM-DD" và là ngày có thật. */
const dateString = z
  .string({ error: "phải là ngày dạng YYYY-MM-DD (đặt trong dấu nháy nếu cần)" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "phải có dạng YYYY-MM-DD" })
  .refine(
    (s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    },
    { error: "ngày không có thật" },
  );

function enumOf<const T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values, {
    error: (iss) =>
      iss.input === undefined
        ? "thiếu trường bắt buộc"
        : `giá trị không hợp lệ, cho phép: ${values.join(", ")}`,
  });
}

const FIELD_KEYS = [
  "slug",
  "title",
  "description",
  "category",
  "programs",
  "levels",
  "tags",
  "status",
  "published_at",
  "updated_at",
  "authored_by",
  "reviewed_by",
  "reviewed_at",
  "related",
  "sources",
  "notes_internal",
] as const;

export const blogFrontmatterSchema = z.object({
  slug: z
    .string({ error: required("phải là chuỗi văn bản") })
    .regex(BLOG_SLUG_REGEX, {
      error: "slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (vd. cau-truc-de-topik-ii)",
    })
    .refine((s) => !RESERVED_BLOG_SLUGS.includes(s), {
      error: `slug bị cấm (trùng route dành riêng: ${RESERVED_BLOG_SLUGS.join(", ")})`,
    }),
  title: nonBlank,
  description: nonBlank,
  category: enumOf(
    BLOG_CATEGORY_CODES as unknown as readonly [BlogCategoryCode, ...BlogCategoryCode[]],
  ),
  programs: z
    .array(nonBlank, { error: required("phải là danh sách mã chương trình, vd. [topik-ii]") })
    .min(1, { error: "phải có ít nhất một chương trình" }),
  levels: z
    .array(
      z.number({ error: "phải là số nguyên (cấp)" }).int({ error: "phải là số nguyên (cấp)" }),
      { error: "phải là danh sách số, vd. [3, 4]" },
    )
    .nullish(),
  tags: z
    .array(nonBlank, { error: "phải là danh sách chuỗi" })
    .max(MAX_TAGS, { error: `tối đa ${MAX_TAGS} tag` })
    .nullish(),
  status: enumOf(BLOG_STATUSES),
  published_at: dateString.nullish(),
  updated_at: dateString.nullish(),
  authored_by: nonBlank,
  reviewed_by: z.string({ error: required("phải là chuỗi hoặc null") }).nullable(),
  reviewed_at: dateString.nullish(),
  related: z
    .array(
      z.object({
        href: nonBlank,
        label: nonBlank,
      }),
      { error: "phải là danh sách { href, label }" },
    )
    .nullish(),
  sources: z
    .array(
      z.object({
        title: nonBlank,
        url: nonBlank,
      }),
      { error: "phải là danh sách { title, url }" },
    )
    .nullish(),
  notes_internal: z.string({ error: "phải là chuỗi văn bản" }).nullish(),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

// ------------------------------------------------------------------ kiểu công khai

/** Bài đã phân tích (chưa lọc trường nội bộ). */
export interface ParsedBlogFile {
  slug: string;
  title: string;
  description: string;
  category: BlogFrontmatter["category"];
  programs: string[];
  levels: number[];
  tags: string[];
  status: BlogStatus;
  published_at: string | null;
  updated_at: string | null;
  authored_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  related: BlogLink[];
  sources: BlogSource[];
  notes_internal: string | null;
  blocks: BlogBlock[];
  toc: BlogTocEntry[];
  word_count: number;
  reading_minutes: number;
}

export interface BlogFileInput {
  /** Đường dẫn tương đối so với thư mục content, dùng "/": "blog/<slug>.md". */
  file: string;
  text: string;
}

export interface ValidateBlogOptions {
  /** Mặc định: registry trong lib/db/programs. */
  programs?: readonly ProgramConfig[];
  /** Import vào CSDL: bài `published` chưa duyệt thành LỖI (mặc định là cảnh báo). */
  forImport?: boolean;
  /**
   * Tập đường dẫn trang có thật ("/topik-ii/de-thi/mini/doc-01"…), dựng ở ./links.ts. Bỏ trống =
   * không kiểm `related`/liên kết nội bộ khớp trang thật.
   */
  linkIndex?: ReadonlySet<string>;
}

export interface BlogFileResult {
  issues: ValidationIssue[];
  /** Có khi frontmatter qua schema (kể cả khi còn lỗi ngữ nghĩa khác). */
  post?: ParsedBlogFile;
}

export interface BlogValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  filesChecked: number;
  published: number;
  draft: number;
}

// ------------------------------------------------------------------ tách frontmatter

interface SplitResult {
  yamlText: string;
  body: string;
  /** Số dòng đứng trước thân bài (gồm hai dòng ---). */
  bodyOffset: number;
}

/** File phải mở đầu bằng `---`, đóng bằng một dòng `---`. `undefined` nếu thiếu khối. */
export function splitFrontmatter(text: string): SplitResult | undefined {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return undefined;
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (close < 0) return undefined;
  return {
    yamlText: lines.slice(1, close).join("\n"),
    body: lines.slice(close + 1).join("\n"),
    bodyOffset: close + 1,
  };
}

function formatPath(segments: readonly PropertyKey[]): string {
  let out = "";
  for (const seg of segments) {
    if (typeof seg === "number") out += `[${seg}]`;
    else out += out ? `.${String(seg)}` : String(seg);
  }
  return out;
}

/** Bỏ `#...`, `?...`, dấu / cuối rồi so với tập trang (cả dạng gốc và đã giải mã percent). */
function matchesIndex(href: string, index: ReadonlySet<string>): boolean {
  const base = href.split(/[?#]/)[0]!;
  const trimmed = base.length > 1 ? base.replace(/\/+$/, "") : base;
  if (index.has(trimmed)) return true;
  try {
    return index.has(decodeURI(trimmed)) || index.has(decodeURIComponent(trimmed));
  } catch {
    return false;
  }
}

const EXAM_FACT_PATTERN = /lệ phí|lịch thi|ngày thi|đăng ký thi|hạn đăng ký/i;
const SOURCES_EXPECTED_CATEGORIES: readonly string[] = ["tin-ky-thi", "cau-truc-de"];

const charLength = (s: string) => [...s].length;

// ------------------------------------------------------------------ kiểm tra một file

/**
 * Kiểm một file blog. `ctx.file` là đường dẫn trong content ("blog/<slug>.md"); tên file (bỏ .md)
 * phải trùng `slug`.
 */
export function validateBlogFile(
  input: BlogFileInput,
  options: ValidateBlogOptions = {},
): BlogFileResult {
  const { file, text } = input;
  const programs = options.programs ?? listPrograms();
  const issues: ValidationIssue[] = [];
  const add = (severity: Severity, path: string, message: string, code?: string) =>
    issues.push({ severity, file, path, message, ...(code ? { code } : {}) });
  const error = (path: string, message: string, code?: string) => add("error", path, message, code);
  const warn = (path: string, message: string, code?: string) =>
    add("warning", path, message, code);

  const parts = file.split("/").filter(Boolean);
  const basename = (parts[parts.length - 1] ?? "").replace(/\.md$/i, "");
  if (parts.length !== 2 || parts[0] !== "blog" || !/\.md$/i.test(file)) {
    error("", "đường dẫn phải có dạng blog/<slug>.md");
    return { issues };
  }

  // ---- frontmatter
  const split = splitFrontmatter(text);
  if (!split) {
    error(
      "",
      "dòng 1: file phải bắt đầu bằng khối frontmatter YAML giữa hai dòng `---`",
      "frontmatter-missing",
    );
    return { issues };
  }
  let doc: unknown;
  try {
    doc = parseYaml(split.yamlText);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    const line = err instanceof YAMLParseError ? (err.linePos?.[0]?.line ?? 0) + 1 : 0;
    error("", `${line > 0 ? `dòng ${line}: ` : ""}lỗi cú pháp YAML trong frontmatter: ${msg}`);
    return { issues };
  }
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    error("", "frontmatter phải là một khối `khoá: giá trị`", "frontmatter-missing");
    return { issues };
  }

  const parsed = blogFrontmatterSchema.safeParse(doc);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) error(formatPath(issue.path), issue.message);
    return { issues };
  }
  const fm = parsed.data;

  for (const key of Object.keys(doc)) {
    if (!(FIELD_KEYS as readonly string[]).includes(key)) {
      warn(
        key,
        `trường "${key}" không có trong đặc tả (bỏ qua); có gõ nhầm tên trường không?`,
        "unknown-field",
      );
    }
  }

  if (fm.slug !== basename) {
    error("slug", `slug "${fm.slug}" không khớp tên file "${basename}.md"`);
  }

  // ---- chương trình, cấp
  const knownPrograms = fm.programs.map((code) => programs.find((p) => p.code === code));
  fm.programs.forEach((code, i) => {
    if (!knownPrograms[i]) {
      error(
        `programs[${i}]`,
        `chương trình "${code}" chưa được cấu hình (có: ${programs.map((p) => p.code).join(", ")})`,
      );
    }
  });
  const levels = fm.levels ?? [];
  const resolvedPrograms = knownPrograms.filter((p): p is ProgramConfig => p !== undefined);
  if (resolvedPrograms.length > 0) {
    levels.forEach((level, i) => {
      const ok = resolvedPrograms.some(
        (p) => level >= p.difficulty_range.min && level <= p.difficulty_range.max,
      );
      if (!ok) {
        error(
          `levels[${i}]`,
          `cấp ${level} nằm ngoài difficulty_range của ${resolvedPrograms
            .map((p) => `${p.code} (${p.difficulty_range.min}–${p.difficulty_range.max})`)
            .join(", ")}`,
        );
      }
    });
  }

  // ---- tag
  (fm.tags ?? []).forEach((tag, i) => {
    if (tag !== tag.toLowerCase()) warn(`tags[${i}]`, `tag "${tag}" nên viết chữ thường`);
  });

  // ---- trạng thái, ngày
  if (fm.status === "published" && !fm.published_at) {
    error("published_at", "bài `published` phải có published_at (YYYY-MM-DD)");
  }
  if (fm.updated_at && fm.published_at && fm.updated_at < fm.published_at) {
    warn("updated_at", `updated_at (${fm.updated_at}) sớm hơn published_at (${fm.published_at})`);
  }
  if (fm.status === "published" && fm.reviewed_by === null) {
    add(
      options.forImport ? "error" : "warning",
      "reviewed_by",
      "bài đã published nhưng chưa được duyệt (reviewed_by: null)",
      "not-reviewed",
    );
  }

  // ---- độ dài title/description
  if (charLength(fm.title) > TITLE_MAX_CHARS) {
    warn(
      "title",
      `title dài ${charLength(fm.title)} ký tự, nên ≤ ${TITLE_MAX_CHARS}`,
      "title-length",
    );
  }
  const descLen = charLength(fm.description);
  if (descLen < DESCRIPTION_MIN_CHARS || descLen > DESCRIPTION_MAX_CHARS) {
    warn(
      "description",
      `description dài ${descLen} ký tự, nên trong khoảng ${DESCRIPTION_MIN_CHARS}–${DESCRIPTION_MAX_CHARS}`,
      "description-length",
    );
  }

  // ---- related, sources
  const related = fm.related ?? [];
  related.forEach((item, i) => {
    const path = `related[${i}].href`;
    if (!item.href.startsWith("/") || !isAllowedHref(item.href)) {
      error(
        path,
        `"${item.href}" không hợp lệ: phải là đường dẫn nội bộ bắt đầu bằng "/" (không có khoảng trắng, "//", "..")`,
        "link-protocol",
      );
    } else if (options.linkIndex && !matchesIndex(item.href, options.linkIndex)) {
      warn(
        path,
        `"${item.href}" không khớp trang nào có thật (practice/exam/lý thuyết/blog)`,
        "link-unknown",
      );
    }
  });
  const sources = fm.sources ?? [];
  sources.forEach((src, i) => {
    if (!isAllowedHref(src.url) || !src.url.startsWith("https://")) {
      error(
        `sources[${i}].url`,
        `"${src.url}" không hợp lệ: phải là địa chỉ "https://..."`,
        "link-protocol",
      );
    }
  });

  // ---- thân bài
  const md = parseBlogMarkdown(split.body, { lineOffset: split.bodyOffset });
  for (const e of md.errors) error(`dòng ${e.line}`, e.message, `md-${e.code}`);
  if (options.linkIndex) {
    for (const link of md.internalLinks) {
      if (isAllowedHref(link.href) && !matchesIndex(link.href, options.linkIndex)) {
        warn(
          `dòng ${link.line}`,
          `liên kết "${link.href}" không khớp trang nào có thật (practice/exam/lý thuyết/blog)`,
          "link-unknown",
        );
      }
    }
  }
  if (md.wordCount < BODY_MIN_WORDS || md.wordCount > BODY_MAX_WORDS) {
    warn(
      "",
      `thân bài ${md.wordCount} từ, nên trong khoảng ${BODY_MIN_WORDS}–${BODY_MAX_WORDS} từ`,
      "body-length",
    );
  }
  if (md.toc.length < MIN_H2) {
    warn("", `thân bài có ${md.toc.length} tiêu đề ##, nên có ít nhất ${MIN_H2}`, "few-headings");
  }

  // ---- nguồn khi bài nêu dữ kiện kỳ thi
  if (sources.length === 0) {
    if (SOURCES_EXPECTED_CATEGORIES.includes(fm.category)) {
      warn(
        "sources",
        `bài chuyên mục "${fm.category}" nêu dữ kiện kỳ thi nên có sources (nguồn chính thức, https://)`,
        "sources-missing",
      );
    } else if (EXAM_FACT_PATTERN.test(split.body)) {
      warn(
        "sources",
        "thân bài có vẻ nêu lịch thi / lệ phí / đăng ký thi nhưng chưa có sources (nguồn chính thức)",
        "sources-missing",
      );
    }
  }

  const post: ParsedBlogFile = {
    slug: fm.slug,
    title: fm.title.trim(),
    description: fm.description.trim(),
    category: fm.category,
    programs: fm.programs,
    levels,
    tags: fm.tags ?? [],
    status: fm.status,
    published_at: fm.published_at ?? null,
    updated_at: fm.updated_at ?? null,
    authored_by: fm.authored_by,
    reviewed_by: fm.reviewed_by,
    reviewed_at: fm.reviewed_at ?? null,
    related: related.map((r) => ({ href: r.href.trim(), label: r.label.trim() })),
    sources: sources.map((s) => ({ title: s.title.trim(), url: s.url.trim() })),
    notes_internal: fm.notes_internal ?? null,
    blocks: md.blocks,
    toc: md.toc,
    word_count: md.wordCount,
    reading_minutes: readingMinutes(md.wordCount),
  };
  return { issues, post };
}

// ------------------------------------------------------------------ kiểm tập file

/** Kiểm mọi file blog; đếm số bài theo trạng thái (chỉ tính bài qua được schema). */
export function validateBlogFiles(
  files: readonly BlogFileInput[],
  options: ValidateBlogOptions = {},
): BlogValidationResult {
  const issues: ValidationIssue[] = [];
  let published = 0;
  let draft = 0;
  const sorted = [...files]
    .map((f) => ({ ...f, file: f.file.replace(/\\/g, "/") }))
    .sort((a, b) => a.file.localeCompare(b.file));
  for (const input of sorted) {
    const result = validateBlogFile(input, options);
    issues.push(...result.issues);
    if (result.post?.status === "published") published += 1;
    else if (result.post?.status === "draft") draft += 1;
  }
  const errorCount = issues.filter((i) => i.severity === "error").length;
  return {
    issues,
    errorCount,
    warningCount: issues.length - errorCount,
    filesChecked: sorted.length,
    published,
    draft,
  };
}
