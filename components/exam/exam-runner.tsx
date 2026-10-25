"use client";

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { AlarmClock, ChevronLeft, ChevronRight, LayoutGrid, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { ExamResult, PublicExam } from "@/lib/exam/types";
import type { ChoiceLabel } from "@/lib/practice/types";
import { choiceInputId } from "@/components/practice/choice-list";
import { formatClock } from "@/components/practice/practice-state";
import { submitExam, ExamSubmitError } from "./exam-api";
import { choiceGroupId, ExamBlockView, questionHeadingId } from "./exam-block";
import { ExamIntro } from "./exam-intro";
import { ExamNav } from "./exam-nav";
import { ExamResultView } from "./exam-result-view";
import {
  buildDraft,
  buildSubmitRequest,
  clampBlockIndex,
  countAnswered,
  countMarked,
  EMPTY_SESSION,
  listBlocks,
  listQuestions,
  remainingMs,
  sessionFromDraft,
  sessionReducer,
  timeWarning,
  type ExamSession,
  type FlatQuestion,
} from "./exam-state";
import { clearDraft, loadDraft, loadLatestResult, saveDraft, saveResult } from "./exam-store";
import { SubmitDialog } from "./submit-dialog";

type Phase = "loading" | "intro" | "running" | "result";

interface SubmitState {
  status: "idle" | "submitting" | "error";
  error: string | null;
  /** Lần nộp này là do hết giờ (giữ nguyên khi bấm "Thử lại"). */
  timedOut: boolean;
}

const IDLE: SubmitState = { status: "idle", error: null, timedOut: false };

interface ExamRunnerProps {
  exam: PublicExam;
  /** Các type_code đang có câu luyện (để chỉ gắn link "Luyện dạng này" khi trang đích tồn tại). */
  practiceTypeCodes?: readonly string[];
  /** Liên kết về danh sách đề cùng loại (Test trình độ: về trang Lộ trình). */
  listHref: string;
  /** Test trình độ: tỉ lệ đúng tối thiểu để vững một bậc (cấu hình chương trình), dùng để giải thích quy tắc. */
  passRatio?: number;
}

/** Chuyển focus tới phần tử và cuộn đầu phần tử lên dưới thanh dính. */
function focusAndReveal(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: "start" });
}

/**
 * Trình làm đề: giới thiệu -> làm bài có đồng hồ -> nộp -> kết quả.
 *
 * - Đồng hồ tính từ `startedAt` (lưu IndexedDB) nên tải lại trang vẫn đúng giờ; hết giờ tự nộp
 *   với `timedOut: true`. Đề nhiều phần hiện dùng một đồng hồ chung theo tổng `duration_sec`.
 * - Không gọi API chấm từng câu và không có đáp án ở client: chỉ POST /api/exam/submit một lần.
 * - Lỗi nộp bài (mạng/server) giữ nguyên bài làm và cho thử lại.
 */
