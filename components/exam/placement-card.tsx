"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Compass, ListChecks, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { renderInline } from "@/components/practice/rich-text";
import { cn } from "@/lib/utils";
import type { PlacementEstimate } from "@/lib/exam/types";
import { toMinutes } from "./exam-state";
import { loadLatestResult } from "./exam-store";

interface PlacementCardProps {
  program: string;
  /** Đề Test trình độ đang dùng; null = chưa có đề. */
  exam: { id: string; question_count: number; duration_sec: number } | null;
  /** Trang làm bài, ví dụ /topik-ii/lo-trinh/test-trinh-do. */
  href: string;
}

/** Chỉ nhận kết quả có phần `placement` hợp lệ (dữ liệu cũ/hỏng trong IndexedDB bị bỏ qua). */
function pickEstimate(placement: PlacementEstimate | undefined): PlacementEstimate | null {
  if (
    placement &&
    typeof placement.estimated_label === "string" &&
    typeof placement.start_label === "string"
  ) {
    return placement;
  }
  return null;
}

/**
 * Thẻ nổi bật "Test trình độ" ở trang Lộ trình. Nội dung tĩnh prerender từ server; kết quả gần
 * nhất của khách đọc từ IndexedDB sau khi hydrate (và đọc lại khi tab hiện lại). Thiếu IndexedDB
 * hoặc chưa có kết quả thì thẻ hiện lời mời làm test, không báo lỗi.
 */
export function PlacementCard({ program, exam, href }: PlacementCardProps) {
  const examId = exam?.id;
  const [estimate, setEstimate] = useState<PlacementEstimate | null>(null);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    const refresh = () => {
      void loadLatestResult(program, "placement", examId)
        .then((result) => {
          if (!cancelled) setEstimate(pickEstimate(result?.placement));
        })
        .catch(() => {
          if (!cancelled) setEstimate(null);
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [program, examId]);

  return (
    <section
      aria-labelledby="placement-card-heading"
      className="rounded-2xl border-2 border-primary/30 bg-brand-soft p-4 md:p-5"
    >
      <h2
        id="placement-card-heading"
        className="flex items-center gap-2 text-xl font-bold text-brand-soft-foreground"
      >
        <Compass aria-hidden className="size-5 shrink-0" />
        {t.placement.title}
      </h2>

      {exam ? (
        <>
          <p className="mt-2 max-w-prose text-sm md:text-base">
            {t.placement.card.summary(exam.question_count, toMinutes(exam.duration_sec))}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ListChecks aria-hidden className="size-4" />
              {t.examCard.questionCount(exam.question_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-4" />
              {t.examCard.minutes(toMinutes(exam.duration_sec))}
            </span>
          </p>

          {estimate ? (
            <div data-testid="placement-card-result" className="mt-3 rounded-xl bg-background p-3">
              <p className="font-semibold">
                {renderInline(
                  t.placement.card.result(estimate.estimated_label, estimate.start_label),
                  { tagKorean: true },
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.placement.card.resultNote}</p>
            </div>
          ) : null}

          <div className="mt-4">
            <Link
              href={href}
              aria-label={estimate ? t.placement.card.retryLabel : undefined}
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-5 text-base")}
            >
              {estimate ? <RotateCcw aria-hidden /> : null}
              {estimate ? t.placement.card.retry : t.placement.card.start}
              {estimate ? null : <ArrowRight aria-hidden />}
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{t.placement.card.unavailable}</p>
      )}
    </section>
  );
}
