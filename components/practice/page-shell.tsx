import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/placeholder/breadcrumb";
import { cn } from "@/lib/utils";

/** Khung trang luyện tập thật (đã có nội dung): breadcrumb, tiêu đề, mô tả, nội dung. */
export function PracticePageShell({
  breadcrumb,
  title,
  description,
  wide = false,
  children,
}: {
  breadcrumb: Crumb[];
  title: string;
  description?: string;
  /** true = lưới rộng (danh sách thẻ); false = cột đọc (trình làm bài). */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "mx-auto w-full flex-1 px-4 py-6 md:px-6 md:py-10",
        wide ? "max-w-4xl" : "max-w-3xl",
      )}
    >
      <Breadcrumb items={breadcrumb} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-prose text-base text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </article>
  );
}
