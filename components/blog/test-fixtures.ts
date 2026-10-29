import type { BlogCategorySummary, BlogPost, BlogPostSummary } from "@/lib/blog/types";

/** Dữ liệu mẫu cho test component Blog (không đọc file thật). */
export function makeSummary(overrides: Partial<BlogPostSummary> = {}): BlogPostSummary {
  return {
    slug: "cau-truc-de-topik-ii",
    title: "Cấu trúc đề TOPIK II",
    description: "Đề TOPIK II gồm những phần nào và tính điểm ra sao.",
    category: { code: "cau-truc-de", name_vi: "Cấu trúc đề" },
    programs: ["topik-ii"],
    levels: [3, 4],
    tags: ["topik-ii"],
    status: "published",
    published_at: "2026-10-27",
    updated_at: null,
    reading_minutes: 5,
    reviewed: true,
    ...overrides,
  };
}

export function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    ...makeSummary(),
    blocks: [
      { kind: "h2", id: "phan-nghe", text: "Phần Nghe" },
      { kind: "p", text: "Phần **Nghe** có 50 câu." },
      { kind: "h2", id: "phan-doc", text: "Phần Đọc" },
      { kind: "p", text: "Phần Đọc cũng có 50 câu." },
    ],
    toc: [
      { id: "phan-nghe", text: "Phần Nghe" },
      { id: "phan-doc", text: "Phần Đọc" },
    ],
    related: [{ href: "/topik-ii/de-thi/mini", label: "Làm Mini test" }],
    sources: [{ title: "Trang chủ TOPIK", url: "https://www.topik.go.kr/" }],
    ...overrides,
  };
}

export const CATEGORIES: BlogCategorySummary[] = [
  {
    code: "cau-truc-de",
    name_vi: "Cấu trúc đề",
    description_vi: "Cấu trúc đề, thang điểm.",
    post_count: 2,
  },
  { code: "viet", name_vi: "Viết", description_vi: "Cách làm câu 51–54.", post_count: 0 },
  {
    code: "tu-vung",
    name_vi: "Từ vựng & Hán-Việt",
    description_vi: "Từ vựng theo chủ đề.",
    post_count: 1,
  },
];
