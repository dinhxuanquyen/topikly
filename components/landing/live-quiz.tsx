"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lightbulb, RotateCcw, X } from "lucide-react";
import { choiceNumber } from "@/components/practice/choice-list";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import type { LandingQuestion } from "@/lib/landing/queries";
import { cn } from "@/lib/utils";

const Q = t.landing.quiz;

/**
 * Thứ "sống" của trang chủ: khách làm thử một câu thật (R26) ngay ở màn đầu.
 * Chọn → Kiểm tra → đúng/sai kèm lời giải bằng tiếng Việt cho phương án vừa chọn
 * (hé lộ dần: lời giải chỉ đến sau khi trả lời). Không có script: thẻ vẫn hiện đủ câu hỏi
 * và bốn phương án, kèm liên kết vào luyện dạng này.
 */
export function LiveQuiz({
  program,
  question,
  onResult,
}: {
  program: string;
  question: LandingQuestion;
  onResult?: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = question.choices.find((c) => c.correct);
  const chosen = question.choices.find((c) => c.label === selected);
  const isRight = Boolean(checked && chosen?.correct);

  function check() {
    if (!selected) return;
    setChecked(true);
    onResult?.(Boolean(chosen?.correct));
  }

  function retry() {
    setChecked(false);
    setSelected(null);
  }

  return (
    <div
      data-ui
      className="rounded-3xl border-2 border-b-[6px] border-line bg-card p-5 text-card-foreground md:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-sm font-extrabold text-sky-700">
          Đọc · {question.type_name_vi}
        </span>
        <div
          role="progressbar"
          aria-label={Q.progress}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={checked ? 2 : selected ? 1 : 0}
          className="lp-progress h-3 flex-1 overflow-hidden rounded-full bg-line"
        >
          <span
            className="block h-full rounded-full bg-mint-500"
            style={{ transform: `scaleX(${checked ? 1 : selected ? 0.55 : 0.12})` }}
          />
        </div>
      </div>

      <p lang="ko" className="mt-4 text-base font-medium text-ink-600">
        {question.stem}
      </p>
      {question.passage ? (
        <p lang="ko" className="mt-3 rounded-2xl bg-surface p-4 text-lg leading-snug font-bold">
          {question.passage}
        </p>
      ) : null}

      <div role="radiogroup" aria-label={Q.label} className="mt-4 grid gap-2.5">
        {question.choices.map((choice) => {
          const isSel = selected === choice.label;
          const state = !checked
            ? isSel
              ? "selected"
              : "idle"
            : choice.correct
              ? "correct"
              : isSel
                ? "wrong"
                : "idle";
          return (
            <label
              key={choice.label}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-b-4 p-3 transition-[background-color,border-color,transform] duration-150",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                !checked && "motion-safe:active:translate-y-0.5",
                checked && "cursor-default",
                state === "idle" && "border-line bg-card hover:bg-sky-50",
                state === "selected" && "border-sky-600 bg-sky-50",
                state === "correct" && "border-mint-500 bg-mint-100",
                state === "wrong" && "lp-shake border-coral-500 bg-coral-100",
              )}
            >
              <input
                type="radio"
                name={`quiz-${question.id}`}
                value={choice.label}
                checked={isSel}
                disabled={checked}
                onChange={() => setSelected(choice.label)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg border-2 text-base font-extrabold",
                  state === "idle" && "border-ink-300 text-ink-600",
                  state === "selected" && "border-sky-600 text-sky-600",
                  state === "correct" && "lp-pop border-mint-500 bg-mint-500 text-white",
                  state === "wrong" && "border-coral-500 bg-coral-500 text-white",
                )}
              >
                {state === "correct" ? (
                  <Check className="size-4" strokeWidth={3.2} />
                ) : state === "wrong" ? (
                  <X className="size-4" strokeWidth={3.2} />
                ) : (
                  choiceNumber(choice.label)
                )}
              </span>
              <span lang="ko" className="pt-0.5 text-base leading-relaxed font-medium">
                {choice.text}
              </span>
            </label>
          );
        })}
      </div>

      <div aria-live="polite">
        {checked ? (
          <div
            className={cn(
              "lp-slide-up mt-4 rounded-2xl p-4",
              isRight ? "bg-mint-100" : "bg-coral-100",
            )}
          >
            <p
              className={cn("text-lg font-extrabold", isRight ? "text-mint-700" : "text-coral-700")}
            >
              {isRight ? Q.correct : Q.wrong}
            </p>
            <p className="mt-1 flex gap-2 text-base leading-relaxed">
              <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-sun-600" />
              <span>
                {isRight || !chosen ? (
                  Q.correctNote
                ) : (
                  <>
                    <strong>
                      {Q.why(chosen.label)}
                      {chosen.trap_name_vi ? ` (${chosen.trap_name_vi.toLowerCase()})` : ""}:
                    </strong>{" "}
                    {chosen.note_vi} {correct ? Q.correctIs(correct.label) : null}
                  </>
                )}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {checked ? (
          <>
            <Link
              href={`/${program}/luyen-tap/${question.skill_slug}/${question.type_code}`}
              className={cn(buttonVariants(), "h-12 flex-1 px-5 text-base")}
            >
              {Q.more}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <button
              type="button"
              onClick={retry}
              className={cn(buttonVariants({ variant: "outline" }), "h-12 px-4 text-base")}
            >
              <RotateCcw aria-hidden className="size-4" />
              {Q.retry}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={!selected}
            className={cn(buttonVariants(), "h-12 w-full text-base")}
          >
            {Q.check}
          </button>
        )}
      </div>
    </div>
  );
}
