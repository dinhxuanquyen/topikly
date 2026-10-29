import { t } from "@/components/i18n";
import type { BlogTocEntry } from "@/lib/blog/types";
import { renderBlogPlain } from "./blog-inline";

/** Mục lục từ các H2. Dưới 2 mục thì không đáng hiện. */
/** `idPrefix` (slug bài) làm id tiêu đề duy nhất: Next giữ trang cũ ẩn sau khi chuyển trang. */
export function BlogToc({ toc, idPrefix }: { toc: BlogTocEntry[]; idPrefix: string }) {
  if (toc.length < 2) return null;
  const headingId = `blog-toc-heading-${idPrefix}`;
  return (
    <nav aria-labelledby={headingId} className="my-6 rounded-3xl bg-surface p-5">
      <h2 id={headingId} className="mb-2 text-base font-extrabold">
        {t.blog.toc}
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm marker:text-muted-foreground">
        {toc.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${encodeURIComponent(entry.id)}`}
              className="rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {renderBlogPlain(entry.text)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
