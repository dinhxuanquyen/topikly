import { t } from "@/components/i18n";
import type { BlogPostSummary } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const BADGE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap";

/** Nhãn "Bản nháp" (status draft) và "Chưa duyệt" (chưa có người duyệt). Không có nhãn thì không render. */
export function BlogStatusBadges({
  post,
  className,
}: {
  post: Pick<BlogPostSummary, "status" | "reviewed">;
  className?: string;
}) {
  const draft = post.status === "draft";
  const unreviewed = !post.reviewed;
  if (!draft && !unreviewed) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {draft ? (
        <span
          className={cn(
            BADGE,
            "border-amber-600/40 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
          )}
        >
          {t.blog.draftBadge}
        </span>
      ) : null}
      {unreviewed ? (
        <span className={cn(BADGE, "border-border bg-muted text-foreground/80")}>
          {t.blog.unreviewedBadge}
        </span>
      ) : null}
    </span>
  );
}
