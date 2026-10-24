"use client";

import { forwardRef, useId, useState } from "react";
import { t } from "@/components/i18n";
import { RichMarkdown } from "@/components/practice/rich-markdown";
import { renderInline } from "@/components/practice/rich-text";
import { cn } from "@/lib/utils";
import {
  countChars,
  WRITING_REGISTER_NAME_VI,
  WRITING_RUBRIC_CRITERIA,
  type WritingBlankReveal,
  type WritingModelAnswer,
  type WritingPrompt,
  type WritingReveal,
} from "@/lib/practice/writing-types";
import { matchBlank, type BlankMatch } from "./writing-utils";

interface RevealViewProps {
  prompt: WritingPrompt;
  reveal: WritingReveal;
  essay: string;
  blanks: Record<string, string>;
  checked: readonly string[];
  onToggleChecked: (pointId: string) => void;
}

/** Khối chung của mỗi mục: tiêu đề + nội dung. */
function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <h3 id={id} className="text-base font-semibold">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

// ------------------------------------------------------------------ W53–W54

function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div lang="ko" className={cn("space-y-1.5 text-base leading-8", className)}>
      {text
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .map((line, index) => (
          <p key={index} className="indent-[1em]">
            {line}
          </p>
        ))}
    </div>
  );
}

function EssayCompare({
  essay,
  models,
  selected,
  onSelect,
}: {
  essay: string;
  models: readonly WritingModelAnswer[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const model = models[selected] ?? models[0]!;
  const mine = countChars(essay);
  const uid = useId();
  const mineId = `${uid}-mine`;
  const modelId = `${uid}-model`;
  return (
    <div className="space-y-3">
      {models.length > 1 ? (
        <div
          role="group"
          aria-label={t.writing.reveal.levelPicker}
          className="flex flex-wrap gap-2"
        >
          {models.map((m, index) => (
            <button
              key={m.level}
              type="button"
              aria-pressed={index === selected}
              onClick={() => onSelect(index)}
              className={cn(
                "min-h-11 rounded-lg border-2 px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                index === selected
                  ? "border-primary bg-brand-soft text-brand-soft-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {t.writing.reveal.levelOption(m.level)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <section
          aria-labelledby={mineId}
          className="min-w-0 rounded-xl border-2 border-primary/30 bg-card p-4"
        >
          <h3 id={mineId} className="text-base font-semibold">
            {t.writing.reveal.yourEssay}
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t.writing.counter.count(mine)}
          </p>
          {essay.trim() === "" ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.writing.reveal.yourEssayEmpty}</p>
          ) : (
            <p lang="ko" className="mt-2 text-base leading-8 break-words whitespace-pre-wrap">
              {essay}
            </p>
          )}
        </section>

        <section
          aria-labelledby={modelId}
          className="min-w-0 rounded-xl border-2 border-border bg-card p-4"
        >
          <h3 id={modelId} className="text-base font-semibold">
            {t.writing.reveal.modelEssay(model.level)}
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t.writing.reveal.modelMeta(model.char_count, model.manuscript_cells)}
          </p>
          <div className="mt-2">
            <Paragraphs text={model.text} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PointChecklist({
  prompt,
  reveal,
  model,
  checked,
  onToggle,
}: {
  prompt: WritingPrompt;
  reveal: WritingReveal;
  model: WritingModelAnswer | undefined;
  checked: readonly string[];
  onToggle: (id: string) => void;
}) {
  const points = reveal.required_points ?? [];
  if (points.length === 0) return null;
  const done = points.filter((p) => checked.includes(p.id)).length;
  return (
    <Section title={t.writing.reveal.checklistTitle}>
      <p className="text-sm text-muted-foreground">
        {prompt.type_code === "W54"
          ? t.writing.reveal.checklistHintQuestions
          : t.writing.reveal.checklistHintData}
      </p>
      <p className="mt-1 text-sm font-medium tabular-nums" aria-live="polite">
        {t.writing.reveal.checklistProgress(done, points.length)}
      </p>
      <ul className="mt-2 space-y-2">
        {points.map((point) => {
          const inputId = `point-${prompt.id}-${point.id}`;
          const covered = model?.covers.includes(point.id) ?? false;
          return (
            <li key={point.id}>
              <label
                htmlFor={inputId}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 has-[:checked]:border-primary has-[:checked]:bg-brand-soft/60 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked.includes(point.id)}
                  onChange={() => onToggle(point.id)}
                  className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
                />
                <span className="min-w-0 text-sm leading-relaxed">
                  <span lang="ko" className="block font-medium">
                    {point.ko}
                  </span>
                  <span className="block text-muted-foreground">
                    {renderInline(point.vi, { tagKorean: true })}
                  </span>
                  {covered ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t.writing.reveal.modelCovers}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function RubricNotes({ model }: { model: WritingModelAnswer }) {
  return (
    <Section title={t.writing.reveal.rubricTitle(model.level)}>
      <dl className="space-y-3">
        {WRITING_RUBRIC_CRITERIA.map((criterion) => (
          <div key={criterion.key}>
            <dt className="text-sm font-semibold">
              {criterion.name_vi}{" "}
              <span lang="ko" className="font-normal text-muted-foreground">
                {criterion.name_ko}
              </span>
            </dt>
            <dd className="mt-0.5 text-sm leading-relaxed">
              {renderInline(model.rubric_notes_vi[criterion.key], { tagKorean: true })}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

// ------------------------------------------------------------------ W51–W52

const MATCH_STYLE: Record<BlankMatch, string> = {
  empty: "border-border bg-muted/40",
  accepted:
    "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50",
  partial: "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
  rejected: "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-50",
  unknown: "border-border bg-muted/40",
};

function BlankReveal({ blank, answer }: { blank: WritingBlankReveal; answer: string }) {
  const match = matchBlank(answer, blank);
  return (
    <Section title={t.writing.reveal.blankTitle(blank.label)}>
      <div data-match={match} className={cn("rounded-lg border-2 p-3 text-sm", MATCH_STYLE[match])}>
        <p className="font-semibold">{t.writing.reveal.yourAnswer}</p>
        {match === "empty" ? (
          <p>{t.writing.reveal.yourAnswerEmpty}</p>
        ) : (
          <p lang="ko" className="text-base break-words">
            {answer}
          </p>
        )}
        {match !== "empty" ? <p className="mt-1">{t.writing.reveal.matchNote[match]}</p> : null}
      </div>

      <div className="mt-3 space-y-3 text-sm">
        <div>
          <h4 className="font-semibold">{t.writing.reveal.acceptedTitle}</h4>
          <ul lang="ko" className="mt-1 list-disc space-y-1 pl-5 text-base">
            {blank.accepted_answers.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        {blank.partial_answers.length > 0 ? (
          <div>
            <h4 className="font-semibold">{t.writing.reveal.partialTitle}</h4>
            <ul lang="ko" className="mt-1 list-disc space-y-1 pl-5 text-base">
              {blank.partial_answers.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {blank.rejected_answers.length > 0 ? (
          <div>
            <h4 className="font-semibold">{t.writing.reveal.rejectedTitle}</h4>
            <ul className="mt-1 space-y-1.5">
              {blank.rejected_answers.map((r) => (
                <li key={r.text} className="rounded-lg border border-border bg-background p-2.5">
                  <span lang="ko" className="text-base font-medium">
                    {r.text}
                  </span>
                  <span className="block text-muted-foreground">
                    {renderInline(r.reason_vi, { tagKorean: true })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {blank.required_elements_vi.length > 0 ? (
          <div>
            <h4 className="font-semibold">{t.writing.reveal.requiredElements}</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {blank.required_elements_vi.map((e) => (
                <li key={e} className="leading-relaxed">
                  {renderInline(e, { tagKorean: true })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {blank.note_vi ? (
          <p className="text-muted-foreground">
            {renderInline(blank.note_vi, { tagKorean: true })}
          </p>
        ) : null}
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ vỏ chung

/**
 * Phần "tự so sánh" sau khi người học bấm xem: bài của bạn cạnh bài mẫu, checklist ý bắt buộc,
 * nhận xét theo rubric, biểu hiện nên dùng, lỗi thường gặp, lời giải. KHÔNG chấm điểm.
 * Nhận focus (tabIndex -1) từ trình viết ngay khi dữ liệu về.
 */
export const WritingRevealView = forwardRef<HTMLElement, RevealViewProps>(
  function WritingRevealView({ prompt, reveal, essay, blanks, checked, onToggleChecked }, ref) {
    const [selected, setSelected] = useState(0);
    const models = reveal.model_answers ?? [];
    const model = models[selected] ?? models[0];

    return (
      <section
        ref={ref}
        tabIndex={-1}
        aria-label={t.writing.reveal.regionLabel}
        className="scroll-mt-[calc(var(--header-height)+0.75rem)] space-y-4 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="rounded-xl border-2 border-primary/30 bg-brand-soft p-4">
          <h2 className="text-xl font-bold text-brand-soft-foreground">
            {t.writing.reveal.heading}
          </h2>
          <p className="mt-1 text-sm">{t.writing.reveal.selfCheckNote}</p>
          {reveal.register ? (
            <p className="mt-1 text-sm">
              {t.writing.reveal.register(WRITING_REGISTER_NAME_VI[reveal.register])}
            </p>
          ) : null}
        </div>

        {prompt.format === "essay" && models.length > 0 ? (
          <>
            <EssayCompare
              essay={essay}
              models={models}
              selected={selected}
              onSelect={setSelected}
            />
            <PointChecklist
              prompt={prompt}
              reveal={reveal}
              model={model}
              checked={checked}
              onToggle={onToggleChecked}
            />
            {model ? <RubricNotes model={model} /> : null}
          </>
        ) : null}

        {prompt.format === "fill_blanks" && reveal.blanks
          ? reveal.blanks.map((blank) => (
              <BlankReveal key={blank.label} blank={blank} answer={blanks[blank.label] ?? ""} />
            ))
          : null}

        {reveal.scoring_notes_vi ? (
          <Section title={t.writing.reveal.scoringTitle}>
            <RichMarkdown text={reveal.scoring_notes_vi} className="text-sm" />
          </Section>
        ) : null}

        {reveal.outline_vi ? (
          <Section title={t.writing.reveal.outlineTitle}>
            <RichMarkdown text={reveal.outline_vi} className="text-sm" />
          </Section>
        ) : null}

        {reveal.expression_bank && reveal.expression_bank.length > 0 ? (
          <Section title={t.writing.reveal.expressionsTitle}>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {reveal.expression_bank.map((item) => (
                <div key={item.ko} className="contents">
                  <dt lang="ko" className="text-base font-medium">
                    {item.ko}
                  </dt>
                  <dd className="mb-2 text-sm text-muted-foreground sm:mb-0">
                    {renderInline(item.vi, { tagKorean: true })}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        ) : null}

        {reveal.common_mistakes_vi.length > 0 ? (
          <Section title={t.writing.reveal.mistakesTitle}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {reveal.common_mistakes_vi.map((mistake) => (
                <li key={mistake} className="leading-relaxed">
                  {renderInline(mistake, { tagKorean: true })}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {reveal.explanation_vi ? (
          <Section title={t.writing.reveal.explanationTitle}>
            <RichMarkdown text={reveal.explanation_vi} className="text-sm" />
          </Section>
        ) : null}
      </section>
    );
  },
);
