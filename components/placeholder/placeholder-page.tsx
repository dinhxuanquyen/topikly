import type { ReactNode } from "react";
import { t } from "@/components/i18n";
import { Breadcrumb, type Crumb } from "./breadcrumb";
import { StatusBadge } from "./status-badge";

interface PlaceholderPageProps {
  title: string;
  description: string;
  /** Mô tả ngắn các tính năng sẽ có (lấy từ README mục 3). */
  planned?: readonly string[];
  breadcrumb?: Crumb[];
  /** Hiện huy hiệu "Sắp ra mắt" thay vì "Đang xây dựng". */
  statusVariant?: "building" | "soon";
  /** Nội dung chèn giữa phần mở đầu và danh sách (vd. lưới liên kết). */
  children?: ReactNode;
}

/** Khung chung cho mọi trang chưa làm xong: tiêu đề, công dụng, trạng thái. */
export function PlaceholderPage({
  title,
  description,
  planned,
  breadcrumb,
  statusVariant = "building",
  children,
}: PlaceholderPageProps) {
  return (
    <article className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-10">
      {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
      <header className="mb-8">
        <StatusBadge variant={statusVariant} />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-prose text-base text-muted-foreground md:text-lg">{description}</p>
      </header>

      {children}

      {planned && planned.length > 0 ? (
        <section aria-labelledby="planned-heading" className="mt-8">
          <h2 id="planned-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
            {t.common.plannedHeading}
          </h2>
          <ul className="space-y-2">
            {planned.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
