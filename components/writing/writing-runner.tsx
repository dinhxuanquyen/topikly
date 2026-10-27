"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { ChartView } from "@/components/practice/chart-view";
import { ImagePending } from "@/components/practice/question-material";
import { RichLines, renderInline, splitLines } from "@/components/practice/rich-text";
import { cn } from "@/lib/utils";
import { countChars, type WritingPrompt, type WritingReveal } from "@/lib/practice/writing-types";
import { CharCounter } from "./char-counter";
import { clearDraft, loadDraft, saveDraft, type WritingDraft } from "./writing-draft";
import { fetchWritingReveal, WritingRevealError } from "./writing-api";
import { WritingRevealView } from "./writing-reveal-view";
import { splitPassageLine } from "./writing-utils";

/** Độ trễ gộp các lần gõ trước khi ghi nháp. */
export const DRAFT_SAVE_DELAY_MS = 400;

type DraftValues = Pick<WritingDraft, "essay" | "blanks" | "checked">;
const EMPTY_VALUES: DraftValues = { essay: "", blanks: {}, checked: [] };

type DraftStatus = "idle" | "restored" | "saved" | "failed";

function focusAndReveal(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: "start" });
}

// ------------------------------------------------------------------ đề bài

function PassageView({ passage }: { passage: string }) {
  return (
    <section
      aria-label={t.writing.passageLabel}
      lang="ko"
      className="rounded-xl border border-border bg-card p-4 text-base leading-9 md:p-5 md:text-lg md:leading-10"
    >
      {splitLines(passage).map((line, lineIndex) => (
        <p key={lineIndex} className="[&:not(:first-child)]:mt-1">
          {splitPassageLine(line).map((part, partIndex) =>
            part.kind === "text" ? (
              <Fragment key={partIndex}>{renderInline(part.text)}</Fragment>
            ) : (
              <span
                key={partIndex}
                className="mx-1 inline-block rounded-md border-2 border-primary bg-brand-soft px-2 font-bold text-brand-soft-foreground"
              >
                <span className="sr-only">{t.writing.blankSrLabel(part.label)}</span>
                <span aria-hidden>( {part.label} )</span>
              </span>
            ),
          )}
        </p>
      ))}
    </section>
  );
}

