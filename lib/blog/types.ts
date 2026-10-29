/**
 * Hợp đồng dữ liệu của Blog (docs/blog-spec.md). Nguồn: content/blog/<slug>.md.
 *
 * File này AN TOÀN CHO CLIENT: chỉ chứa kiểu và hằng số thuần, không import fs/node/zod.
 * Frontend import kiểu từ đây; đọc file, parse Markdown và validate nằm ở server (source.ts),
 * truy vấn có cache ở queries.ts.
 *
 * Thân bài được server parse sẵn thành `BlogBlock[]`, nên giao diện chỉ render khối, không tự
 * parse Markdown. Chữ trong khối (`text`, ô bảng, mục danh sách) vẫn là chuỗi có đánh dấu
 * trong dòng: `**đậm**`, `*nghiêng*`, `[chữ](href)` với href nội bộ ("/...") hoặc "https://...".
 * Server đã kiểm cú pháp và giao thức liên kết; giao diện render bằng React (không dùng
 * dangerouslySetInnerHTML) và tự gắn lang="ko" cho cụm chữ Hàn.
 *
 * Bản công khai đã bỏ `notes_internal`, `reviewed_by`, `reviewed_at`, `authored_by`; thay bằng cờ
 * `reviewed` để giao diện đánh dấu bài chưa được người dùng duyệt.
 */

/** Chuyên mục blog: danh sách đóng. `code` dùng trong URL /blog/chuyen-muc/<code>. */
export const BLOG_CATEGORIES = [
  {
    code: "cau-truc-de",
    name_vi: "Cấu trúc đề",
    description_vi: "Cấu trúc đề, thang điểm, cách quy đổi cấp và hình thức thi.",
  },
  {
    code: "ky-nang",
    name_vi: "Kỹ năng Nghe – Đọc",
    description_vi: "Chiến lược làm từng dạng câu Nghe và Đọc.",
  },
  {
    code: "viet",
    name_vi: "Viết",
    description_vi: "Cách làm câu 51–54, khung bài, biểu hiện và lỗi hay gặp.",
  },
  {
    code: "tu-vung",
    name_vi: "Từ vựng & Hán-Việt",
    description_vi: "Từ vựng theo chủ đề, gốc Hán-Hàn và bạn giả Hán-Việt.",
  },
  {
    code: "ngu-phap",
    name_vi: "Ngữ pháp",
    description_vi: "Điểm ngữ pháp theo cấp và cách phân biệt nhóm gần nghĩa.",
  },
  {
    code: "kinh-nghiem",
    name_vi: "Kinh nghiệm ôn thi",
    description_vi: "Lộ trình, cách lập kế hoạch và kinh nghiệm ôn thi.",
  },
  {
    code: "tin-ky-thi",
    name_vi: "Tin kỳ thi",
    description_vi: "Thông báo về kỳ thi, có dẫn nguồn chính thức.",
  },
] as const;

export type BlogCategoryCode = (typeof BLOG_CATEGORIES)[number]["code"];

export const BLOG_CATEGORY_CODES: readonly BlogCategoryCode[] = BLOG_CATEGORIES.map((c) => c.code);

/** Slug dành riêng cho route, không được dùng làm slug bài. */
export const RESERVED_BLOG_SLUGS: readonly string[] = ["chuyen-muc"];

export type BlogStatus = "draft" | "published";

export interface BlogCategoryRef {
  code: BlogCategoryCode;
  name_vi: string;
}

/** Chuyên mục kèm số bài đang hiển thị (để dựng bộ lọc). */
export interface BlogCategorySummary extends BlogCategoryRef {
  description_vi: string;
  post_count: number;
}

// ------------------------------------------------------------------ thân bài

export interface BlogHeadingBlock {
  kind: "h2" | "h3";
  /** Neo trong trang, duy nhất trong bài (bỏ dấu, chữ thường, "-"; trùng thì "-2", "-3"). */
  id: string;
  text: string;
}

export interface BlogParagraphBlock {
  kind: "p";
  text: string;
}

export interface BlogListBlock {
  kind: "ul" | "ol";
  items: string[];
}

/** Khung mẹo / lưu ý (dòng bắt đầu bằng "> "). */
export interface BlogQuoteBlock {
  kind: "quote";
  text: string;
}

export interface BlogTableBlock {
  kind: "table";
  header: string[];
  /** Mọi hàng cùng số cột với `header`. */
  rows: string[][];
}

export type BlogBlock =
  BlogHeadingBlock | BlogParagraphBlock | BlogListBlock | BlogQuoteBlock | BlogTableBlock;

/** Mục lục: các H2 theo thứ tự. */
export interface BlogTocEntry {
  id: string;
  text: string;
}

export interface BlogLink {
  /** Đường dẫn nội bộ bắt đầu bằng "/". */
  href: string;
  label: string;
}

export interface BlogSource {
  title: string;
  /** Luôn "https://...". */
  url: string;
}

// ------------------------------------------------------------------ bài

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  category: BlogCategoryRef;
  /** Slug chương trình, ví dụ ["topik-ii"]. */
  programs: string[];
  /** Cấp người đọc nhắm tới (có thể rỗng). */
  levels: number[];
  tags: string[];
  status: BlogStatus;
  /** "YYYY-MM-DD". Bài `draft` có thể chưa có. */
  published_at: string | null;
  updated_at: string | null;
  /** Số từ thân bài / 200, làm tròn lên, tối thiểu 1. */
  reading_minutes: number;
  /** true khi người dùng đã điền `reviewed_by`. */
  reviewed: boolean;
}

export interface BlogPost extends BlogPostSummary {
  blocks: BlogBlock[];
  toc: BlogTocEntry[];
  related: BlogLink[];
  sources: BlogSource[];
}
