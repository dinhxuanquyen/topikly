import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { t } from "@/components/i18n";
import { Breadcrumb, type Crumb } from "@/components/placeholder/breadcrumb";
import { cn } from "@/lib/utils";

/** Khung trang luyện tập thật (đã có nội dung): breadcrumb, tiêu đề, mô tả, nội dung. */
export function PracticePageShell({
  breadcrumb,
  title,
  description,
  wide = false,
  exitHref,
  children,
}: {
  breadcrumb: Crumb[];
  title: string;
  description?: string;
  /** true = lưới rộng (danh sách thẻ); false = cột đọc (trình làm bài). */
  wide?: boolean;
  /**
   * Có = trang làm bài ở chế độ tập trung: trên điện thoại header và thanh tab ẩn đi
   * (xem isFocusPath), thay bằng nút ✕ về `exitHref` cạnh tiêu đề gọn.
   */
  exitHref?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "mx-auto w-full flex-1 px-4 py-6 md:px-6 md:py-10",
        exitHref && "max-md:pt-[calc(0.5rem+env(safe-area-inset-top))] max-md:pb-0",
        wide ? "max-w-4xl" : "max-w-3xl",
      )}
    >
      <div className={cn(exitHref && "max-md:hidden")}>
        <Breadcrumb items={breadcrumb} />
      </div>
      <header
        className={cn(
          "mb-6",
          exitHref && "max-md:mb-4 max-md:flex max-md:items-center max-md:gap-3",
        )}
      >
        {exitHref ? (
          <Link
            href={exitHref}
            aria-label={t.runner.exit}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink-600 outline-none hover:bg-sky-50 focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
          >
            <X aria-hidden className="size-5" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1
            className={cn(
              "text-2xl font-extrabold tracking-tight text-balance md:text-3xl",
              exitHref && "max-md:text-lg max-md:leading-snug",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "mt-2 max-w-prose text-base text-muted-foreground",
                exitHref && "max-md:mt-0.5 max-md:text-sm",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </article>
  );
}
