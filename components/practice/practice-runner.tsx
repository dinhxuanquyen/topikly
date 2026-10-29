"use client";

import { useCallback, useEffect, useId, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  CircleX,
  Flag,
  Pause,
  RotateCcw,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { CHOICE_LABELS, type ChoiceLabel, type PublicQuestion } from "@/lib/practice/types";
import { checkAnswer, CheckError } from "./check-api";
import { ChoiceList, choiceInputId } from "./choice-list";
import { loadProgressForType, recordAnswer, setMarked } from "./guest-store";
import {
  formatClock,
  navStatus,
  questionState,
  runnerReducer,
  type NavStatus,
  type RunnerState,
} from "./practice-state";
import { QuestionMaterial } from "./question-material";
import { renderInline } from "./rich-text";
import { ResultPanel, verdictAnnouncement, verdictOf } from "./result-panel";
import { SessionSummary, type SessionSummaryData } from "./session-summary";

interface PracticeRunnerProps {
  /** Slug chương trình (= mã chương trình), ví dụ "topik-ii". */
  program: string;
  questions: readonly PublicQuestion[];
  /** Trang danh sách dạng (nút "Chọn dạng khác" ở màn tổng kết). */
  exitHref?: string;
}

/** Chuyển focus tới phần tử và cuộn đầu phần tử lên dưới thanh header (focus mặc định có thể cuộn lệch với khối cao). */
function focusAndReveal(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: "start" });
}

const NAV_STATUS_LABEL: Record<NavStatus, string> = {
  todo: "",
  done: t.runner.statusDone,
  correct: t.runner.statusCorrect,
  wrong: t.runner.statusWrong,
};

const NAV_STATUS_CLASS: Record<NavStatus, string> = {
  todo: "border-border bg-background",
  done: "border-primary bg-brand-soft",
  correct:
    "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-50",
  wrong: "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/50 dark:text-red-50",
};

