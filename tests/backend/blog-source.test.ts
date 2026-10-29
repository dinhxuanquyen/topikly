import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import {
  getBlogCategories,
  getBlogPost as queryGetBlogPost,
  getBlogPosts,
  getRelatedBlogPosts,
} from "@/lib/blog/queries";
import {
  clearBlogCache,
  getBlogPost,
  listBlogCategories,
  listBlogPosts,
  listRelatedPosts,
} from "@/lib/blog/source";
import { BLOG_CATEGORIES } from "@/lib/blog/types";

const FIXTURES = path.resolve(__dirname, "../fixtures/content/valid");
const opts = { contentRoot: FIXTURES };
const tmpDirs: string[] = [];

afterEach(() => {
  clearBlogCache();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const FORBIDDEN = ["notes_internal", "reviewed_by", "reviewed_at", "authored_by"];

describe("blog/source: danh sách", () => {
  it("published mới nhất trước (published_at giảm dần, trùng thì theo slug), draft cuối", () => {
    expect(listBlogPosts({}, opts).map((p) => `${p.slug}:${p.status}:${p.published_at}`)).toEqual([
      "cau-truc-de-thu-hai:published:2026-10-25",
      "ky-nang-mau:published:2026-10-25",
      "cau-truc-de-mau:published:2026-10-20",
      "tu-vung-han-viet-mau:draft:null",
    ]);
  });

  it("lọc theo chuyên mục; mã lạ cho mảng rỗng", () => {
    expect(listBlogPosts({ category: "cau-truc-de" }, opts).map((p) => p.slug)).toEqual([
      "cau-truc-de-thu-hai",
      "cau-truc-de-mau",
    ]);
    expect(listBlogPosts({ category: "viet" }, opts)).toEqual([]);
    expect(listBlogPosts({ category: "khong-co" }, opts)).toEqual([]);
  });

  it("tóm tắt: chuyên mục có tên, thời gian đọc, cờ reviewed; không có trường nội bộ", () => {
    const list = listBlogPosts({}, opts);
    const first = list.find((p) => p.slug === "cau-truc-de-mau")!;
    expect(first).toEqual({
      slug: "cau-truc-de-mau",
      title: "Cấu trúc đề mẫu: Nghe và Đọc",
      description: expect.any(String),
      category: { code: "cau-truc-de", name_vi: "Cấu trúc đề" },
      programs: ["topik-ii"],
      levels: [3, 4],
      tags: ["topik-ii", "cau-truc"],
      status: "published",
      published_at: "2026-10-20",
      updated_at: "2026-10-25",
      reading_minutes: 1,
      reviewed: false,
    });
    expect(list.find((p) => p.slug === "ky-nang-mau")!.reviewed).toBe(true);
    const text = JSON.stringify(list);
    for (const key of FORBIDDEN) expect(text).not.toContain(key);
    expect(text).not.toContain("blocks");
  });

  it("ẩn draft khi includeDrafts=false hoặc TOPIKLY_HIDE_DRAFT_POSTS=1", () => {
    expect(listBlogPosts({}, { ...opts, includeDrafts: false })).toHaveLength(3);
    vi.stubEnv("TOPIKLY_HIDE_DRAFT_POSTS", "1");
    clearBlogCache();
    const slugs = listBlogPosts({}, opts).map((p) => p.slug);
    expect(slugs).not.toContain("tu-vung-han-viet-mau");
    expect(getBlogPost("tu-vung-han-viet-mau", opts)).toBeUndefined();
    // includeDrafts tường minh thắng biến môi trường
    expect(listBlogPosts({}, { ...opts, includeDrafts: true })).toHaveLength(4);
  });

  it("requireReviewed: chỉ bài đã có reviewed_by", () => {
    expect(listBlogPosts({}, { ...opts, requireReviewed: true }).map((p) => p.slug)).toEqual([
      "ky-nang-mau",
    ]);
  });
});

describe("blog/source: chuyên mục", () => {
  it("đủ 7 chuyên mục theo thứ tự, kèm post_count (draft tính khi đang hiển thị)", () => {
    const cats = listBlogCategories(opts);
    expect(cats.map((c) => c.code)).toEqual(BLOG_CATEGORIES.map((c) => c.code));
    const count = Object.fromEntries(cats.map((c) => [c.code, c.post_count]));
    expect(count).toMatchObject({
      "cau-truc-de": 2,
      "ky-nang": 1,
      "tu-vung": 1,
      viet: 0,
      "ngu-phap": 0,
      "kinh-nghiem": 0,
      "tin-ky-thi": 0,
    });
    expect(cats[0]).toMatchObject({ name_vi: "Cấu trúc đề", description_vi: expect.any(String) });
  });

  it("post_count không tính draft đang bị ẩn", () => {
    const cats = listBlogCategories({ ...opts, includeDrafts: false });
    expect(cats.find((c) => c.code === "tu-vung")!.post_count).toBe(0);
  });
});

describe("blog/source: một bài", () => {
  it("bài đầy đủ: khối, mục lục, related, sources; không có trường nội bộ", () => {
    const post = getBlogPost("cau-truc-de-mau", opts)!;
    expect(post.blocks.map((b) => b.kind)).toEqual([
      "p",
      "h2",
      "p",
      "h3",
      "ul",
      "h3",
      "ol",
      "quote",
      "table",
      "h2",
      "p",
      "h2",
      "p",
    ]);
    expect(post.toc).toEqual([
      { id: "hai-phan-thi", text: "Hai phần thi" },
      { id: "tieu-de-trung", text: "Tiêu đề trùng" },
      { id: "tieu-de-trung-2", text: "Tiêu đề trùng" },
    ]);
    expect(post.blocks.find((b) => b.kind === "ul")).toEqual({
      kind: "ul",
      items: ["Nghe một lần, trả lời ngay", "Chú ý *từ khoá* trước khi nghe", "Ghi nhanh số liệu"],
    });
    expect(post.blocks.find((b) => b.kind === "quote")).toEqual({
      kind: "quote",
      text: "Mẹo: phân bổ thời gian theo số câu, đừng dừng quá lâu ở một câu. Câu khó thì đánh dấu rồi quay lại.",
    });
    expect(post.related).toEqual([
      { href: "/topik-ii/luyen-tap/doc/R19", label: "Luyện dạng R19" },
      { href: "/topik-ii/de-thi/mini/doc-sample", label: "Mini test Đọc mẫu" },
      { href: "/topik-ii/ly-thuyet/ngu-phap/neula-go", label: "Ngữ pháp -느라고" },
    ]);
    expect(post.sources).toEqual([
      { title: "Trang chính thức của kỳ thi", url: "https://www.topik.go.kr" },
    ]);
    const text = JSON.stringify(post);
    for (const key of FORBIDDEN) expect(text).not.toContain(key);
    expect(text).not.toContain("Ghi chú nội bộ");
  });

  it("slug lạ -> undefined", () => {
    expect(getBlogPost("khong-co", opts)).toBeUndefined();
  });
});

describe("blog/source: bài liên quan", () => {
  it("cùng chuyên mục trước, rồi chung tag; published trước draft; loại chính nó", () => {
    expect(listRelatedPosts("cau-truc-de-mau", 3, opts).map((p) => p.slug)).toEqual([
      "cau-truc-de-thu-hai", // cùng chuyên mục + chung tag? (cau-truc) -> điểm cao nhất
      "ky-nang-mau", // chung tag topik-ii
      "tu-vung-han-viet-mau", // draft, chung tag topik-ii: xếp sau published
    ]);
    expect(listRelatedPosts("cau-truc-de-mau", 1, opts)).toHaveLength(1);
    expect(listRelatedPosts("cau-truc-de-mau", 0, opts)).toEqual([]);
    expect(listRelatedPosts("khong-co", 3, opts)).toEqual([]);
  });

  it("không đệm bằng bài không liên quan", () => {
    // ky-nang-mau chung tag topik-ii với hai bài khác; không còn bài nào chung tag/chuyên mục nữa
    const slugs = listRelatedPosts("ky-nang-mau", 10, opts).map((p) => p.slug);
    expect(slugs).toEqual(["cau-truc-de-mau", "tu-vung-han-viet-mau"]);
  });
});

describe("blog/source: file lỗi bị bỏ qua kèm console.warn", () => {
  it("bài lỗi không làm hỏng các bài khác", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "topikly-blog-src-"));
    tmpDirs.push(dir);
    cpSync(path.join(FIXTURES, "blog"), path.join(dir, "blog"), { recursive: true });
    writeFileSync(path.join(dir, "blog", "hong.md"), "---\nslug: hong\n---\nthiếu trường");
    writeFileSync(path.join(dir, "blog", "ghi-chu.txt"), "không phải .md");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const slugs = listBlogPosts({}, { contentRoot: dir }).map((p) => p.slug);
    expect(slugs).toHaveLength(4);
    expect(slugs).not.toContain("hong");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/\[blog\] Bỏ qua blog\/hong\.md/);
  });

  it("thiếu thư mục blog/ -> rỗng, không lỗi", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "topikly-blog-src-"));
    tmpDirs.push(dir);
    expect(listBlogPosts({}, { contentRoot: dir })).toEqual([]);
    expect(listBlogCategories({ contentRoot: dir }).every((c) => c.post_count === 0)).toBe(true);
  });
});

describe("blog/queries: tên hàm frontend dùng (đọc content/blog thật)", () => {
  it("trả đúng hình dạng, không trường nội bộ, 'không có' là null/[]", async () => {
    const posts = await getBlogPosts();
    expect(Array.isArray(posts)).toBe(true);
    expect(await getBlogPosts("khong-co")).toEqual([]);
    expect(await queryGetBlogPost("khong-co-bai-nay")).toBeNull();
    expect(await getRelatedBlogPosts("khong-co-bai-nay", 3)).toEqual([]);
    const cats = await getBlogCategories();
    expect(cats).toHaveLength(BLOG_CATEGORIES.length);
    expect(cats.reduce((n, c) => n + c.post_count, 0)).toBe(posts.length);
    for (const p of posts) {
      const full = await queryGetBlogPost(p.slug);
      expect(full?.slug).toBe(p.slug);
      expect(JSON.stringify(full)).not.toMatch(
        /"(notes_internal|reviewed_by|reviewed_at|authored_by)"/,
      );
      expect((await getRelatedBlogPosts(p.slug)).map((r) => r.slug)).not.toContain(p.slug);
    }
  });
});
