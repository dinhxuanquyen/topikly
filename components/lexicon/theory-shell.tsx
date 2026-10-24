import type { ReactNode } from "react";
import Link from "next/link";
import { t } from "@/components/i18n";
import { Breadcrumb, type Crumb } from "@/components/placeholder/breadcrumb";
import { cn } from "@/lib/utils";

/**
 * Khung trang của trụ Lý thuyết: breadcrumb, (tuỳ chọn) tiêu đề + mô tả, nội dung, và chân trang
 * có liên kết "Nguồn và ghi công". Bỏ `title` khi trang tự đặt <h1> (vd. trang chi tiết một từ).
 */
export function TheoryShell({
  program,
  breadcrumb,
  title,
  description,
  wide = false,
  children,
}: {
  program: string;
  breadcrumb: Crumb[];
  title?: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "mx-auto w-full min-w-0 flex-1 px-4 py-6 md:px-6 md:py-10",
        wide ? "max-w-4xl" : "max-w-3xl",
      )}
    >
      <Breadcrumb items={breadcrumb} />
      {title ? (
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-prose text-base text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
      <footer className="mt-10 border-t border-border pt-4 text-sm text-muted-foreground">
        <p>
          {t.theory.footerNote}{" "}
          <Link
            href={`/${program}/ly-thuyet/nguon`}
            className="rounded-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t.theory.sourcesLink}
          </Link>
        </p>
      </footer>
    </article>
  );
}