/** Trình làm bài luyện tập từng dạng: một câu mỗi lần, chấm ở server, lưu tiến độ khách. */
export function PracticeRunner({ program, questions, exitHref }: PracticeRunnerProps) {
  const [index, setIndex] = useState(0);
  const [state, dispatch] = useReducer(runnerReducer, {} as RunnerState);
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [showSummary, setShowSummary] = useState(false);
  const summaryRef = useRef<HTMLHeadingElement>(null);

  const groupId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const confirmNoRef = useRef<HTMLButtonElement>(null);
  const focusResultRef = useRef(false);
  const previousIndexRef = useRef(0);

  const question = questions[index]!;
  const current = questionState(state, question.id);
  const total = questions.length;
  const answering = current.phase === "answering";
  const locked = !answering;
  const isAnswered = (id: string) => {
    const phase = questionState(state, id).phase;
    return phase === "done" || phase === "restored" || phase === "revealing";
  };
  const answeredCount = questions.filter((q) => isAnswered(q.id)).length;

  // ---- nạp tiến độ khách (sau khi hydrate)
  useEffect(() => {
    let cancelled = false;
    const typeCode = questions[0]?.type_code;
    if (!typeCode) return;
    void loadProgressForType(program, typeCode).then((records) => {
      if (!cancelled && records.length > 0) {
        dispatch({ type: "load-progress", records, labels: CHOICE_LABELS });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [program, questions]);

  // ---- đồng hồ làm câu: chỉ chạy khi đang làm, không tạm dừng, tab đang hiện
  useEffect(() => {
    if (!answering || paused) return;
    const id = question.id;
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      if (document.hidden || delta <= 0) return;
      dispatch({ type: "tick", id, ms: Math.min(delta, 2000) });
    };
    const timer = window.setInterval(flush, 1000);
    return () => {
      window.clearInterval(timer);
      flush();
    };
  }, [answering, paused, question.id]);

  // ---- focus: sang đầu câu khi đổi câu; sang khối kết quả ngay sau khi nộp
  useEffect(() => {
    if (previousIndexRef.current === index) return;
    previousIndexRef.current = index;
    focusAndReveal(headingRef.current);
  }, [index]);

  useEffect(() => {
    if (current.phase === "done" && focusResultRef.current) {
      focusResultRef.current = false;
      focusAndReveal(resultRef.current);
    }
  }, [current.phase]);

  useEffect(() => {
    if (current.confirmEmpty) confirmNoRef.current?.focus();
  }, [current.confirmEmpty]);

  useEffect(() => {
    if (showSummary) focusAndReveal(summaryRef.current);
  }, [showSummary]);

  // ---- phím 1–4 chọn đáp án (ngoài phím mũi tên của radio)
  useEffect(() => {
    if (!answering) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        if (!(target instanceof HTMLInputElement && target.type === "radio")) return;
      }
      const position = ["1", "2", "3", "4"].indexOf(event.key);
      if (position === -1 || position >= question.choices.length) return;
      event.preventDefault();
      dispatch({ type: "select", id: question.id, label: question.choices[position]!.label });
      document.getElementById(choiceInputId(groupId, position))?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answering, question, groupId]);

  const select = useCallback(
    (label: ChoiceLabel) => dispatch({ type: "select", id: question.id, label }),
    [question.id],
  );

  const meta = {
    program,
    questionId: question.id,
    type_code: question.type_code,
    skill: question.skill,
  };

  async function runSubmit() {
    const id = question.id;
    const selectedLabel = current.selected;
    const timeSpentMs = Math.round(current.spentMs);
    focusResultRef.current = true;
    dispatch({ type: "submit-start", id });
    try {
      const result = await checkAnswer({
        program,
        questionId: id,
        selectedLabel,
        timeSpentMs,
      });
      dispatch({ type: "submit-ok", id, result });
      setAnnouncement(verdictAnnouncement(result));
      const saved = await recordAnswer({
        ...meta,
        selectedLabel: result.selectedLabel,
        correct: result.correct,
        timeSpentMs,
        answeredAt: Date.now(),
      });
      setSaveStatus(saved ? "saved" : "failed");
    } catch (error) {
      focusResultRef.current = false;
      dispatch({
        type: "submit-fail",
        id,
        message: error instanceof CheckError ? error.message : t.runner.errors.server,
      });
    }
  }

  async function runReveal() {
    const id = question.id;
    focusResultRef.current = true;
    dispatch({ type: "reveal-start", id });
    try {
      // Chỉ lấy lại lời giải: KHÔNG ghi thêm lượt trả lời vào lịch sử.
      const result = await checkAnswer({
        program,
        questionId: id,
        selectedLabel: current.selected,
      });
      dispatch({ type: "reveal-ok", id, result });
      setAnnouncement(verdictAnnouncement(result));
    } catch (error) {
      focusResultRef.current = false;
      dispatch({
        type: "reveal-fail",
        id,
        message: error instanceof CheckError ? error.message : t.runner.errors.server,
      });
    }
  }

  function onSubmitClick() {
    if (current.selected === null) {
      dispatch({ type: "ask-confirm-empty", id: question.id });
      return;
    }
    void runSubmit();
  }

  function toggleMark() {
    const next = !current.marked;
    dispatch({ type: "toggle-mark", id: question.id });
    void setMarked(meta, next);
  }

  function goTo(next: number) {
    if (next < 0 || next >= total || next === index) return;
    setPaused(false);
    setAnnouncement("");
    setSaveStatus("idle");
    setIndex(next);
  }

  function retry() {
    setPaused(false);
    setAnnouncement("");
    setSaveStatus("idle");
    dispatch({ type: "retry", id: question.id });
  }

  /** "Tiếp tục": sang câu kế chưa làm; làm hết rồi thì mở màn tổng kết. */
  function onContinue() {
    const after = questions.findIndex((q, i) => i > index && !isAnswered(q.id));
    const before = questions.findIndex((q) => !isAnswered(q.id));
    const target = after !== -1 ? after : before;
    if (target === -1) setShowSummary(true);
    else goTo(target);
  }

  function summaryData(): SessionSummaryData {
    let correct = 0;
    let spentMs = 0;
    const traps = new Set<string>();
    for (const q of questions) {
      const qs = questionState(state, q.id);
      spentMs += qs.spentMs;
      const ok = qs.result ? qs.result.correct : qs.restoredCorrect === true;
      if (ok) correct += 1;
      const chosen = qs.result?.choices.find((c) => c.label === qs.result?.selectedLabel);
      if (qs.result && !qs.result.correct && chosen?.trap_name_vi) traps.add(chosen.trap_name_vi);
    }
    return { correct, total, spentMs, traps: [...traps] };
  }

  function reviewWrong() {
    const wrongIndex = questions.findIndex((q) => {
      const qs = questionState(state, q.id);
      return qs.result ? !qs.result.correct : qs.restoredCorrect === false;
    });
    setShowSummary(false);
    if (wrongIndex === -1) return;
    dispatch({ type: "retry", id: questions[wrongIndex]!.id });
    if (wrongIndex === index) {
      focusAndReveal(headingRef.current);
    } else {
      goTo(wrongIndex);
    }
  }

  const retryable = current.phase === "done" || current.phase === "restored";
  const lastOpen = questions.every((q) => q.id === question.id || isAnswered(q.id));
  const headingId = `${groupId}-heading`;

  return (
    <div role="region" aria-label={t.runner.regionLabel} className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={t.runner.progressLabel}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredCount}
          className="h-3.5 flex-1 overflow-hidden rounded-full bg-line"
        >
          <span
            className="block h-full origin-left rounded-full bg-mint-500 transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${Math.max(answeredCount / total, 0.03)})` }}
          />
        </div>
        <span aria-hidden className="text-sm font-extrabold text-ink-600 tabular-nums">
          {t.runner.progressCount(answeredCount, total)}
        </span>
      </div>

      {showSummary ? (
        <SessionSummary
          ref={summaryRef}
          data={summaryData()}
          exitHref={exitHref}
          onReviewWrong={reviewWrong}
        />
      ) : (
        <>
          {total > 1 ? (
            <nav aria-label={t.runner.questionNav}>
              <ol className="flex flex-wrap gap-2">
                {questions.map((q, i) => {
                  const qs = questionState(state, q.id);
                  const status = navStatus(qs);
                  const statusText = [
                    NAV_STATUS_LABEL[status],
                    qs.marked ? t.runner.statusMarked : "",
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={i === index ? "step" : undefined}
                        aria-label={t.runner.gotoQuestion(i + 1, statusText)}
                        className={cn(
                          "relative grid size-11 place-items-center rounded-lg border-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                          NAV_STATUS_CLASS[status],
                          i === index && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        {i + 1}
                        {qs.marked ? (
                          <Flag
                            aria-hidden
                            className="absolute -top-1.5 -right-1.5 size-4 fill-amber-400 text-amber-700"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="scroll-mt-[calc(var(--header-height)+0.75rem)] rounded-md text-lg font-extrabold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t.runner.questionOf(index + 1, total)}
              <span className="ml-2 text-sm font-medium text-muted-foreground max-md:sr-only">
                {question.type_code}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <div
                role="timer"
                aria-live="off"
                className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-bold text-ink-600 tabular-nums"
              >
                <Timer aria-hidden className="size-4 text-muted-foreground" />
                <span className="sr-only">{t.runner.timerLabel}: </span>
                <span>{formatClock(current.spentMs)}</span>
              </div>
              {answering ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3"
                  aria-pressed={paused}
                  onClick={() => setPaused((p) => !p)}
                >
                  <Pause aria-hidden />
                  <span className="sr-only sm:not-sr-only">{t.runner.pause}</span>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-11 px-3",
                  current.marked &&
                    "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
                )}
                aria-pressed={current.marked}
                title={t.runner.markHelp}
                onClick={toggleMark}
              >
                <Flag aria-hidden className={current.marked ? "fill-amber-400" : undefined} />
                {t.runner.mark}
              </Button>
            </div>
          </div>

          <p lang="ko" className="text-lg leading-relaxed font-semibold md:text-xl">
            {renderInline(question.stem)}
          </p>

          <QuestionMaterial question={question} transcriptVi={current.result?.transcript_vi} />

          <div className="space-y-2">
            <ChoiceList
              choices={question.choices}
              group={groupId}
              selected={current.selected}
              locked={locked}
              result={current.result}
              restoredCorrect={current.phase === "restored" ? current.restoredCorrect : null}
              onSelect={select}
            />
            {answering ? (
              <p className="text-xs text-muted-foreground">{t.runner.choiceHint}</p>
            ) : null}
          </div>

          {current.error ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-50"
            >
              <span>{current.error}</span>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                onClick={() => void (current.phase === "restored" ? runReveal() : runSubmit())}
              >
                <RotateCcw aria-hidden />
                {t.runner.errors.retry}
              </Button>
            </div>
          ) : null}

          {current.confirmEmpty ? (
            <div
              role="alert"
              className="space-y-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
            >
              <p>
                <strong>{t.runner.emptyConfirmTitle}</strong> {t.runner.emptyConfirmBody}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  ref={confirmNoRef}
                  type="button"
                  variant="outline"
                  className="h-11 px-4"
                  onClick={() => dispatch({ type: "cancel-confirm-empty", id: question.id })}
                >
                  {t.runner.emptyConfirmNo}
                </Button>
                <Button type="button" className="h-11 px-4" onClick={() => void runSubmit()}>
                  {t.runner.emptyConfirmYes}
                </Button>
              </div>
            </div>
          ) : null}

          {current.phase === "restored" || current.phase === "revealing" ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <p>
                {current.restoredCorrect === true
                  ? t.runner.restored.correct
                  : current.restoredCorrect === false
                    ? t.runner.restored.wrong
                    : t.runner.restored.blank}
                {current.selected ? ` ${t.runner.restored.yourChoice(current.selected)}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="h-11 px-4"
                  disabled={current.phase === "revealing"}
                  onClick={() => void runReveal()}
                >
                  {current.phase === "revealing"
                    ? t.runner.loadingExplanation
                    : t.runner.showExplanation}
                </Button>
              </div>
            </div>
          ) : null}

          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>

          {current.result ? (
            <div className="space-y-2">
              <ResultPanel ref={resultRef} result={current.result} />
              {saveStatus !== "idle" ? (
                <p className="text-xs text-muted-foreground">
                  {saveStatus === "saved" ? t.runner.guestSaved : t.runner.guestUnsaved}
                </p>
              ) : null}
            </div>
          ) : null}

          {total > 1 ? (
            <div className="flex items-center justify-between gap-2 pt-2 max-md:hidden">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
              >
                <ChevronLeft aria-hidden />
                {t.runner.prev}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                disabled={index === total - 1}
                onClick={() => goTo(index + 1)}
              >
                {t.runner.next}
                <ChevronRight aria-hidden />
              </Button>
            </div>
          ) : null}

          {/* Thanh hành động dính đáy màn hình (Figma: nút "Kiểm tra" và tấm phản hồi ở đáy). */}
          <div
            className={cn(
              "sticky bottom-0 z-30 -mx-4 space-y-3 border-t-2 border-line bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:-mx-6 md:px-6",
              current.result &&
                verdictOf(current.result) === "correct" &&
                "border-mint-500 bg-mint-100",
              current.result &&
                verdictOf(current.result) === "wrong" &&
                "border-coral-500 bg-coral-100",
              current.result &&
                verdictOf(current.result) === "blank" &&
                "border-sun-400 bg-sun-100",
            )}
          >
            {current.result ? (
              <p className="anim-slide-up flex items-center gap-2 text-lg font-extrabold">
                {verdictOf(current.result) === "correct" ? (
                  <CircleCheck aria-hidden className="anim-pop size-7 text-mint-700" />
                ) : verdictOf(current.result) === "wrong" ? (
                  <CircleX aria-hidden className="size-7 text-coral-700" />
                ) : (
                  <CircleMinus aria-hidden className="size-7 text-sun-600" />
                )}
                <span>
                  {verdictOf(current.result) === "correct"
                    ? t.result.correct
                    : verdictOf(current.result) === "wrong"
                      ? t.result.wrong
                      : t.result.blank}
                  {verdictOf(current.result) !== "correct" ? (
                    <span className="ml-2 text-base font-semibold">
                      {t.result.correctAnswerIs(current.result.correctLabel)}
                    </span>
                  ) : null}
                </span>
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              {answering || current.phase === "submitting" ? (
                <Button
                  type="button"
                  className="h-12 flex-1 px-6 text-base md:max-w-60"
                  disabled={current.phase === "submitting"}
                  onClick={onSubmitClick}
                >
                  {current.phase === "submitting" ? t.runner.submitting : t.runner.submit}
                </Button>
              ) : null}
              {retryable ? (
                <>
                  <Button
                    type="button"
                    className={cn(
                      "h-12 flex-1 px-6 text-base md:max-w-60",
                      current.result &&
                        verdictOf(current.result) === "correct" &&
                        "border-mint-700 bg-mint-500 hover:bg-mint-700",
                    )}
                    onClick={onContinue}
                  >
                    {lastOpen ? t.runner.showSummary : t.runner.continue}
                    <ArrowRight aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-4 text-base"
                    onClick={retry}
                  >
                    <RotateCcw aria-hidden />
                    {t.runner.retry}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
