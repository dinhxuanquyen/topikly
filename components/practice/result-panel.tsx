import { forwardRef } from "react";
import { CircleCheck, CircleMinus, CircleX } from "lucide-react";
import { TopiCat } from "@/components/brand/topi-cat";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { CheckResponse } from "@/lib/practice/types";
import { RichLines, splitLines } from "./rich-text";

export type Verdict = "correct" | "wrong" | "blank";

export function verdictOf(result: CheckResponse): Verdict {
  if (result.selectedLabel === null) return "blank";
  return result.correct ? "correct" : "wrong";
}

/** Câu thông báo ngắn cho vùng aria-live. */
export function verdictAnnouncement(result: CheckResponse): string {
  const verdict = verdictOf(result);
  const head =
    verdict === "correct"
      ? t.result.correct
      : verdict === "wrong"
        ? t.result.wrong
        : t.result.blank;
  if (verdict === "correct") return head;
  return `${head}. ${t.result.correctAnswerIs(result.correctLabel)}`;
}

const VERDICT_STYLE: Record<Verdict, string> = {
  correct: "bg-mint-100 text-ink-900 dark:bg-emerald-950/40 dark:text-emerald-50",
  wrong: "bg-coral-100 text-ink-900 dark:bg-red-950/40 dark:text-red-50",
  blank: "bg-sun-100 text-ink-900 dark:bg-amber-950/40 dark:text-amber-50",
};

const VERDICT_TEXT: Record<Verdict, string> = {
  correct: "text-mint-700",
  wrong: "text-coral-700",
  blank: "text-sun-600",
};

/**
 * Khối kết quả sau khi nộp: đúng/sai, đáp án đúng, lời giải, bản dịch lời thoại.
 * Ghi chú từng phương án nhiễu nằm ngay trong thẻ phương án (choice-list.tsx).
 * Nhận focus (tabIndex -1) từ trình làm bài ngay sau khi có kết quả.
 */
export const ResultPanel = forwardRef<HTMLElement, { result: CheckResponse }>(function ResultPanel(
  { result },
  ref,
) {
  const verdict = verdictOf(result);
  const heading =
    verdict === "correct"
      ? t.result.correct
      : verdict === "wrong"
        ? t.result.wrong
        : t.result.blank;
  const Icon = verdict === "correct" ? CircleCheck : verdict === "wrong" ? CircleX : CircleMinus;
  const translation = result.transcript_vi ? splitLines(result.transcript_vi) : [];

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={t.result.regionLabel}
      data-verdict={verdict}
      className="anim-slide-up scroll-mt-[calc(var(--header-height)+0.75rem)] space-y-4 rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className={cn("flex items-start gap-3 rounded-3xl p-4 md:p-5", VERDICT_STYLE[verdict])}>
        <Icon
          aria-hidden
          className={cn(
            "mt-0.5 size-8 shrink-0",
            VERDICT_TEXT[verdict],
            verdict === "correct" && "anim-pop",
          )}
        />
        <div className="min-w-0 flex-1">
          <h2 className={cn("text-2xl font-extrabold", VERDICT_TEXT[verdict])}>{heading}</h2>
          <p className="mt-0.5 text-sm">
            {result.selectedLabel === null
              ? t.result.blankChoice
              : t.result.yourChoice(result.selectedLabel)}{" "}
            {t.result.correctAnswerIs(result.correctLabel)}
          </p>
        </div>
        {verdict === "correct" ? (
          <TopiCat className="anim-hop size-11 shrink-0 md:size-16" />
        ) : null}
      </div>

      <div className="rounded-3xl bg-surface p-4 md:p-5">
        <h3 className="text-lg font-extrabold">{t.result.explanation}</h3>
        <RichLines
          text={result.explanation_vi}
          tagKorean
          className="mt-2 space-y-2.5"
          lineClassName="leading-relaxed"
        />
      </div>

      {translation.length > 0 ? (
        <div className="rounded-3xl bg-surface p-4 md:p-5">
          <h3 className="text-lg font-extrabold">{t.result.translation}</h3>
          <ul className="mt-2 space-y-1.5">
            {translation.map((line, index) => (
              <li key={index} className="leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
});
