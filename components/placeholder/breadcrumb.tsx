import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { t } from "@/components/i18n";

export interface Crumb {
  label: string;
  /** Bỏ trống cho mục cuối (trang hiện tại). */
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label={t.a11y.breadcrumb} className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-foreground" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight aria-hidden className="size-3.5" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
