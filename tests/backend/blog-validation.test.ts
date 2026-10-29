import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildBlogLinkIndex } from "@/lib/blog/links";
import { collectBlogFiles } from "@/lib/blog/source";
import {
  splitFrontmatter,
  validateBlogFile,
  validateBlogFiles,
  type BlogFileInput,
} from "@/lib/blog/validation";
import { runValidateContent } from "../../scripts/lib/validate-content-cli";

const FIXTURES = path.resolve(__dirname, "../fixtures/content/valid");
const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Mẫu hợp lệ tối thiểu (cảnh báo độ dài thì có, lỗi thì không). */
const FRONT: Record<string, string> = {
  slug: "bai-mau",
  title: "Bài mẫu",
  description: "Mô tả ngắn.",
  category: "kinh-nghiem",
  programs: "[topik-ii]",
  status: "draft",
  authored_by: "topik-content-designer",
  reviewed_by: "null",
};
const BODY = "## Một\n\nNội dung.\n\n## Hai\n\nNội dung.\n";

/** Ghi đè trường frontmatter; giá trị `null` = bỏ hẳn trường. */
function file(
  overrides: Record<string, string | null> = {},
  body: string = BODY,
  name = "bai-mau",
): BlogFileInput {
  const fm: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...FRONT, ...overrides })) {
    if (v !== null) fm[k] = v;
  }
  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return { file: `blog/${name}.md`, text: `---\n${yaml}\n---\n\n${body}` };
}

const errorsOf = (input: BlogFileInput, options = {}) =>
  validateBlogFile(input, options).issues.filter((i) => i.severity === "error");
const warningsOf = (input: BlogFileInput, options = {}) =>
  validateBlogFile(input, options).issues.filter((i) => i.severity === "warning");

