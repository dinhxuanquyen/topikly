import Link from "next/link";
import { t } from "@/components/i18n";
import type { BlogPostSummary } from "@/lib/blog/types";
import { BlogPostCard } from "./blog-post-card";

interface BlogPostListProps {
  posts: BlogPostSummary[];
  /** Nhãn cho danh sách (đọc bởi trình đọc màn hình). */
  label?: string;
  /** Nội dung khi không có bài. Mặc định: chưa có bài nào. */
  emptyText?: string;
  /** Liên kết gợi ý dưới câu "chưa có bài" (vd. xem tất cả). */
  emptyAction?: { href: string; label: string };
}

export function BlogPostList({ posts, label, emptyText, emptyAction }: BlogPostListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center text-base">
        <p>{emptyText ?? t.blog.emptyAll}</p>
        {emptyAction ? (
          <Link
            href={emptyAction.href}
            className="mt-2 inline-block font-medium text-primary underline underline-offset-4"
          >
            {emptyAction.label}
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <ul aria-label={label ?? t.blog.listLabel} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.slug}>
          <BlogPostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
