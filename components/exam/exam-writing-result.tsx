"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { renderInline } from "@/components/practice/rich-text";
import { formatClock } from "@/components/practice/practice-state";
import { CharCounter } from "@/components/writing/char-counter";
import { WritingRevealView } from "@/components/writing/writing-reveal-view";
import { cn } from "@/lib/utils";
import {
  clampSelfPoints,
  projectLevelWithWriting,
  type WritingSelfPoints,
} from "@/lib/exam/writing-self-score";
import type { ExamResult, WritingReview, WritingReviewItem } from "@/lib/exam/types";
import { countChars, WRITING_RUBRIC_CRITERIA } from "@/lib/practice/writing-types";
import { numberOfWritingType, type SelfPoints } from "./exam-state";

// ------------------------------------------------------------------ khối tổng

interface SummaryProps {
  result: ExamResult;
  review: WritingReview;
  selfPoints: WritingSelfPoints;
}

/**
 * Điểm Viết tự chấm /100 và cấp ước lượng. Chưa tự chấm câu nào thì CHỈ hiện trạng thái "chưa tự
 * chấm", không hiện cấp. Luôn nói rõ đây là ước lượng do tự chấm, chưa chấm AI.
 */
export function WritingScoreSummary({ result, review, selfPoints }: SummaryProps) {
  const projection = useMemo(
    () => projectLevelWithWriting(review, selfPoints),
    [review, selfPoints],
  );
  const { writing, level } = projection;
  const unscored = writing.scored_count === 0;
  // Đề có cả Đọc/Nghe chấm tự động: cấp ước lượng gồm cả điểm các phần đó.
  const withAuto = result.level !== null;

  return (
    <div
      data-testid="writing-summary"
      className="space-y-3 rounded-2xl border-2 border-primary/30 bg-brand-soft p-4 md:p-5"
    >
      {unscored ? (
        <div>
          <p className="text-sm font-semibold text-brand-soft-foreground">
            {t.examResult.writing.scoreLabel}
          </p>
          <p className="mt-1 text-3xl font-bold">{t.examResult.writing.unscored}</p>
          <p className="mt-2 text-sm leading-relaxed">{t.examResult.writing.unscoredHint}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-brand-soft-foreground">
              {t.examResult.writing.scoreLabel}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums">
              {writing.score}
              <span className="text-xl font-semibold text-muted-foreground">
                /{writing.max_score}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-soft-foreground">
              {withAuto ? t.examResult.writing.levelLabelWithAuto : t.examResult.writing.levelLabel}
            </p>
            <p className="mt-1 text-4xl font-bold">
              {renderInline(level.label, { tagKorean: true })}
            </p>
          </div>
          <div className="space-y-1 text-sm sm:col-span-2">
            <p className="tabular-nums">
              {t.examResult.writing.scoredCount(writing.scored_count, writing.total_count)}
              {" · "}
              {t.examResult.writing.pointsLine(writing.points, writing.max_points)}
            </p>
            {withAuto ? (
              <p className="tabular-nums">
                {t.examResult.writing.totalWithAuto(
                  projection.total_score,
                  projection.total_max_score,
                )}
              </p>
            ) : null}
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
          </div>
        </div>
      )}
      <p className="text-sm font-medium">{t.examResult.writing.disclaimer}</p>
      {!withAuto && result.timeSpentMs !== undefined ? (
        <p className="text-sm text-muted-foreground">
          {t.examResult.timeSpent(formatClock(result.timeSpentMs))}
        </p>
      ) : null}
      {!withAuto && result.timedOut ? (
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {t.examResult.timedOut}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {unscored
          ? t.examResult.writing.liveUnscored
          : t.examResult.writing.liveStatus(writing.score, writing.max_score, level.label)}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ xem lại và tự chấm từng câu

interface ReviewSectionProps {
  review: WritingReview;
  selfPoints: WritingSelfPoints;
  onChange: (next: SelfPoints) => void;
  idPrefix: string;
}

/** Danh sách các câu Viết: bài đã nộp, bài mẫu để so sánh và ô tự chấm điểm. */
export function WritingReviewSection({
  review,
  selfPoints,
  onChange,
  idPrefix,
}: ReviewSectionProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  // Ý bắt buộc người học tự đánh dấu "bài mình có" (chỉ trong phiên xem này).
  const [checked, setChecked] = useState<Readonly<Record<string, readonly string[]>>>({});

  function toggleOpen(id: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleChecked(itemId: string, pointId: string) {
    setChecked((previous) => {
      const current = previous[itemId] ?? [];
      return {
        ...previous,
        [itemId]: current.includes(pointId)
          ? current.filter((id) => id !== pointId)
          : [...current, pointId],
      };
    });
  }

  function setPoints(item: WritingReviewItem, raw: string) {
    const next: SelfPoints = {};
    for (const other of review.items) {
      const value = selfPoints[other.id];
      if (other.id !== item.id && typeof value === "number" && Number.isFinite(value)) {
        next[other.id] = value;
      }
    }
    if (raw.trim() !== "") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      next[item.id] = clampSelfPoints(parsed, item.max_points);
    }
    onChange(next);
  }

  return (
    <section aria-labelledby={`${idPrefix}-writing`} className="space-y-3">
      <div>
        <h2 id={`${idPrefix}-writing`} className="text-lg font-bold">
          {t.examResult.writing.reviewHeading}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.examResult.writing.reviewIntro}</p>
      </div>
      <ol className="space-y-3">
        {review.items.map((item) => (
          <WritingReviewCard
            key={item.id}
            item={item}
            idPrefix={idPrefix}
            points={selfPoints[item.id]}
            isOpen={open.has(item.id)}
            checked={checked[item.id] ?? []}
            onToggleOpen={() => toggleOpen(item.id)}
            onToggleChecked={(pointId) => toggleChecked(item.id, pointId)}
            onPoints={(raw) => setPoints(item, raw)}
          />
        ))}
      </ol>
    </section>
  );
}

interface CardProps {
  item: WritingReviewItem;
  idPrefix: string;
  points: number | null | undefined;
  isOpen: boolean;
  checked: readonly string[];
  onToggleOpen: () => void;
  onToggleChecked: (pointId: string) => void;
  onPoints: (raw: string) => void;
}

function WritingReviewCard({
  item,
  idPrefix,
  points,
  isOpen,
  checked,
  onToggleOpen,
  onToggleChecked,
  onPoints,
}: CardProps) {
  const uid = useId();
  const number = numberOfWritingType(item.type_code, item.number);
  const panelId = `${idPrefix}-writing-${item.id}-compare`;
  const scoreId = `${uid}-score`;
  const hintId = `${uid}-hint`;
  const scored = typeof points === "number" && Number.isFinite(points);
  const isEssay = item.format === "essay";
  const text = item.answer.text ?? "";
  const blankLabels = (item.prompt.blanks ?? []).map((blank) => blank.label);
  const criteria = WRITING_RUBRIC_CRITERIA.map((c) => c.name_vi).join(", ");
  const perBlank = blankLabels.length > 0 ? Math.round(item.max_points / blankLabels.length) : 0;
  const quick = isEssay
    ? []
    : Array.from({ length: blankLabels.length + 1 }, (_, index) => index * perBlank).filter(
        (value, index, all) => value <= item.max_points && all.indexOf(value) === index,
      );

  return (
    <li
      data-testid={`writing-review-${item.id}`}
      className="space-y-4 rounded-xl border border-border bg-card p-3 md:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">
          {t.examResult.writing.itemTitle(number, item.type_code)}
        </h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            scored ? "bg-brand-soft text-brand-soft-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {scored
            ? t.examResult.writing.selfScoreChip(points, item.max_points)
            : t.examResult.writing.selfScoreNone}
        </span>
      </div>

      {isEssay ? (
        <div className="space-y-2">
          <CharCounter
            id={`${uid}-count`}
            count={item.char_count ?? countChars(text)}
            limit={item.prompt.char_limit}
            announce={false}
          />
          {!isOpen ? (
            text.trim() === "" ? (
              <p className="text-sm text-muted-foreground">{t.examResult.writing.essayEmpty}</p>
            ) : (
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t.examResult.writing.yourAnswer}
                </p>
                <p lang="ko" className="mt-1 text-base leading-8 break-words whitespace-pre-wrap">
                  {text}
                </p>
              </div>
            )
          ) : null}
        </div>
      ) : !isOpen ? (
        <dl className="space-y-2">
          {blankLabels.map((label) => {
            const value = item.answer.blanks?.[label] ?? "";
            return (
              <div key={label} className="rounded-xl border border-border bg-background p-3">
                <dt className="text-xs font-semibold text-muted-foreground">
                  {t.examResult.writing.blankAnswerLabel(label)}
                </dt>
                <dd lang="ko" className="mt-1 text-base break-words">
                  {value.trim() === "" ? (
                    <span lang="vi" className="text-sm text-muted-foreground">
                      {t.examResult.writing.blankEmpty}
                    </span>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      <div>
        <Button
          type="button"
          variant={isOpen ? "outline" : "default"}
          className="h-12 px-5 text-base"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggleOpen}
        >
          {isOpen ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {isOpen ? t.examResult.writing.hideCompare : t.examResult.writing.showCompare}
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", isOpen && "rotate-180")}
          />
        </Button>
      </div>

      {isOpen ? (
        <div id={panelId}>
          <WritingRevealView
            embedded
            regionLabel={t.examResult.writing.compareRegion(number)}
            prompt={item.prompt}
            reveal={item.reveal}
            essay={text}
            blanks={item.answer.blanks ?? {}}
            checked={checked}
            onToggleChecked={onToggleChecked}
          />
        </div>
      ) : null}

      <div className="space-y-2 rounded-xl border-2 border-primary/30 bg-brand-soft/60 p-3">
        <label htmlFor={scoreId} className="block text-sm font-semibold">
          {t.examResult.writing.selfScoreLabel}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={scoreId}
            type="number"
            inputMode="numeric"
            min={0}
            max={item.max_points}
            step={1}
            value={scored ? points : ""}
            onChange={(event) => onPoints(event.target.value)}
            aria-describedby={hintId}
            className="h-12 w-24 rounded-xl border-2 border-input bg-background px-3 text-center text-lg font-semibold tabular-nums outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-sm font-medium tabular-nums">
            {t.examResult.writing.selfScoreMax(item.max_points)}
          </span>
        </div>
        {quick.length > 0 ? (
          <div
            role="group"
            aria-label={t.examResult.writing.quickLabel}
            className="flex flex-wrap gap-2"
          >
            {quick.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scored && points === value}
                onClick={() => onPoints(String(value))}
                className={cn(
                  "min-h-11 rounded-lg border-2 px-4 text-sm font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  scored && points === value
                    ? "border-primary bg-background text-brand-soft-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {t.examResult.writing.quickValue(value)}
              </button>
            ))}
          </div>
        ) : null}
        <p id={hintId} className="text-sm leading-relaxed text-muted-foreground">
          {isEssay
            ? t.examResult.writing.hintEssay(item.max_points, criteria)
            : t.examResult.writing.hintBlanks(perBlank, blankLabels.length)}
        </p>
      </div>
    </li>
  );
}