describe("blog/validation: frontmatter", () => {
  it("splitFrontmatter: tách khối và đếm dòng trước thân bài", () => {
    expect(splitFrontmatter("---\na: 1\n---\nThân")).toEqual({
      yamlText: "a: 1",
      body: "Thân",
      bodyOffset: 3,
    });
    expect(splitFrontmatter("Không có")).toBeUndefined();
    expect(splitFrontmatter("---\na: 1\n")).toBeUndefined();
  });

  it("file tối thiểu hợp lệ: không lỗi", () => {
    const r = validateBlogFile(file());
    expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(r.post).toMatchObject({
      slug: "bai-mau",
      status: "draft",
      published_at: null,
      reviewed_by: null,
      levels: [],
      tags: [],
      related: [],
      sources: [],
      notes_internal: null,
    });
  });

  it("thiếu frontmatter / YAML hỏng / không phải map", () => {
    expect(errorsOf({ file: "blog/x.md", text: "# chỉ có thân" })[0]!.message).toMatch(
      /frontmatter/,
    );
    expect(errorsOf({ file: "blog/x.md", text: "---\na: [1\n---\nx" })[0]!.message).toMatch(/YAML/);
    expect(errorsOf({ file: "blog/x.md", text: "---\n- a\n---\nx" })[0]!.message).toMatch(
      /khoá: giá trị/,
    );
  });

  it("đường dẫn không đúng blog/<slug>.md", () => {
    expect(errorsOf({ file: "blog/sub/x.md", text: "" })[0]!.message).toMatch(/blog\/<slug>\.md/);
    expect(errorsOf({ file: "tai-lieu/x.md", text: "" })).toHaveLength(1);
  });

  it("thiếu trường bắt buộc, kể cả reviewed_by (phải có và là null)", () => {
    const e = errorsOf(
      file({
        title: null,
        description: null,
        category: null,
        programs: null,
        status: null,
        authored_by: null,
        reviewed_by: null,
      }),
    );
    expect(e.map((i) => i.path).sort()).toEqual([
      "authored_by",
      "category",
      "description",
      "programs",
      "reviewed_by",
      "status",
      "title",
    ]);
    expect(e.every((i) => i.message === "thiếu trường bắt buộc")).toBe(true);
  });

  it("sai kiểu / enum / slug", () => {
    const e = errorsOf(
      file({
        category: "khong-co",
        status: "xong",
        levels: "[3.5]",
        published_at: "2026-02-30",
        slug: "Sai Slug",
      }),
    );
    expect(e.map((i) => i.path).sort()).toEqual([
      "category",
      "levels[0]",
      "published_at",
      "slug",
      "status",
    ]);
    expect(e.find((i) => i.path === "category")!.message).toMatch(/cau-truc-de/);
  });

  it("slug trùng route dành riêng hoặc lệch tên file", () => {
    expect(errorsOf(file({ slug: "chuyen-muc" }, BODY, "chuyen-muc")).map((i) => i.path)).toEqual([
      "slug",
    ]);
    const e = errorsOf(file({ slug: "khac" }));
    expect(e).toHaveLength(1);
    expect(e[0]!.message).toMatch(/không khớp tên file/);
  });

  it("chương trình lạ, cấp ngoài difficulty_range", () => {
    expect(errorsOf(file({ programs: "[eps]" })).map((i) => i.path)).toEqual(["programs[0]"]);
    expect(errorsOf(file({ levels: "[2, 3, 7]" })).map((i) => i.path)).toEqual([
      "levels[0]",
      "levels[2]",
    ]);
    expect(errorsOf(file({ levels: "[3, 6]" }))).toEqual([]);
  });

  it("published thiếu published_at -> lỗi; chưa duyệt -> cảnh báo not-reviewed (forImport: lỗi)", () => {
    expect(errorsOf(file({ status: "published" })).map((i) => i.path)).toEqual(["published_at"]);
    const ok = file({ status: "published", published_at: "2026-10-27" });
    expect(errorsOf(ok)).toEqual([]);
    expect(warningsOf(ok).some((i) => i.code === "not-reviewed")).toBe(true);
    expect(errorsOf(ok, { forImport: true }).map((i) => i.code)).toEqual(["not-reviewed"]);
    const reviewed = file({
      status: "published",
      published_at: "2026-10-27",
      reviewed_by: '"Người dùng"',
    });
    expect(warningsOf(reviewed).some((i) => i.code === "not-reviewed")).toBe(false);
  });

  it("cảnh báo: độ dài title/description, tag viết hoa, trường lạ, updated_at sớm hơn", () => {
    const w = warningsOf(
      file({
        title: `"${"x".repeat(71)}"`,
        description: '"ngắn"',
        tags: "[Han-Viet]",
        published_at: "2026-10-27",
        updated_at: "2026-10-01",
        reviewd_by: "null",
      }),
    );
    expect(w.map((i) => i.code ?? i.path).sort()).toEqual(
      [
        "body-length",
        "description-length",
        "tags[0]",
        "title-length",
        "unknown-field",
        "updated_at",
      ].sort(),
    );
  });

  it("tối đa 8 tag", () => {
    const tags = `[${Array.from({ length: 9 }, (_, i) => `t${i}`).join(", ")}]`;
    expect(errorsOf(file({ tags })).map((i) => i.path)).toEqual(["tags"]);
  });
});

