"use client";

import type { TextareaHTMLAttributes } from "react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { WritingPrompt } from "@/lib/practice/writing-types";
import { frameRows } from "@/lib/writing/manuscript";
import { ManuscriptEditor, type ManuscriptHighlight } from "./manuscript-editor";
import { useWritingMode, type WritingMode } from "./writing-mode";

const TEXTAREA_CLASS =
  "min-h-64 w-full resize-y rounded-xl border-2 border-input bg-background p-3 text-base leading-8 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50";

const MODES: readonly WritingMode[] = ["manuscript", "typing"];

/** Chọn cách viết: giấy 원고지 hay ô gõ. Hai nút bật/tắt, có chữ, không chỉ dựa vào màu. */
export function WritingModeToggle({
  mode,
  onChange,
}: {
  mode: WritingMode;
  onChange: (mode: WritingMode) => void;
}) {
  return (
    <div role="group" aria-label={t.writing.manuscript.modeLabel} className="flex flex-wrap gap-2">
      {MODES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "min-h-11 rounded-lg border-2 px-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
            mode === value
              ? "border-primary bg-brand-soft text-brand-soft-foreground"
              : "border-border bg-background",
          )}
        >
          {value === "manuscript"
            ? t.writing.manuscript.modeManuscript
            : t.writing.manuscript.modeTyping}
        </button>
      ))}
    </div>
  );
}

type FieldTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "className"
> & {
  id: string;
  value: string;
};

/**
 * Ô viết bài W53–W54 với hai cách viết: ô gõ thường hoặc trình soạn 원고지. Cả hai dùng chung một
 * ô nhập thật (cùng `id`, nhãn, aria-describedby), nên nháp, bộ đếm và kiểm tra quy tắc không
 * đổi. Đề không có cấu hình 원고지 hoặc khung ký tự thì chỉ có ô gõ.
 */
export function EssayField({
  prompt,
  textareaProps,
  highlights,
}: {
  prompt: WritingPrompt;
  textareaProps: FieldTextareaProps;
  highlights?: readonly ManuscriptHighlight[];
}) {
  const [mode, setMode] = useWritingMode();
  const config = prompt.manuscript;
  const limit = prompt.char_limit;
  if (!config || !limit) return <textarea {...textareaProps} className={TEXTAREA_CLASS} />;

  const usageId = `${textareaProps.id}-manuscript-usage`;
  const hintId = `${textareaProps.id}-manuscript-hint`;
  const frameCells = frameRows(limit.max, config) * config.cells_per_line;
  const describedBy = [textareaProps["aria-describedby"], hintId, usageId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <WritingModeToggle mode={mode} onChange={setMode} />
      {mode === "manuscript" ? (
        <>
          <p id={hintId} className="text-sm text-muted-foreground">
            {t.writing.manuscript.hint}
          </p>
          <ManuscriptEditor
            textareaProps={{ ...textareaProps, "aria-describedby": describedBy }}
            config={config}
            frameCells={frameCells}
            highlights={highlights}
            usageId={usageId}
          />
          <p className="text-xs text-muted-foreground">{t.writing.manuscript.note}</p>
        </>
      ) : (
        <textarea {...textareaProps} className={TEXTAREA_CLASS} />
      )}
    </div>
  );
}
