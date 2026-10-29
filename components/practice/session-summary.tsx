import { forwardRef } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { TopiCat } from "@/components/brand/topi-cat";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";

const S = t.runner.summary;

export interface SessionSummaryData {
  correct: number;
  total: number;
  spentMs: number;
  /** Tên các kiểu bẫy của những phương án sai bạn đã chọn (không lặp). */
  traps: string[];
}

/** "m:ss" (hoặc "h:mm:ss") — thời gian cả buổi. */
function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Màn tổng kết sau khi làm xong mọi câu của dạng (Figma "Di động — Tổng kết buổi học").
 * Quy tắc đỉnh–kết: mở bằng điều đã làm được, rồi mới nhắc bẫy cần nhớ và một việc tiếp theo.
 */
export const SessionSummary = forwardRef<
  HTMLHeadingElement,
  { data: SessionSummaryData; exitHref?: string; onReviewWrong?: () => void }
>(function SessionSummary({ data, exitHref, onReviewWrong }, ref) {
  const wrong = data.total - data.correct;
  return (
    <section aria-labelledby="session-summary" className="anim-slide-up space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-sky-50 px-5 py-6 text-center">
        <TopiCat sparkles className="anim-hop size-28" />
        <h2
          id="session-summary"
          ref={ref}
          tabIndex={-1}
          className="rounded-md text-3xl font-black tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {S.heading}
        </h2>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-mint-100 p-4 text-center">
          <dt className="sr-only">{S.correct}</dt>
          <dd className="text-3xl font-black text-mint-700 tabular-nums">
            {data.correct}/{data.total}
          </dd>
          <dd aria-hidden className="text-sm font-semibold text-ink-600">
            {S.correct}
          </dd>
        </div>
        <div className="rounded-3xl bg-sky-100 p-4 text-center">
          <dt className="sr-only">{S.time}</dt>
          <dd className="text-3xl font-black text-sky-700 tabular-nums">
            {formatDuration(data.spentMs)}
          </dd>
          <dd aria-hidden className="text-sm font-semibold text-ink-600">
            {S.time}
          </dd>
        </div>
      </dl>

      <div className="rounded-3xl bg-surface p-4">
        <h3 className="text-sm font-bold text-ink-600">{S.traps}</h3>
        {data.traps.length > 0 ? (
          <>
            <ul className="mt-2 flex flex-wrap gap-2">
              {data.traps.map((trap) => (
                <li
                  key={trap}
                  className="rounded-full bg-coral-100 px-3 py-1 text-sm font-extrabold text-coral-700"
                >
                  {trap}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-base leading-relaxed">{S.tip}</p>
          </>
        ) : (
          <p className="mt-1 text-base font-semibold">{S.noTrap}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pt-1">
        {wrong > 0 && onReviewWrong ? (
          <button
            type="button"
            onClick={onReviewWrong}
            className={cn(buttonVariants(), "h-12 w-full text-base")}
          >
            <RotateCcw aria-hidden className="size-4" />
            {S.reviewWrong}
          </button>
        ) : null}
        {exitHref ? (
          <Link
            href={exitHref}
            className={cn(
              wrong > 0 && onReviewWrong
                ? "rounded-lg px-2 py-2 text-base font-extrabold text-sky-600 outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
                : cn(buttonVariants(), "h-12 w-full text-base"),
            )}
          >
            {S.backToTypes}
          </Link>
        ) : null}
      </div>
    </section>
  );
});