/** Ngữ liệu của đề Viết (đoạn có ㉠ ㉡, biểu đồ + ghi chú số liệu giả định, ảnh, nội dung đề). Dùng chung với trình làm đề thi. */
export function PromptMaterial({ prompt }: { prompt: WritingPrompt }) {
  const hasCharts = (prompt.chart_data?.length ?? 0) > 0;
  const showImageFrame = prompt.image_desc && !prompt.image_url && !hasCharts;
  return (
    <div className="space-y-4">
      {prompt.passage ? <PassageView passage={prompt.passage} /> : null}

      {prompt.chart_data?.map((chart, index) => (
        <ChartView key={index} chart={chart} />
      ))}
      {hasCharts && prompt.data_is_fictional ? (
        <p className="-mt-2 text-xs text-muted-foreground">{t.material.chartFictional}</p>
      ) : null}

      {prompt.image_url ? (
        // Ảnh đề do đội nội dung cung cấp; mô tả tiếng Việt làm alt.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={prompt.image_url}
          alt={prompt.image_desc ?? ""}
          className="max-h-96 w-full rounded-xl border border-border object-contain"
        />
      ) : null}
      {showImageFrame ? <ImagePending description={prompt.image_desc!} /> : null}

      {prompt.task ? (
        <section
          aria-label={t.writing.taskLabel}
          lang="ko"
          className="rounded-xl border border-border bg-card p-4 text-base leading-8"
        >
          <RichLines text={prompt.task} lineClassName="[&:not(:first-child)]:mt-0.5" />
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ một đề

interface PanelProps {
  program: string;
  prompt: WritingPrompt;
  /** Số thứ tự đề (từ 1) và tổng số đề của dạng, để hiện "Đề 1/2". */
  position?: number;
  total?: number;
}

/** Trình viết cho MỘT đề: đề bài, ô viết có bộ đếm, nháp khách, nút xem bài mẫu. */
export function WritingPromptPanel({ program, prompt, position = 1, total = 1 }: PanelProps) {
  const uid = useId();
  const [values, setValues] = useState<DraftValues>(EMPTY_VALUES);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [reveal, setReveal] = useState<WritingReveal | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const revealRef = useRef<HTMLElement>(null);
  const focusRevealRef = useRef(false);
  const latestRef = useRef<DraftValues>(EMPTY_VALUES);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const isEssay = prompt.format === "essay";
  const blankLabels = (prompt.blanks ?? []).map((b) => b.label);
  const essayCount = countChars(values.essay);

  // ---- nạp nháp (sau khi hydrate). Nếu người học đã gõ trước khi nạp xong thì giữ bản đang gõ.
  useEffect(() => {
    let cancelled = false;
    void loadDraft(program, prompt.id).then((draft) => {
      if (cancelled || !draft || dirtyRef.current) return;
      const restored = { essay: draft.essay, blanks: draft.blanks, checked: draft.checked };
      latestRef.current = restored;
      setValues(restored);
      setDraftStatus("restored");
    });
    return () => {
      cancelled = true;
    };
  }, [program, prompt.id]);

  // ---- ghi nháp: gộp lần gõ; ghi nốt khi rời trang / đổi đề
  const persist = useCallback(async () => {
    timerRef.current = undefined;
    const ok = await saveDraft(program, prompt.id, latestRef.current);
    setDraftStatus(ok ? "saved" : "failed");
  }, [program, prompt.id]);

  useEffect(() => {
    const flush = () => {
      if (timerRef.current === undefined) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
      void saveDraft(program, prompt.id, latestRef.current);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [program, prompt.id]);

  const apply = useCallback(
    (next: DraftValues) => {
      latestRef.current = next;
      dirtyRef.current = true;
      setValues(next);
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void persist(), DRAFT_SAVE_DELAY_MS);
    },
    [persist],
  );

  // ---- focus vào khối bài mẫu ngay khi hiện
  useEffect(() => {
    if (showReveal && reveal && focusRevealRef.current) {
      focusRevealRef.current = false;
      focusAndReveal(revealRef.current);
    }
  }, [showReveal, reveal]);

  async function runReveal() {
    setRevealError(null);
    focusRevealRef.current = true;
    if (reveal) {
      setShowReveal(true);
      return;
    }
    setLoadingReveal(true);
    try {
      const data = await fetchWritingReveal({ program, id: prompt.id });
      setReveal(data);
      setShowReveal(true);
      setAnnouncement(t.writing.reveal.loaded);
    } catch (error) {
      focusRevealRef.current = false;
      setRevealError(error instanceof WritingRevealError ? error.message : t.writing.errors.server);
    } finally {
      setLoadingReveal(false);
    }
  }

  function hideReveal() {
    setShowReveal(false);
    setAnnouncement("");
  }

  async function doClear() {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    latestRef.current = EMPTY_VALUES;
    dirtyRef.current = false;
    setValues(EMPTY_VALUES);
    setConfirmClear(false);
    const ok = await clearDraft(program, prompt.id);
    setDraftStatus(ok ? "idle" : "failed");
    setAnnouncement(t.writing.cleared);
  }

  const counterId = `${uid}-counter`;
  const hintId = `${uid}-hint`;
  const essayId = `${uid}-essay`;
  const hasContent = isEssay
    ? values.essay.trim() !== ""
    : blankLabels.some((label) => (values.blanks[label] ?? "").trim() !== "");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-[calc(var(--header-height)+0.75rem)] rounded-md text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t.writing.promptOf(position, total)}{" "}
          <span className="ml-1 text-sm font-medium text-muted-foreground">{prompt.type_code}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{t.writing.difficulty(prompt.difficulty)}</p>
      </div>

      <p lang="ko" className="text-lg leading-relaxed font-semibold md:text-xl">
        {renderInline(prompt.stem)}
      </p>

      <PromptMaterial prompt={prompt} />

      {isEssay ? (
        <div className="space-y-2">
          <label htmlFor={essayId} className="block text-base font-semibold">
            {t.writing.essayLabel}
          </label>
          <p id={hintId} className="text-sm text-muted-foreground">
            {t.writing.essayHint}
          </p>
          <textarea
            id={essayId}
            lang="ko"
            rows={10}
            value={values.essay}
            onChange={(event) => apply({ ...values, essay: event.target.value })}
            aria-describedby={`${counterId} ${hintId}`}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            placeholder={t.writing.essayPlaceholder}
            className="min-h-64 w-full resize-y rounded-xl border-2 border-input bg-background p-3 text-base leading-8 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <CharCounter id={counterId} count={essayCount} limit={prompt.char_limit} />
        </div>
      ) : (
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold">{t.writing.blanksLegend}</legend>
          <p className="text-sm text-muted-foreground">{t.writing.blanksHint}</p>
          {blankLabels.map((label) => {
            const inputId = `${uid}-blank-${label}`;
            return (
              <div key={label} className="space-y-1.5">
                <label htmlFor={inputId} className="block text-sm font-semibold">
                  {t.writing.blankInputLabel(label)}
                </label>
                <input
                  id={inputId}
                  type="text"
                  lang="ko"
                  value={values.blanks[label] ?? ""}
                  onChange={(event) =>
                    apply({ ...values, blanks: { ...values.blanks, [label]: event.target.value } })
                  }
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  className="min-h-12 w-full rounded-xl border-2 border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            );
          })}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {showReveal ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 px-5 text-base"
            onClick={hideReveal}
          >
            <EyeOff aria-hidden />
            {t.writing.hideReveal}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 px-5 text-base"
            disabled={loadingReveal}
            onClick={() => void runReveal()}
          >
            <Eye aria-hidden />
            {loadingReveal ? t.writing.loadingReveal : t.writing.showReveal}
          </Button>
        )}
        {hasContent ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 px-4 text-base"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 aria-hidden />
            {t.writing.clear}
          </Button>
        ) : null}
      </div>
      {!hasContent && !showReveal ? (
        <p className="-mt-3 text-xs text-muted-foreground">{t.writing.emptyBeforeReveal}</p>
      ) : null}

      {confirmClear ? (
        <div
          role="alert"
          className="space-y-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
        >
          <p>
            <strong>{t.writing.confirmClearTitle}</strong> {t.writing.confirmClearBody}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              onClick={() => setConfirmClear(false)}
            >
              {t.writing.confirmClearNo}
            </Button>
            <Button type="button" className="h-11 px-4" onClick={() => void doClear()}>
              {t.writing.confirmClearYes}
            </Button>
          </div>
        </div>
      ) : null}

      {revealError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-50"
        >
          <span>{revealError}</span>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4"
            onClick={() => void runReveal()}
          >
            <RotateCcw aria-hidden />
            {t.writing.errors.retry}
          </Button>
        </div>
      ) : null}

      <p
        className={cn(
          "text-xs text-muted-foreground",
          draftStatus === "failed" && "font-medium text-red-700 dark:text-red-300",
        )}
      >
        {draftStatus === "restored"
          ? t.writing.draft.restored
          : draftStatus === "saved"
            ? t.writing.draft.saved
            : draftStatus === "failed"
              ? t.writing.draft.failed
              : t.writing.draft.idle}
      </p>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {showReveal && reveal ? (
        <WritingRevealView
          ref={revealRef}
          prompt={prompt}
          reveal={reveal}
          essay={values.essay}
          blanks={values.blanks}
          checked={values.checked}
          onToggleChecked={(pointId) =>
            apply({
              ...values,
              checked: values.checked.includes(pointId)
                ? values.checked.filter((id) => id !== pointId)
                : [...values.checked, pointId],
            })
          }
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ nhiều đề của một dạng

/** Trình viết của một dạng (W51…W54): chọn đề + trình viết cho đề đang chọn. */
export function WritingPracticeRunner({
  program,
  prompts,
}: {
  program: string;
  prompts: readonly WritingPrompt[];
}) {
  const [index, setIndex] = useState(0);
  const prompt = prompts[index]!;

  return (
    <div role="region" aria-label={t.writing.regionLabel} className="space-y-5">
      {prompts.length > 1 ? (
        <nav aria-label={t.writing.promptNav}>
          <ol className="flex flex-wrap gap-2">
            {prompts.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={t.writing.gotoPrompt(i + 1)}
                  className={cn(
                    "grid size-11 place-items-center rounded-lg border-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                    i === index
                      ? "border-primary bg-brand-soft ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "border-border bg-background",
                  )}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <WritingPromptPanel
        key={prompt.id}
        program={program}
        prompt={prompt}
        position={index + 1}
        total={prompts.length}
      />
    </div>
  );
}