describe("blog/validation: related, sources, thân bài", () => {
  const index = new Set([
    "/topik-ii/luyen-tap",
    "/topik-ii/ly-thuyet/tu-vung/han-tu/經",
    "/blog/bai-khac",
  ]);

  it("related.href: phải bắt đầu '/' (lỗi); không khớp trang thật là cảnh báo (cần linkIndex)", () => {
    const text = `---
slug: bai-mau
title: T
description: D
category: viet
programs: [topik-ii]
status: draft
authored_by: a
reviewed_by: null
related:
  - { href: "/topik-ii/luyen-tap", label: "ok" }
  - { href: "/topik-ii/ly-thuyet/tu-vung/han-tu/%E7%B6%93", label: "percent-encode ok" }
  - { href: "/topik-ii/luyen-tap/", label: "dấu / cuối ok" }
  - { href: "/topik-ii/khong-co", label: "không có trang" }
  - { href: "https://x.vn", label: "không nội bộ" }
  - { href: "de-thi", label: "tương đối" }
---

${BODY}`;
    const input = { file: "blog/bai-mau.md", text };
    const noIndex = validateBlogFile(input).issues;
    expect(noIndex.filter((i) => i.severity === "error").map((i) => i.path)).toEqual([
      "related[4].href",
      "related[5].href",
    ]);
    expect(noIndex.some((i) => i.code === "link-unknown")).toBe(false);
    const withIndex = validateBlogFile(input, { linkIndex: index }).issues;
    expect(withIndex.filter((i) => i.code === "link-unknown").map((i) => i.path)).toEqual([
      "related[3].href",
    ]);
  });

  it("sources.url phải là https://", () => {
    expect(
      errorsOf(file({ sources: '[{ title: "a", url: "http://x.vn" }]' })).map((i) => i.path),
    ).toEqual(["sources[0].url"]);
    expect(errorsOf(file({ sources: '[{ title: "a", url: "https://x.vn" }]' }))).toEqual([]);
  });

  it("thiếu sources khi cau-truc-de / tin-ky-thi hoặc thân bài nêu lệ phí, lịch thi", () => {
    const codes = (i: BlogFileInput) => warningsOf(i).map((w) => w.code);
    expect(codes(file({ category: "cau-truc-de" }))).toContain("sources-missing");
    expect(codes(file({ category: "tin-ky-thi" }))).toContain("sources-missing");
    expect(codes(file({ category: "viet" }))).not.toContain("sources-missing");
    expect(
      codes(file({ category: "viet" }, "## A\n\nLệ phí là bao nhiêu?\n\n## B\n\nx")),
    ).toContain("sources-missing");
  });

  it("lỗi Markdown báo kèm số dòng của FILE (cả frontmatter)", () => {
    const input = file({}, "## Một\n\n#### Sâu\n\n<div>x</div>\n");
    const e = errorsOf(input);
    const first = input.text.split("\n").findIndex((l) => l.startsWith("####")) + 1;
    expect(e.map((i) => i.path)).toEqual([`dòng ${first}`, `dòng ${first + 2}`]);
    expect(e.map((i) => i.code)).toEqual(["md-heading-depth", "md-html"]);
  });

  it("H3 trước H2, bảng lệch cột, liên kết sai giao thức đều là lỗi chặn", () => {
    const e = errorsOf(
      file({}, "### Sớm\n\n## A\n\n| a | b |\n|---|---|\n| 1 |\n\n[x](http://a.vn)\n"),
    );
    expect(e.map((i) => i.code)).toEqual([
      "md-h3-before-h2",
      "md-table-columns",
      "md-link-protocol",
    ]);
  });

  it("liên kết nội bộ trong thân bài không khớp trang thật -> cảnh báo; chữ Hán khớp", () => {
    const body =
      "## A\n\n[ok](/topik-ii/ly-thuyet/tu-vung/han-tu/經) [sai](/topik-ii/khong-co)\n\n## B\n\nx";
    const w = validateBlogFile(file({}, body), { linkIndex: index }).issues.filter(
      (i) => i.code === "link-unknown",
    );
    expect(w).toHaveLength(1);
    expect(w[0]!.message).toContain("/topik-ii/khong-co");
  });

  it("cảnh báo độ dài thân bài và số H2", () => {
    const codes = warningsOf(file({}, "## Chỉ một\n\nNgắn.")).map((i) => i.code);
    expect(codes).toContain("body-length");
    expect(codes).toContain("few-headings");
    const long = `## A\n\n${"từ ".repeat(700)}\n\n## B\n\nx`;
    expect(warningsOf(file({}, long)).map((i) => i.code)).not.toContain("body-length");
  });
});

