"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, ListChecks } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { ExamKind, ExamSummary } from "@/lib/exam/types";
import { toMinutes, type ExamStatusSummary } from "./exam-state";
import { loadExamStatuses } from "./exam-store";

interface ExamListProps {
  program: string;
  kind: ExamKind;
  exams: readonly ExamSummary[];
  /** Nhãn aria của danh sách. */
  label: string;
}

/**
 * Danh sách thẻ đề của một loại. Nội dung thẻ prerender từ server; trạng thái chế độ khách
 * (đang làm dở, số lần làm, điểm gần nhất) đọc từ IndexedDB sau khi hydrate và đọc lại khi
 * tab hiện lại / trang được khôi phục từ bộ nhớ đệm.
 */
export function ExamList({ program, kind, exams, label }: ExamListProps) {
  const [statuses, setStatuses] = useState<Record<string, ExamStatusSummary> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void loadExamStatuses(program, kind).then((map) => {
        if (!cancelled) setStatuses(map);
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
  }, [program, kind]);

  return (
    <ul aria-label={label} className="grid gap-3 sm:grid-cols-2">
      {exams.map((exam) => (
        <li key={exam.id}>
          <ExamCard
            exam={exam}
            href={`/${program}/de-thi/${kind}/${exam.id}`}
            status={statuses === null ? null : (statuses[exam.id] ?? { draft: false, attempts: 0 })}
          />
        </li>
      ))}
    </ul>
  );
}

interface ExamCardProps {
  exam: ExamSummary;
  href: string;
  /** null = chưa đọc xong IndexedDB. */
  status: ExamStatusSummary | null;
}

export function ExamCard({ exam, href, status }: ExamCardProps) {
  const skills = exam.skills.map((skill) => t.examCard.skillNames[skill]).join(" + ");

  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {exam.title}
            {exam.status === "draft" ? (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground group-hover:bg-background">
                {t.examCard.sampleBadge}
              </span>
            ) : null}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ListChecks aria-hidden className="size-4" />
              {t.examCard.questionCount(exam.question_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-4" />
              {t.examCard.minutes(toMinutes(exam.duration_sec))}
            </span>
            <span>{skills}</span>
          </span>
        </span>
        <ArrowRight
          aria-hidden
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </span>

      {/* Giữ chiều cao dòng trạng thái khi chưa có dữ liệu để thẻ không nhảy. */}
      <span className="mt-auto block min-h-10 text-sm">
        {status === null ? (
          <span aria-hidden>&nbsp;</span>
        ) : (
          <>
            <span
              className={cn(
                "block font-semibold",
                status.draft && "text-amber-800 dark:text-amber-300",
                !status.draft && !status.latest && "font-normal text-muted-foreground",
              )}
            >
              {status.draft
                ? t.examCard.statusDraft
                : status.latest
                  ? t.examCard.statusLatest(
                      status.latest.score,
                      status.latest.maxScore,
                      status.latest.levelLabel,
                      status.latest.isEstimate,
                    )
                  : t.examCard.statusNew}
            </span>
            {status.attempts > 0 ? (
              <span className="block text-xs text-muted-foreground">
                {t.examCard.attempts(status.attempts)}
              </span>
            ) : null}
          </>
        )}
      </span>
    </Link>
  );
}
