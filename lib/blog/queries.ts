"use cache";

/**
 * Truy vấn CÓ CACHE cho server component — Blog (docs/blog-spec.md).
 * Lý do dùng "use cache" và `cacheLife("max")`: xem ./../practice/queries.ts.
 *
 * Frontend gọi các hàm này từ page/layout. KHÔNG gọi ./source trực tiếp từ page.
 * Mọi hàm trả kiểu công khai (./types.ts): không có notes_internal, reviewed_by, reviewed_at,
 * authored_by. Kết quả "không có" là `null` hoặc mảng rỗng, vì cache không lưu `undefined` ổn định;
 * page nên gọi `notFound()` khi `getBlogPost` trả `null`.
 */
import { cacheLife } from "next/cache";
import {
  getBlogPost as sourceGetBlogPost,
  listBlogCategories,
  listBlogPosts,
  listRelatedPosts,
} from "./source";
import type { BlogCategorySummary, BlogPost, BlogPostSummary } from "./types";

/**
 * Danh sách bài (tóm tắt): published mới nhất trước (published_at giảm dần), draft cuối.
 * `category` bỏ trống = tất cả; mã chuyên mục lạ cho mảng rỗng. Draft ẩn khi TOPIKLY_HIDE_DRAFT_POSTS=1.
 */
export async function getBlogPosts(category?: string): Promise<BlogPostSummary[]> {
  cacheLife("max");
  return listBlogPosts(category === undefined ? {} : { category });
}

/** Một bài đầy đủ (thân bài đã parse thành khối, mục lục, related, sources). `null` nếu không có. */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  cacheLife("max");
  return sourceGetBlogPost(slug) ?? null;
}

/** Cả 7 chuyên mục theo thứ tự cố định, kèm `post_count` (bài đang hiển thị, có thể bằng 0). */
export async function getBlogCategories(): Promise<BlogCategorySummary[]> {
  cacheLife("max");
  return listBlogCategories();
}

/** Bài liên quan (cùng chuyên mục trước, rồi chung tag), không gồm chính bài đó. Mặc định 3. */
export async function getRelatedBlogPosts(slug: string, limit = 3): Promise<BlogPostSummary[]> {
  cacheLife("max");
  return listRelatedPosts(slug, limit);
}
