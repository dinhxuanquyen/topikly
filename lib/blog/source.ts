/**
 * Nguồn dữ liệu TẠM của Blog: đọc content/blog/<slug>.md (docs/blog-spec.md), chạy validateBlogFile
 * rồi dựng `BlogPost` công khai trong bộ nhớ. Khi có Supabase, thay file này bằng truy vấn CSDL
 * nhưng GIỮ NGUYÊN chữ ký hàm.
 *
 * CHỈ DÙNG TRÊN SERVER (đọc fs). Không import file này từ component "use client". Cùng khuôn với
 * lib/lexicon/source.ts và lib/exam/source.ts: hàm ĐỒNG BỘ, memo theo module; server component không
 * gọi trực tiếp mà gọi các hàm "use cache" ở ./queries.ts.
 *
 * - File có LỖI (frontmatter/Markdown sai) bị bỏ qua kèm console.warn; cảnh báo không chặn.
 * - Bản công khai (./types.ts) KHÔNG có notes_internal, reviewed_by, reviewed_at, authored_by;
 *   thay bằng cờ `reviewed` (đã có reviewed_by).
 * - Bài `draft` hiện mặc định; ẩn khi TOPIKLY_HIDE_DRAFT_POSTS=1 (hoặc `includeDrafts: false`).
 * - Thứ tự: bài published mới nhất trước (published_at giảm dần, trùng thì theo slug), bài draft
 *   ở cuối (theo published_at/slug giống vậy).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { BLOG_CATEGORIES, type BlogCategoryCode } from "./types";
import type { BlogCategoryRef, BlogCategorySummary, BlogPost, BlogPostSummary } from "./types";
import { validateBlogFile, type BlogFileInput, type ParsedBlogFile } from "./validation";

export interface BlogSourceOptions {
  /** Thư mục content gốc (chứa blog/). Mặc định: `<process.cwd()>/content`. */
  contentRoot?: string;
  /**
   * false = ẩn bài `draft`. Mặc định true, trừ khi đặt biến môi trường TOPIKLY_HIDE_DRAFT_POSTS=1.
   */
  includeDrafts?: boolean;
  /**
   * true = chỉ lấy bài đã có reviewed_by (như khi import vào CSDL). Mặc định false vì bài mới soạn
   * luôn chưa duyệt: bài vẫn hiện, có cờ `reviewed: false`.
   */
  requireReviewed?: boolean;
}

// ------------------------------------------------------------------ đọc file

/** Đọc content/blog/*.md (một cấp). Đường dẫn trả về dạng "blog/<tên>.md". Thư mục thiếu -> []. */
export function collectBlogFiles(contentRoot: string): BlogFileInput[] {
  // Một path.join với hằng chuỗi: next build chỉ trace content/blog thay vì cả dự án.
  const dir = path.join(contentRoot, "blog");
  let names: string[];
  try {
    if (!statSync(dir).isDirectory()) return [];
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => /\.md$/i.test(name) && !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      file: `blog/${name}`,
      text: readFileSync(path.join(dir, name), "utf8"),
    }));
}

// ------------------------------------------------------------------ dựng bài công khai

interface BlogEntry {
  summary: BlogPostSummary;
  post: BlogPost;
}

function categoryRef(code: string): BlogCategoryRef {
  const category = BLOG_CATEGORIES.find((c) => c.code === code);
  return { code: (category?.code ?? code) as BlogCategoryCode, name_vi: category?.name_vi ?? code };
}

function toEntry(parsed: ParsedBlogFile): BlogEntry {
  const summary: BlogPostSummary = {
    slug: parsed.slug,
    title: parsed.title,
    description: parsed.description,
    category: categoryRef(parsed.category),
    programs: parsed.programs,
    levels: parsed.levels,
    tags: parsed.tags,
    status: parsed.status,
    published_at: parsed.published_at,
    updated_at: parsed.updated_at,
    reading_minutes: parsed.reading_minutes,
    reviewed: parsed.reviewed_by !== null,
  };
  const post: BlogPost = {
    ...summary,
    blocks: parsed.blocks,
    toc: parsed.toc,
    related: parsed.related,
    sources: parsed.sources,
  };
  return { summary, post };
}

/** published trước (mới nhất trước), draft sau cùng; cùng ngày thì theo slug. */
const statusRank = (s: BlogPostSummary) => (s.status === "published" ? 0 : 1);

function compareEntries(a: BlogPostSummary, b: BlogPostSummary): number {
  return (
    statusRank(a) - statusRank(b) ||
    (b.published_at ?? "").localeCompare(a.published_at ?? "") ||
    a.slug.localeCompare(b.slug)
  );
}