export function ExamRunner({ exam, practiceTypeCodes, listHref, passRatio }: ExamRunnerProps) {
  const blocks = useMemo(() => listBlocks(exam), [exam]);
  const questions = useMemo(() => listQuestions(exam), [exam]);
  const sectionLabels = useMemo(
    () => exam.sections.map((s) => t.examRun.sectionPrefix(t.examCard.skillNames[s.skill])),
    [exam],
  );
  const multiSection = exam.sections.length > 1;

  const [phase, setPhase] = useState<Phase>("loading");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [session, dispatch] = useReducer(sessionReducer, EMPTY_SESSION);
  const [blockIndex, setBlockIndex] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [resultSaved, setResultSaved] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [submit, setSubmit] = useState<SubmitState>(IDLE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState<boolean | null>(null);
  const [resumed, setResumed] = useState(false);

  const idPrefix = useId();
  const navPanelId = `${idPrefix}-nav`;
  const blockHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const focusTargetRef = useRef<string | null>(null);
  const previousBlockRef = useRef(0);
  const submittingRef = useRef(false);
  const expiredRef = useRef(false);
  const latest = useRef({ session, startedAt });

  useEffect(() => {
    latest.current = { session, startedAt };
  });

  // ---- nộp bài (thủ công hoặc do hết giờ)
  const runSubmit = useCallback(
    async (timedOut: boolean, override?: { session: ExamSession; startedAt: number }) => {
      if (submittingRef.current) return;
      const snapshot = override ?? latest.current;
      if (snapshot.startedAt === null) return;
      submittingRef.current = true;
      setConfirmOpen(false);
      setSubmit({ status: "submitting", error: null, timedOut });
      try {
        const request = buildSubmitRequest(
          exam,
          snapshot.session,
          snapshot.startedAt,
          Date.now(),
          timedOut,
        );
        const response = await submitExam(request);
        setResult(response);
        setLastResult(response);
        setSubmit(IDLE);
        setPhase("result");
        const [saved] = await Promise.all([
          saveResult(response),
          clearDraft(exam.program, exam.kind, exam.id),
        ]);
        setResultSaved(saved);
      } catch (error) {
        setSubmit({
          status: "error",
          error: error instanceof ExamSubmitError ? error.message : t.examRun.errors.server,
          timedOut,
        });
      } finally {
        submittingRef.current = false;
      }
    },
    [exam],
  );

  // ---- nạp bài làm dở và kết quả gần nhất (sau khi hydrate)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [draft, lastSaved] = await Promise.all([
        loadDraft(exam.program, exam.kind, exam.id),
        loadLatestResult(exam.program, exam.kind, exam.id),
      ]);
      if (cancelled) return;
      setLastResult(lastSaved);
      if (!draft) {
        setPhase("intro");
        return;
      }
      const restored = sessionFromDraft(exam, draft);
      const current = Date.now();
      dispatch({ type: "restore", session: restored });
      setBlockIndex(clampBlockIndex(exam, draft.blockIndex));
      setStartedAt(draft.startedAt);
      setNow(current);
      setResumed(true);
      setPhase("running");
      if (remainingMs(draft.startedAt, exam.duration_sec, current) === 0) {
        expiredRef.current = true;
        void runSubmit(true, { session: restored, startedAt: draft.startedAt });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam, runSubmit]);

  // ---- đồng hồ: mỗi giây đọc lại Date.now() (không cộng dồn nên không lệch khi tab bị ngủ)
  useEffect(() => {
    if (phase !== "running" || startedAt === null) return;
    const deadline = startedAt + exam.duration_sec * 1000;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !expiredRef.current) {
        expiredRef.current = true;
        void runSubmit(true);
      }
    };
    const id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase, startedAt, exam.duration_sec, runSubmit]);

  // ---- tự lưu bài làm dở mỗi khi đáp án / đánh dấu / khối đang xem đổi
  useEffect(() => {
    if (phase !== "running" || startedAt === null) return;
    let cancelled = false;
    void saveDraft(buildDraft(exam, session, startedAt, blockIndex, Date.now())).then((ok) => {
      if (!cancelled) setDraftSaved(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, startedAt, session, blockIndex, exam]);

  // ---- focus: sang đầu khối (hoặc đúng câu được chọn từ bảng số câu) khi đổi khối
  useEffect(() => {
    if (phase !== "running") return;
    if (previousBlockRef.current === blockIndex && !focusTargetRef.current) return;
    previousBlockRef.current = blockIndex;
    const targetId = focusTargetRef.current;
    focusTargetRef.current = null;
    focusAndReveal(targetId ? document.getElementById(targetId) : blockHeadingRef.current);
  }, [blockIndex, phase]);

  const remaining =
    startedAt === null ? exam.duration_sec * 1000 : remainingMs(startedAt, exam.duration_sec, now);
  const timeUp = phase === "running" && startedAt !== null && remaining === 0;
  const warning = phase === "running" ? timeWarning(remaining, exam.duration_sec) : "none";
  const submitting = submit.status === "submitting";
  const locked = submitting || timeUp;

  const answered = countAnswered(questions, session);
  const marked = countMarked(questions, session);
  const currentBlock = blocks[blockIndex];

  // ---- phím 1–4 chọn đáp án của câu đang xem (ngoài phím mũi tên của radio)
  useEffect(() => {
    if (phase !== "running" || locked || confirmOpen || !currentBlock) return;
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
      if (position === -1) return;
      const items = currentBlock.block.questions;
      const item = items.find((entry) => entry.question.id === activeId) ?? items[0];
      const choice = item?.question.choices[position];
      if (!item || !choice) return;
      event.preventDefault();
      dispatch({ type: "select", id: item.question.id, label: choice.label });
      document
        .getElementById(choiceInputId(choiceGroupId(idPrefix, item.question.id), position))
        ?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, locked, confirmOpen, currentBlock, activeId, idPrefix]);

  // ---- hành động
  function start() {
    const current = Date.now();
    expiredRef.current = false;
    dispatch({ type: "reset" });
    setBlockIndex(0);
    previousBlockRef.current = 0;
    setStartedAt(current);
    setNow(current);
    setResult(null);
    setResultSaved(null);
    setSubmit(IDLE);
    setActiveId(null);
    setNavOpen(false);
    setResumed(false);
    setDraftSaved(null);
    setPhase("running");
  }

  function restart() {
    setResult(null);
    setResultSaved(null);
    setStartedAt(null);
    setSubmit(IDLE);
    setPhase("intro");
  }

  function select(questionId: string, label: ChoiceLabel) {
    dispatch({ type: "select", id: questionId, label });
  }

  function goToBlock(index: number) {
    if (index < 0 || index >= blocks.length || index === blockIndex) return;
    setActiveId(null);
    setBlockIndex(index);
  }

  function gotoQuestion(question: FlatQuestion) {
    setNavOpen(false);
    const targetId = questionHeadingId(idPrefix, question.id);
    if (question.blockIndex === blockIndex) {
      focusAndReveal(document.getElementById(targetId));
      return;
    }
    focusTargetRef.current = targetId;
    setActiveId(question.id);
    setBlockIndex(question.blockIndex);
  }

  const liveMessage = submitting
    ? submit.timedOut
      ? t.examRun.timeUp
      : t.examRun.submitting
    : warning === "five"
      ? t.examRun.warn5
      : warning === "one"
        ? t.examRun.warn1
        : "";

  const timerTone =
    warning === "one" || warning === "over"
      ? "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/50 dark:text-red-50"
      : warning === "five"
        ? "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
        : "border-border bg-background";

  const isLastBlock = blockIndex === blocks.length - 1;

  return (
    <div role="region" aria-label={t.exam.regionLabel} className="space-y-5">
      {phase === "loading" || phase === "intro" ? (
        <ExamIntro
          exam={exam}
          ready={phase === "intro"}
          lastResult={lastResult}
          onStart={start}
          onViewLastResult={() => {
            if (!lastResult) return;
            setResult(lastResult);
            setResultSaved(null);
            setPhase("result");
          }}
        />
      ) : null}

      {phase === "running" && currentBlock ? (
        <>
          <div className="sticky top-[calc(var(--header-height)+env(safe-area-inset-top))] z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-3">
            <div className="flex items-center gap-2">
              <div
                role="timer"
                aria-live="off"
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-lg border-2 px-3 tabular-nums",
                  timerTone,
                )}
              >
                {warning === "five" || warning === "one" || warning === "over" ? (
                  <AlarmClock aria-hidden className="size-4" />
                ) : (
                  <Timer aria-hidden className="size-4 text-muted-foreground" />
                )}
                <span className="sr-only">{t.examRun.timerLabel}: </span>
                <span className="text-lg font-bold">{formatClock(remaining)}</span>
              </div>
              <span
                className="text-sm font-medium tabular-nums"
                aria-label={t.examRun.progressLabel(answered, questions.length)}
              >
                <span aria-hidden>{t.examRun.progress(answered, questions.length)}</span>
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3"
                  aria-expanded={navOpen}
                  aria-controls={navPanelId}
                  onClick={() => setNavOpen((open) => !open)}
                >
                  <LayoutGrid aria-hidden />
                  <span className="sr-only sm:not-sr-only">{t.examRun.navToggle}</span>
                </Button>
                <Button
                  type="button"
                  className="h-11 px-4 text-base"
                  disabled={submitting}
                  onClick={() => setConfirmOpen(true)}
                >
                  {submitting ? t.examRun.submitting : t.examRun.submit}
                </Button>
              </div>
            </div>
            {navOpen ? (
              <div id={navPanelId} className="mt-3 max-h-[45vh] overflow-y-auto pb-1">
                <ExamNav
                  questions={questions}
                  session={session}
                  currentId={activeId}
                  sectionLabels={multiSection ? sectionLabels : undefined}
                  onGoto={gotoQuestion}
                />
              </div>
            ) : null}
          </div>

          {submitting ? (
            <p
              aria-hidden
              className="rounded-xl border-2 border-primary bg-brand-soft p-3 text-sm font-semibold text-brand-soft-foreground"
            >
              {submit.timedOut ? t.examRun.timeUp : t.examRun.submitting}
            </p>
          ) : null}

          {warning === "five" || warning === "one" ? (
            <p
              aria-hidden
              className={cn(
                "rounded-xl border-2 p-3 text-sm font-semibold",
                warning === "one"
                  ? "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-50"
                  : "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
              )}
            >
              {warning === "one" ? t.examRun.warn1 : t.examRun.warn5}
            </p>
          ) : null}

          {resumed && !timeUp ? (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              {t.examRun.resumed}
            </p>
          ) : null}

          {draftSaved === false ? (
            <p className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
              {t.examRun.saveFailed}
            </p>
          ) : null}

          {submit.status === "error" ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-50"
            >
              <span>
                {submit.timedOut ? `${t.examRun.timeUpFailed} ` : ""}
                {submit.error}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                onClick={() => void runSubmit(submit.timedOut || timeUp)}
              >
                <RotateCcw aria-hidden />
                {t.examRun.errors.retry}
              </Button>
            </div>
          ) : null}

          <ExamBlockView
            key={currentBlock.index}
            blockRef={currentBlock}
            session={session}
            locked={locked}
            idPrefix={idPrefix}
            headingRef={blockHeadingRef}
            sectionLabel={multiSection ? sectionLabels[currentBlock.sectionIndex] : undefined}
            onSelect={select}
            onClear={(id) => dispatch({ type: "clear", id })}
            onToggleMark={(id) => dispatch({ type: "toggle-mark", id })}
            onQuestionFocus={setActiveId}
          />
          <p className="text-xs text-muted-foreground">{t.examRun.choiceHint}</p>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={blockIndex === 0}
              onClick={() => goToBlock(blockIndex - 1)}
            >
              <ChevronLeft aria-hidden />
              {t.examRun.prevBlock}
            </Button>
            {isLastBlock ? (
              <Button
                type="button"
                className="h-11 px-5"
                disabled={submitting}
                onClick={() => setConfirmOpen(true)}
              >
                {t.examRun.submit}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                onClick={() => goToBlock(blockIndex + 1)}
              >
                {t.examRun.nextBlock}
                <ChevronRight aria-hidden />
              </Button>
            )}
          </div>
        </>
      ) : null}

      {phase === "result" && result ? (
        <ExamResultView
          result={result}
          exam={exam}
          practiceTypeCodes={practiceTypeCodes}
          listHref={listHref}
          saved={resultSaved}
          passRatio={passRatio}
          onRetry={restart}
        />
      ) : null}

      {confirmOpen && phase === "running" && !locked ? (
        <SubmitDialog
          blank={questions.length - answered}
          marked={marked}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void runSubmit(false)}
        />
      ) : null}

      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
