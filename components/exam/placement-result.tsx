import { useMemo } from "react";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { t } from "@/components/i18n";
import { renderInline } from "@/components/practice/rich-text";
import { cn } from "@/lib/utils";
import type { BreakdownRow, PlacementBand, PlacementEstimate } from "@/lib/exam/types";
import { practiceHrefForGroup, ratePercent } from "./exam-state";

/** Câu giải thích quy tắc "vững một bậc"; chỉ nêu con số khi cấu hình chương trình được truyền xuống. */
export function bandRuleText(passRatio: number | undefined): string {
  if (passRatio === undefined || !Number.isFinite(passRatio) || passRatio <= 0 || passRatio > 1) {
    return t.placement.result.ruleWithoutRatio;
  }
  return t.placement.result.ruleWithRatio(Math.round(passRatio * 100));
}

interface PlacementSummaryProps {
  placement: PlacementEstimate;
  passRatio?: number;
}

/** Khối đầu trang kết quả: trình độ ước lượng, cấp nên bắt đầu và quy tắc tính. */
export function PlacementSummary({ placement, passRatio }: PlacementSummaryProps) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/30 bg-brand-soft p-4 md:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-brand-soft-foreground">
            {t.placement.result.startLabel}
          </p>
          <p data-testid="placement-start" className="mt-1 text-4xl font-bold">
            {renderInline(placement.start_label, { tagKorean: true })}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-soft-foreground">
            {t.placement.result.estimatedLabel}
          </p>
          <p data-testid="placement-estimated" className="mt-1 text-2xl font-semibold">
            {renderInline(placement.estimated_label, { tagKorean: true })}
          </p>
        </div>
      </div>
      {placement.estimated_level === null ? (
        <p className="text-sm font-semibold">{t.placement.result.belowLowest}</p>
      ) : null}
      <p className="text-sm">{bandRuleText(passRatio)}</p>
      <p className="text-sm text-muted-foreground">{t.placement.result.disclaimer}</p>
    </div>
  );
}

/** Thanh tỉ lệ của một bậc; có vạch mốc "vững" khi biết ngưỡng. Trạng thái vẫn có chữ + biểu tượng. */
function BandBar({
  percent,
  passed,
  markPercent,
}: {
  percent: number;
  passed: boolean;
  markPercent?: number;
}) {
  return (
    <div aria-hidden className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        data-testid="band-bar"
        className={cn("h-full rounded-full", passed ? "bg-emerald-600" : "bg-amber-500")}
        style={{ width: `${percent}%` }}
      />
      {markPercent !== undefined ? (
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/70"
          style={{ left: `${markPercent}%` }}
        />
      ) : null}
    </div>
  );
}

function BandRow({ band, markPercent }: { band: PlacementBand; markPercent?: number }) {
  const percent = ratePercent(band.correct, band.total);
  const Icon = band.passed ? CircleCheck : CircleX;
  return (
    <tr className="border-t border-border" data-passed={band.passed}>
      <th scope="row" className="px-3 py-2.5 font-semibold whitespace-nowrap">
        {renderInline(t.placement.result.band(band.difficulty), { tagKorean: true })}
      </th>
      <td className="px-3 py-2.5 tabular-nums">
        {band.correct}/{band.total}
      </td>
      <td className="min-w-24 px-3 py-2.5">
        <span className="block tabular-nums">{t.placement.result.ratioLabel(percent)}</span>
        <span className="mt-1 block">
          <BandBar percent={percent} passed={band.passed} markPercent={markPercent} />
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold",
            band.passed
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-amber-800 dark:text-amber-300",
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          {band.passed ? t.placement.result.bandPassed : t.placement.result.bandFailed}
        </span>
      </td>
    </tr>
  );
}

interface PlacementDetailsProps {
  placement: PlacementEstimate;
  program: string;
  /** Các type_code đang có câu luyện; undefined = coi như mọi dạng đều có. */
  practiceTypeCodes?: readonly string[];
  passRatio?: number;
  /** id tiền tố để nối aria-labelledby cho từng mục. */
  idPrefix: string;
}

/** Bảng theo bậc độ khó và danh sách kỹ năng con yếu (kèm link luyện) của Test trình độ. */
export function PlacementDetails({
  placement,
  program,
  practiceTypeCodes,
  passRatio,
  idPrefix,
}: PlacementDetailsProps) {
  const available = useMemo(
    () => (practiceTypeCodes ? new Set(practiceTypeCodes) : undefined),
    [practiceTypeCodes],
  );
  const markPercent =
    passRatio !== undefined && passRatio > 0 && passRatio <= 1
      ? Math.round(passRatio * 100)
      : undefined;

  return (
    <>
      <section aria-labelledby={`${idPrefix}-bands`}>
        <h2 id={`${idPrefix}-bands`} className="text-lg font-bold">
          {t.placement.result.bandsHeading}
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{t.placement.result.bandsHint}</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t.placement.result.bandsHeading}</caption>
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t.placement.result.bandColumns.band}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t.placement.result.bandColumns.correct}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t.placement.result.bandColumns.ratio}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t.placement.result.bandColumns.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {placement.bands.map((band) => (
                <BandRow key={band.difficulty} band={band} markPercent={markPercent} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-weak`}>
        <h2 id={`${idPrefix}-weak`} className="text-lg font-bold">
          {t.placement.result.weakHeading}
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{t.placement.result.weakHint}</p>
        {placement.weak_subskills.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
            {t.placement.result.weakEmpty}
          </p>
        ) : (
          <ul aria-label={t.placement.result.weakHeading} className="grid gap-3">
            {placement.weak_subskills.map((row) => (
              <WeakRow
                key={row.code}
                row={row}
                href={practiceHrefForGroup(program, row.type_codes, available)}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
        {t.placement.result.roadmapNote}
      </p>
    </>
  );
}

function WeakRow({ row, href }: { row: BreakdownRow; href: string | null }) {
  const percent = ratePercent(row.correct, row.total);
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-semibold">{renderInline(row.name_vi, { tagKorean: true })}</p>
        <p className="text-sm tabular-nums">
          {t.examResult.ratio(row.correct, row.total, percent)}
        </p>
      </div>
      <div className="mt-2 text-sm">
        {href ? (
          <Link
            href={href}
            aria-label={t.examResult.practiceTypeLabel(row.name_vi)}
            className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t.examResult.practiceType}
          </Link>
        ) : (
          <span className="text-muted-foreground">{t.examResult.noPractice}</span>
        )}
      </div>
    </li>
  );
}
