import { useState, type ClipboardEvent, type RefObject } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { renderInline } from "@/components/practice/rich-text";
import { CharCounter } from "@/components/writing/char-counter";
import { PromptMaterial } from "@/components/writing/writing-runner";
import { cn } from "@/lib/utils";
import { WRITING_BLANK_MAX_CHARS, WRITING_TEXT_MAX_CHARS } from "@/lib/exam/writing-self-score";
import type { ExamWritingAnswer } from "@/lib/exam/types";
import { countChars } from "@/lib/practice/writing-types";
import { questionHeadingId } from "./exam-block";
import type { WritingBlockRef } from "./exam-state";

/** Id ô viết bài (essay) của một câu, duy nhất trên trang. */
export function writingEssayId(idPrefix: string, promptId: string): string {
  return `${idPrefix}-essay-${promptId}`;
}

/** Id ô điền một chỗ trống của một câu. */
export function writingBlankId(idPrefix: string, promptId: string, label: string): string {
  return `${idPrefix}-blank-${promptId}-${label}`;
}

interface ExamWritingViewProps {
  blockRef: WritingBlockRef;
  answer: ExamWritingAnswer | undefined;
  marked: boolean;
  /** true = đang nộp / hết giờ: ô viết chỉ đọc. */
  locked: boolean;
  idPrefix: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Tiền tố "Phần Viết" khi đề có nhiều phần. */
  sectionLabel?: string;
  onChangeText: (promptId: string, text: string) => void;
  onChangeBlank: (promptId: string, label: string, text: string) => void;
  onToggleMark: (promptId: string) => void;
  onFocus: (promptId: string) => void;
}

/**
 * Một câu Viết của đề thi: lệnh đề, ngữ liệu (đoạn có ㉠ ㉡, biểu đồ + "Số liệu giả định", nội dung đề)
 * dùng lại `PromptMaterial` của màn Luyện tập Viết, rồi ô nhập: W51–W52 các ô ngắn theo nhãn chỗ trống,
 * W53–W54 một ô lớn kèm bộ đếm ký tự. Không chứa bài mẫu hay đáp án: `WritingPrompt` vốn không có.
 */
export function ExamWritingView({
  blockRef,
  answer,
  marked,
  locked,
  idPrefix,
  headingRef,
  sectionLabel,
  onChangeText,
  onChangeBlank,
  onToggleMark,
  onFocus,
}: ExamWritingViewProps) {
  const { prompt } = blockRef.item;
  const headingText = t.examRun.blockHeading(blockRef.number, blockRef.number);
  const headingId = questionHeadingId(idPrefix, prompt.id);
  const essayId = writingEssayId(idPrefix, prompt.id);
  const counterId = `${essayId}-counter`;
  const hintId = `${essayId}-hint`;
  const text = answer?.text ?? "";
  // Ô nhập có maxLength: trình duyệt cắt im lặng phần dán dư. Bắt sự kiện dán để báo người học.
  const [cutLimit, setCutLimit] = useState<number | null>(null);

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>, limit: number) {
    const field = event.currentTarget;
    const selected = (field.selectionEnd ?? 0) - (field.selectionStart ?? 0);
    const pasted = event.clipboardData.getData("text").length;
    if (field.value.length - selected + pasted > limit) setCutLimit(limit);
  }

  /** Còn chỗ trống dưới giới hạn thì tắt thông báo cắt. */
  function onEdit(value: string, limit: number) {
    if (value.length < limit) setCutLimit(null);
  }

  return (
    <section aria-labelledby={`${idPrefix}-block`} className="space-y-5">
      <div className="space-y-2">
        <h2
          id={`${idPrefix}-block`}
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-[calc(var(--header-height)+5rem)] rounded-md text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {sectionLabel ? `${sectionLabel} · ${headingText}` : headingText}
        </h2>
        <p lang="ko" className="text-lg leading-relaxed font-semibold md:text-xl">
          {renderInline(prompt.stem)}
        </p>
      </div>

      <article
        aria-labelledby={headingId}
        data-exam-question={prompt.id}
        onFocusCapture={() => onFocus(prompt.id)}
        className="space-y-4 rounded-2xl border border-border p-3 md:p-4"
      >
        <div className="flex items-center justify-end gap-2">
          <h3
            id={headingId}
            tabIndex={-1}
            className="sr-only scroll-mt-[calc(var(--header-height)+5rem)]"
          >
            {t.examRun.questionHeading(blockRef.number)}
          </h3>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-11 px-3",
              marked &&
                "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
            )}
            aria-pressed={marked}
            title={t.examRun.markHelp}
            disabled={locked}
            onClick={() => onToggleMark(prompt.id)}
          >
            <Flag aria-hidden className={marked ? "fill-amber-400" : undefined} />
            {marked ? t.examRun.unmark : t.examRun.mark}
          </Button>
        </div>

        <PromptMaterial prompt={prompt} />

        {prompt.format === "essay" ? (
          <div className="space-y-2">
            <label htmlFor={essayId} className="block text-base font-semibold">
              {t.writing.essayLabel}
            </label>
            <p id={hintId} className="text-sm text-muted-foreground">
              {t.examRun.writing.essayHint}
            </p>
            <textarea
              id={essayId}
              lang="ko"
              rows={10}
              value={text}
              readOnly={locked}
              maxLength={WRITING_TEXT_MAX_CHARS}
              onChange={(event) => {
                onEdit(event.target.value, WRITING_TEXT_MAX_CHARS);
                onChangeText(prompt.id, event.target.value);
              }}
              onPaste={(event) => onPaste(event, WRITING_TEXT_MAX_CHARS)}
              aria-describedby={`${counterId} ${hintId}`}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              placeholder={t.writing.essayPlaceholder}
              className="min-h-64 w-full resize-y rounded-xl border-2 border-input bg-background p-3 text-base leading-8 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <CharCounter id={counterId} count={countChars(text)} limit={prompt.char_limit} />
          </div>
        ) : (
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold">{t.writing.blanksLegend}</legend>
            <p className="text-sm text-muted-foreground">{t.examRun.writing.blanksHint}</p>
            {(prompt.blanks ?? []).map(({ label }) => {
              const inputId = writingBlankId(idPrefix, prompt.id, label);
              return (
                <div key={label} className="space-y-1.5">
                  <label htmlFor={inputId} className="block text-sm font-semibold">
                    {t.writing.blankInputLabel(label)}
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    lang="ko"
                    value={answer?.blanks?.[label] ?? ""}
                    readOnly={locked}
                    maxLength={WRITING_BLANK_MAX_CHARS}
                    onChange={(event) => {
                      onEdit(event.target.value, WRITING_BLANK_MAX_CHARS);
                      onChangeBlank(prompt.id, label, event.target.value);
                    }}
                    onPaste={(event) => onPaste(event, WRITING_BLANK_MAX_CHARS)}
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
        {cutLimit !== null ? (
          <p
            role="status"
            className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
          >
            {t.examRun.writing.truncated(cutLimit)}
          </p>
        ) : null}
      </article>
    </section>
  );
}
