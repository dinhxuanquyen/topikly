import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { t } from "@/components/i18n";
import type { PracticeTypeSummary } from "@/lib/practice/types";
import { GuestTypeStats } from "./guest-type-stats";
import { renderInline } from "./rich-text";

/** Phần dữ liệu thẻ cần: dùng chung cho Nghe/Đọc (PracticeTypeSummary) và Viết (WritingTypeSummary). */
export type TypeCardData = Pick<
  PracticeTypeSummary,
  "type_code" | "name_vi" | "type_group" | "group_name_vi" | "question_count"
>;

/**
 * Thẻ một dạng câu trên trang kỹ năng. Cả thẻ là một liên kết; thống kê khách hydrate sau.
 * `footer` thay phần thống kê mặc định (Viết không có thống kê đúng/sai).
 */
export function PracticeTypeCard({
  program,
  skillSlug,
  type,
  footer,
  countLabel,
}: {
  program: string;
  skillSlug: string;
  type: TypeCardData;
  footer?: ReactNode;
  /** Thay chữ "n câu" mặc định (Viết đếm theo đề). */
  countLabel?: string;
}) {
  return (
    <Link
      href={`/${program}/luyen-tap/${skillSlug}/${type.type_code}`}
      className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex items-start gap-3">
        <span className="grid h-9 min-w-12 shrink-0 place-items-center rounded-lg bg-brand-soft px-2 text-sm font-bold text-brand-soft-foreground group-hover:bg-background">
          {type.type_code}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {renderInline(type.name_vi, { tagKorean: true })}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {t.practiceSkill.groupLabel(type.type_group)} ·{" "}
            {renderInline(type.group_name_vi, { tagKorean: true })}
          </span>
        </span>
        <ArrowRight
          aria-hidden
          className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </span>
      <span className="mt-auto block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          {countLabel ?? t.practiceSkill.questionCount(type.question_count)}
        </span>
        {footer ?? (
          <GuestTypeStats
            program={program}
            typeCode={type.type_code}
            questionCount={type.question_count}
          />
        )}
      </span>
    </Link>
  );
}
