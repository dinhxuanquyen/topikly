"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, CircleCheck, CircleMinus, CircleX, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type {
  BreakdownRow,
  ExamResult,
  PublicExam,
  PublicExamQuestion,
  QuestionResult,
} from "@/lib/exam/types";
import { ChoiceList } from "@/components/practice/choice-list";
import { formatClock } from "@/components/practice/practice-state";
import { QuestionMaterial } from "@/components/practice/question-material";
import { RichLines, renderInline } from "@/components/practice/rich-text";
import { verdictOf, type Verdict } from "@/components/practice/result-panel";
import { listBlocks, practiceHrefForGroup, ratePercent } from "./exam-state";
import { PlacementDetails, PlacementSummary } from "./placement-result";

interface ExamResultViewProps {
  result: ExamResult;
  /** Đề công khai: lấy nội dung câu/phương án để xem lại cùng đáp án. */
  exam: PublicExam;
  /** Các type_code đang có câu luyện; undefined = coi như mọi dạng đều có. */
  practiceTypeCodes?: readonly string[];
  /** Liên kết về danh sách đề cùng loại. */
  listHref: string;
  /** true/false = đã/không lưu được kết quả vào chế độ khách; null = không nói gì. */
  saved: boolean | null;
  /** Test trình độ: tỉ lệ đúng tối thiểu để vững một bậc (cấu hình chương trình), để giải thích quy tắc. */
  passRatio?: number;
  onRetry: () => void;
}

type Filter = "all" | "wrong" | "blank";

/** Tỉ lệ đúng -> màu thanh; luôn đi kèm chữ phần trăm nên không chỉ dựa vào màu. */
function barTone(percent: number): string {
  if (percent >= 70) return "bg-emerald-600";
  if (percent >= 40) return "bg-amber-500";
  return "bg-red-600";
}

