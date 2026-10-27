import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkCardProps {
  href: string;
  title: string;
  summary?: string;
  Icon?: LucideIcon;
  /** Chữ Hàn đi kèm tiêu đề (vd. 읽기). */
  ko?: string;
  className?: string;
}

/** Thẻ liên kết dùng cho lưới trụ / kỹ năng / loại đề. Cả thẻ là một vùng bấm. */
export function LinkCard({ href, title, summary, Icon, ko, className }: LinkCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-16 items-center gap-3 rounded-2xl border-2 border-b-4 border-line bg-card p-4 text-card-foreground transition-[background-color,border-color,transform] duration-150 outline-none hover:border-sky-200 hover:bg-sky-50 focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:active:translate-y-0.5",
        className,
      )}
    >
      {Icon ? (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600 group-hover:bg-background">
          <Icon aria-hidden className="size-5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 text-lg font-extrabold">
          {title}
          {ko ? (
            <span lang="ko" className="text-sm font-normal text-muted-foreground">
              {ko}
            </span>
          ) : null}
        </span>
        {summary ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{summary}</span>
        ) : null}
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}
