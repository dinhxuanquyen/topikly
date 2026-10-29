import Link from "next/link";
import { t } from "@/components/i18n";
import type { BlogPostSummary } from "@/lib/blog/types";
import { BlogStatusBadges } from "./blog-badges";
import { formatBlogDate } from "./format";
import { blogPostPath } from "./seo";

/**
 * Thẻ bài. Liên kết chỉ bao tiêu đề (tên truy cập gọn = tiêu đề); ::after của liên kết phủ cả thẻ
 * nên toàn thẻ vẫn là một vùng bấm. Tiêu đề là h3 (nằm dưới h2 của khối chứa nó).
 */
export function BlogPostCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="group relative flex h-full flex-col gap-2 rounded-3xl border-2 border-b-[5px] border-line bg-card p-5 text-card-foreground transition-[background-color,border-color,transform] duration-150 focus-within:ring-3 focus-within:ring-ring/50 hover:border-sky-200 hover:bg-sky-50 motion-safe:active:translate-y-0.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-bold text-sky-700">{post.category.name_vi}</span>
        <BlogStatusBadges post={post} />
      </div>
      <h3 className="text-lg leading-snug font-extrabold text-balance group-hover:text-sky-700">
        <Link
          href={blogPostPath(post.slug)}
          className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
        >
          {post.title}
        </Link>
      </h3>
      <p className="line-clamp-3 text-base text-muted-foreground">{post.description}</p>
      <p className="mt-auto flex flex-wrap items-center gap-x-2 pt-1 text-xs text-muted-foreground">
        {post.published_at ? (
          <>
            <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
            <span aria-hidden>·</span>
          </>
        ) : null}
        <span>{t.blog.readingMinutes(post.reading_minutes)}</span>
      </p>
    </article>
  );
}