function RateBar({ percent }: { percent: number }) {
  return (
    <div aria-hidden className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        data-testid="rate-bar"
        className={cn("h-full rounded-full", barTone(percent))}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const VERDICT_ICON = { correct: CircleCheck, wrong: CircleX, blank: CircleMinus } as const;
const VERDICT_TONE: Record<Verdict, string> = {
  correct: "text-emerald-800 dark:text-emerald-300",
  wrong: "text-red-800 dark:text-red-300",
  blank: "text-amber-800 dark:text-amber-300",
};

/** Kết quả sau khi nộp: điểm, cấp ước lượng, phần/nhóm dạng/kỹ năng con và xem lại từng câu. */
export function ExamResultView({
  result,
  exam,
  practiceTypeCodes,
  listHref,
  saved,
  passRatio,
  onRetry,
}: ExamResultViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const idPrefix = useId();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ block: "start" });
  }, []);

  const available = useMemo(
    () => (practiceTypeCodes ? new Set(practiceTypeCodes) : undefined),
    [practiceTypeCodes],
  );
  const itemsById = useMemo(() => {
    const map = new Map<string, { item: PublicExamQuestion; shared: boolean }>();
    for (const ref of listBlocks(exam)) {
      for (const item of ref.block.questions) {
        map.set(item.question.id, { item, shared: ref.block.shared_material });
      }
    }
    return map;
  }, [exam]);

  const wrongCount = result.questions.filter((q) => verdictOf(q) === "wrong").length;
  const blankCount = result.questions.filter((q) => verdictOf(q) === "blank").length;
  const visible = result.questions.filter((q) => {
    const verdict = verdictOf(q);
    return filter === "all" || verdict === filter;
  });

  const { level, placement } = result;
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t.examResult.filterAll, count: result.questions.length },
    { key: "wrong", label: t.examResult.filterWrong, count: wrongCount },
    { key: "blank", label: t.examResult.filterBlank, count: blankCount },
  ];

  function toggle(id: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby={`${idPrefix}-summary`} className="space-y-4">
        <h2
          id={`${idPrefix}-summary`}
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-[calc(var(--header-height)+0.75rem)] rounded-md text-xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {placement ? t.placement.result.heading : t.examResult.heading}
        </h2>
        {placement ? <PlacementSummary placement={placement} passRatio={passRatio} /> : null}
        {!placement ? (
          <div className="grid gap-3 rounded-2xl border-2 border-primary/30 bg-brand-soft p-4 sm:grid-cols-2 md:p-5">
            <div>
              <p className="text-sm font-semibold text-brand-soft-foreground">
                {t.examResult.scoreLabel}
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums">
                {result.total_score}
                <span className="text-xl font-semibold text-muted-foreground">
                  /{result.total_max_score}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-soft-foreground">
                {t.examResult.levelLabel}
                {level.is_estimate ? ` (${t.examResult.estimate})` : ""}
              </p>
              <p className="mt-1 text-4xl font-bold">
                {renderInline(level.label, { tagKorean: true })}
              </p>
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <p>
                {level.is_estimate
                  ? t.examResult.estimateNote(level.compared_score, level.total_max_score)
                  : t.examResult.notEstimate(level.compared_score, level.total_max_score)}
              </p>
              {level.next_level ? (
                <p className="font-semibold">
                  {renderInline(
                    t.examResult.nextLevel(
                      level.next_level.points_needed,
                      level.total_max_score,
                      level.next_level.label,
                    ),
                    { tagKorean: true },
                  )}
                </p>
              ) : level.next_level === null ? (
                <p className="font-semibold">{t.examResult.topLevel}</p>
              ) : null}
              {result.timeSpentMs !== undefined ? (
                <p className="text-muted-foreground">
                  {t.examResult.timeSpent(formatClock(result.timeSpentMs))}
                </p>
              ) : null}
              {result.timedOut ? (
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {t.examResult.timedOut}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {placement && result.timeSpentMs !== undefined ? (
          <p className="text-sm text-muted-foreground">
            {t.examResult.timeSpent(formatClock(result.timeSpentMs))}
          </p>
        ) : null}
        {placement && result.timedOut ? (
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {t.examResult.timedOut}
          </p>
        ) : null}
        {saved !== null ? (
          <p className="text-xs text-muted-foreground">
            {saved ? t.examResult.saved : t.examResult.unsaved}
          </p>
        ) : null}
      </section>

      {placement ? (
        <PlacementDetails
          placement={placement}
          program={exam.program}
          practiceTypeCodes={practiceTypeCodes}
          passRatio={passRatio}
          idPrefix={idPrefix}
        />
      ) : (
        <>
          <section aria-labelledby={`${idPrefix}-sections`}>
            <h2 id={`${idPrefix}-sections`} className="mb-3 text-lg font-bold">
              {t.examResult.sectionsHeading}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{t.examResult.sectionsHeading}</caption>
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t.examResult.sectionColumns.skill}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t.examResult.sectionColumns.correct}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t.examResult.sectionColumns.blank}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      {t.examResult.sectionColumns.score}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.sections.map((section) => (
                    <tr key={section.skill} className="border-t border-border">
                      <th scope="row" className="px-3 py-2.5 font-semibold">
                        {t.examCard.skillNames[section.skill]}
                      </th>
                      <td className="px-3 py-2.5 tabular-nums">
                        {section.correct}/{section.total}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{section.unanswered}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {section.score}/{section.max_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby={`${idPrefix}-groups`}>
            <h2 id={`${idPrefix}-groups`} className="text-lg font-bold">
              {t.examResult.groupHeading}
            </h2>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t.examResult.groupHint}</p>
            <ul aria-label={t.examResult.groupHeading} className="grid gap-3">
              {result.by_type_group.map((row) => (
                <GroupRow
                  key={row.code}
                  row={row}
                  href={practiceHrefForGroup(exam.program, row.type_codes, available)}
                />
              ))}
            </ul>
          </section>

          <section aria-labelledby={`${idPrefix}-subskills`}>
            <h2 id={`${idPrefix}-subskills`} className="text-lg font-bold">
              {t.examResult.subskillHeading}
            </h2>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t.examResult.subskillHint}</p>
            <ul aria-label={t.examResult.subskillHeading} className="grid gap-3">
              {result.by_subskill.map((row) => {
                const percent = ratePercent(row.correct, row.total);
                return (
                  <li key={row.code} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-semibold">
                        {renderInline(row.name_vi, { tagKorean: true })}
                      </p>
                      <p className="text-sm tabular-nums">
                        {t.examResult.ratio(row.correct, row.total, percent)}
                      </p>
                    </div>
                    <div className="mt-2">
                      <RateBar percent={percent} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {/* Test trình độ dùng chung câu với Mini test và làm lại được, nên tạm ẩn đáp án/lời giải
          (ghi ở comment đầu content/topik-ii/exams/placement/placement-01.yaml). */}
      {placement ? (
        <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          {t.placement.result.reviewHidden}
        </p>
      ) : (
        <section aria-labelledby={`${idPrefix}-review`} className="space-y-3">
          <h2 id={`${idPrefix}-review`} className="text-lg font-bold">
            {t.examResult.reviewHeading}
          </h2>
          <div role="group" aria-label={t.examResult.filterLabel} className="flex flex-wrap gap-2">
            {filters.map(({ key, label, count }) => (
              <Button
                key={key}
                type="button"
                variant={filter === key ? "default" : "outline"}
                className="h-11 px-4"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {t.examResult.filterCount(label, count)}
              </Button>
            ))}
          </div>
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
              {t.examResult.filterEmpty}
            </p>
          ) : (
            <ol className="space-y-2.5">
              {visible.map((question) => {
                const entry = itemsById.get(question.questionId);
                return (
                  <ReviewItem
                    key={question.questionId}
                    question={question}
                    entry={entry}
                    idPrefix={idPrefix}
                    isOpen={open.has(question.questionId)}
                    onToggle={() => toggle(question.questionId)}
                  />
                );
              })}
            </ol>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <Button type="button" className="h-12 px-6 text-base" onClick={onRetry}>
          <RotateCcw aria-hidden />
          {placement ? t.placement.result.retry : t.examResult.retry}
        </Button>
        <Link
          href={listHref}
          className={cn(buttonVariants({ variant: "outline" }), "h-12 px-5 text-base")}
        >
          {placement ? t.placement.result.backToRoadmap : t.examResult.backToList}
        </Link>
      </div>
    </div>
  );
}

function GroupRow({ row, href }: { row: BreakdownRow; href: string | null }) {
  const percent = ratePercent(row.correct, row.total);
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-semibold">
          <span className="mr-2 rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand-soft-foreground">
            {t.examResult.group(row.code)}
          </span>
          {renderInline(row.name_vi, { tagKorean: true })}
        </p>
        <p className="text-sm tabular-nums">
          {t.examResult.ratio(row.correct, row.total, percent)}
        </p>
      </div>
      <div className="mt-2">
        <RateBar percent={percent} />
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

interface ReviewItemProps {
  question: QuestionResult;
  entry: { item: PublicExamQuestion; shared: boolean } | undefined;
  idPrefix: string;
  isOpen: boolean;
  onToggle: () => void;
}

function ReviewItem({ question, entry, idPrefix, isOpen, onToggle }: ReviewItemProps) {
  const verdict = verdictOf(question);
  const Icon = VERDICT_ICON[verdict];
  const panelId = `${idPrefix}-review-${question.questionId}`;
  const verdictText = t.examResult.verdict[verdict];
  const detail =
    question.selectedLabel === null
      ? t.examResult.blankAnswer
      : t.examResult.yourAnswer(question.selectedLabel);

  return (
    <li className="rounded-xl border border-border bg-card" data-verdict={verdict}>
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <Icon aria-hidden className={cn("size-6 shrink-0", VERDICT_TONE[verdict])} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {t.examResult.reviewItem(question.number, question.type_code)}
              <span className={cn("ml-2 text-sm", VERDICT_TONE[verdict])}>{verdictText}</span>
            </span>
            <span className="block text-sm text-muted-foreground">
              {detail} · {t.examResult.correctIs(question.correctLabel)}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-5 shrink-0 transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </h3>
      {isOpen ? (
        <div id={panelId} className="space-y-4 border-t border-border p-3 md:p-4">
          {entry ? (
            <>
              {entry.shared ? (
                <p lang="ko" className="text-base leading-relaxed font-semibold">
                  {renderInline(entry.item.question.stem)}
                </p>
              ) : null}
              <QuestionMaterial
                question={entry.item.question}
                noAudioNote="review"
                inlineTranslation
                transcriptVi={question.transcript_vi}
              />
              <ChoiceList
                choices={entry.item.question.choices}
                group={panelId}
                groupLabel={t.examRun.choicesLabel(question.number)}
                selected={question.selectedLabel}
                locked
                result={question}
                restoredCorrect={null}
                onSelect={() => undefined}
              />
            </>
          ) : null}
          <div className="rounded-xl border border-border bg-background p-4">
            <h4 className="text-base font-semibold">{t.examResult.explanation}</h4>
            <RichLines
              text={question.explanation_vi}
              tagKorean
              className="mt-2 space-y-2.5"
              lineClassName="leading-relaxed"
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