describe("blog/validation: validateBlogFiles và CLI", () => {
  it("fixtures hợp lệ: 4 bài (3 published, 1 draft), không lỗi, liên kết khớp trang thật", () => {
    const files = collectBlogFiles(FIXTURES);
    expect(files.map((f) => f.file)).toEqual([
      "blog/cau-truc-de-mau.md",
      "blog/cau-truc-de-thu-hai.md",
      "blog/ky-nang-mau.md",
      "blog/tu-vung-han-viet-mau.md",
    ]);
    const linkIndex = buildBlogLinkIndex({
      contentRoot: FIXTURES,
      blogSlugs: files.map((f) => f.file.replace(/^blog\/|\.md$/g, "")),
    });
    const r = validateBlogFiles(files, { linkIndex });
    expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(r).toMatchObject({ filesChecked: 4, published: 3, draft: 1, errorCount: 0 });
    expect(r.issues.filter((i) => i.code === "link-unknown")).toEqual([]);
  });

  it("buildBlogLinkIndex: trang cố định và trang động từ nguồn", () => {
    const idx = buildBlogLinkIndex({ contentRoot: FIXTURES, blogSlugs: ["a"] });
    for (const p of [
      "/",
      "/blog",
      "/blog/a",
      "/blog/chuyen-muc/viet",
      "/topik-ii",
      "/topik-ii/de-thi/mini",
      "/topik-ii/luyen-tap/nghe",
      "/topik-ii/luyen-tap/doc/R19",
      "/topik-ii/luyen-tap/viet/W53",
      "/topik-ii/de-thi/mini/doc-sample",
      "/topik-ii/ly-thuyet/ngu-phap/neula-go",
      "/topik-ii/ly-thuyet/tu-vung/v-00001",
      "/topik-ii/ly-thuyet/tu-vung/han-tu/社",
    ]) {
      expect(idx.has(p), p).toBe(true);
    }
    expect(idx.has("/topik-ii/luyen-tap/doc/R20")).toBe(false);
  });

  function tmpContent() {
    const dir = mkdtempSync(path.join(os.tmpdir(), "topikly-blog-"));
    tmpDirs.push(dir);
    cpSync(FIXTURES, dir, { recursive: true });
    return dir;
  }
  function capture() {
    const out: string[] = [];
    const err: string[] = [];
    return { out, err, io: { log: (m: string) => out.push(m), error: (m: string) => err.push(m) } };
  }

  it("CLI: fixtures hợp lệ -> exit 0 và báo số bài blog", () => {
    const c = capture();
    expect(runValidateContent([FIXTURES], c.io)).toBe(0);
    expect(c.out.join("\n")).toMatch(/4 bài blog \(3 đã xuất bản, 1 bản nháp\)/);
  });

  it("CLI: chỉ có blog/*.md (không YAML) vẫn được kiểm", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "topikly-blog-"));
    tmpDirs.push(dir);
    mkdirSync(path.join(dir, "blog"));
    writeFileSync(path.join(dir, "blog", "x.md"), "không có frontmatter");
    const c = capture();
    expect(runValidateContent([dir], c.io)).toBe(1);
    expect(c.err.join("\n")).toContain("blog/x.md");
  });

  it("CLI: bài blog lỗi -> exit 1 kèm vị trí; cảnh báo related không làm fail", () => {
    const dir = tmpContent();
    const f = path.join(dir, "blog", "ky-nang-mau.md");
    writeFileSync(f, readFileSync(f, "utf8").replace("## Sau khi nghe", "#### Sau khi nghe"));
    const c = capture();
    expect(runValidateContent([dir], c.io)).toBe(1);
    const text = c.err.join("\n");
    expect(text).toContain("blog/ky-nang-mau.md");
    expect(text).toMatch(/\[LỖI\] dòng \d+: `####/);

    const dir2 = tmpContent();
    const g = path.join(dir2, "blog", "cau-truc-de-mau.md");
    writeFileSync(
      g,
      readFileSync(g, "utf8").replace(
        '"/topik-ii/luyen-tap/doc/R19"',
        '"/topik-ii/luyen-tap/doc/R99"',
      ),
    );
    const c2 = capture();
    expect(runValidateContent([dir2], c2.io)).toBe(0);
    expect(c2.out.join("\n")).toMatch(/related\[0\]\.href: .*không khớp trang nào có thật/);
  });
});
