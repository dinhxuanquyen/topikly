import type { BlogPost, BlogPostSummary } from "@/lib/blog/types";
import { absoluteUrl } from "@/components/config/site";
import { t } from "@/components/i18n";

/** Đường dẫn trang bài. */
export function blogPostPath(slug: string): string {
  return `/blog/${slug}`;
}

export function blogCategoryPath(code: string): string {
  return `/blog/chuyen-muc/${code}`;
}

/** Bài nháp không được lập chỉ mục. */
export function isIndexablePost(post: Pick<BlogPostSummary, "status">): boolean {
  return post.status === "published";
}

/** JSON-LD Article (schema.org). Ngày bỏ trống thì bỏ trường, không bịa. */
export function buildArticleJsonLd(post: BlogPost, siteUrl?: string): Record<string, unknown> {
  const url = absoluteUrl(blogPostPath(post.slug), siteUrl);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: "vi",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    articleSection: post.category.name_vi,
    publisher: { "@type": "Organization", name: t.brand.name, url: absoluteUrl("/", siteUrl) },
  };
  if (post.tags.length > 0) data.keywords = post.tags.join(", ");
  if (post.published_at) data.datePublished = post.published_at;
  const modified = post.updated_at ?? post.published_at;
  if (modified) data.dateModified = modified;
  return data;
}

/**
 * Chuỗi JSON an toàn để nhúng trong <script type="application/ld+json">:
 * "<" thành \u003c nên không thể đóng thẻ script sớm; U+2028/2029 cũng được escape.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