function shouldIncludeDrafts(options: BlogSourceOptions): boolean {
  if (options.includeDrafts !== undefined) return options.includeDrafts;
  return process.env.TOPIKLY_HIDE_DRAFT_POSTS !== "1";
}

function loadBlog(options: BlogSourceOptions): BlogEntry[] {
  const contentRoot = options.contentRoot ?? path.join(process.cwd(), "content");
  const includeDrafts = shouldIncludeDrafts(options);
  const entries: BlogEntry[] = [];
  for (const input of collectBlogFiles(contentRoot)) {
    const result = validateBlogFile(input);
    const firstError = result.issues.find((i) => i.severity === "error");
    if (firstError || !result.post) {
      console.warn(
        `[blog] Bỏ qua ${input.file}: ${firstError?.path ? `${firstError.path}: ` : ""}${firstError?.message ?? "không đọc được"}`,
      );
      continue;
    }
    if (result.post.status === "draft" && !includeDrafts) continue;
    if (options.requireReviewed === true && result.post.reviewed_by === null) continue;
    entries.push(toEntry(result.post));
  }
  return entries.sort((a, b) => compareEntries(a.summary, b.summary));
}

// ------------------------------------------------------------------ memo

const memo = new Map<string, BlogEntry[]>();

function getBlog(options: BlogSourceOptions): BlogEntry[] {
  // Dev: đọc lại mỗi lần để sửa bài thấy ngay (số file nhỏ).
  if (process.env.NODE_ENV === "development") return loadBlog(options);
  const key = JSON.stringify([
    options.contentRoot ?? "",
    options.requireReviewed === true,
    options.includeDrafts ?? null,
    process.env.TOPIKLY_HIDE_DRAFT_POSTS ?? "",
  ]);
  let entries = memo.get(key);
  if (!entries) {
    entries = loadBlog(options);
    memo.set(key, entries);
  }
  return entries;
}

/** Xoá memo (dùng trong test hoặc sau khi cập nhật nội dung lúc chạy). */
export function clearBlogCache(): void {
  memo.clear();
}

// ------------------------------------------------------------------ API

export interface BlogListFilter {
  /** Mã chuyên mục; mã lạ cho danh sách rỗng. */
  category?: string;
}

/** Danh sách bài (tóm tắt): published mới nhất trước, draft cuối. Bỏ trống `category` = tất cả. */
export function listBlogPosts(
  filter: BlogListFilter = {},
  options: BlogSourceOptions = {},
): BlogPostSummary[] {
  return getBlog(options)
    .map((e) => e.summary)
    .filter((s) => filter.category === undefined || s.category.code === filter.category);
}

/** Một bài đầy đủ theo slug. `undefined` nếu không có (hoặc là draft đang bị ẩn / file lỗi). */
export function getBlogPost(slug: string, options: BlogSourceOptions = {}): BlogPost | undefined {
  return getBlog(options).find((e) => e.post.slug === slug)?.post;
}

/** Mọi chuyên mục (theo thứ tự BLOG_CATEGORIES) kèm số bài đang hiển thị; có thể bằng 0. */
export function listBlogCategories(options: BlogSourceOptions = {}): BlogCategorySummary[] {
  const entries = getBlog(options);
  return BLOG_CATEGORIES.map((c) => ({
    code: c.code,
    name_vi: c.name_vi,
    description_vi: c.description_vi,
    post_count: entries.filter((e) => e.summary.category.code === c.code).length,
  }));
}

/**
 * Bài liên quan: cùng chuyên mục trước, rồi bài chung tag; bài published trước draft, mới nhất
 * trước. Loại chính bài đó. Không đệm bằng bài không liên quan. Slug lạ trả [].
 */
export function listRelatedPosts(
  slug: string,
  limit = 3,
  options: BlogSourceOptions = {},
): BlogPostSummary[] {
  const entries = getBlog(options);
  const self = entries.find((e) => e.summary.slug === slug)?.summary;
  if (!self || limit <= 0) return [];
  const tags = new Set(self.tags);
  return entries
    .map((e) => e.summary)
    .filter((s) => s.slug !== slug)
    .map((s) => ({
      s,
      score:
        (s.category.code === self.category.code ? 100 : 0) +
        s.tags.filter((t) => tags.has(t)).length * 10,
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) => statusRank(a.s) - statusRank(b.s) || b.score - a.score || compareEntries(a.s, b.s),
    )
    .slice(0, limit)
    .map((x) => x.s);
}
