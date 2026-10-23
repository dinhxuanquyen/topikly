"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";

interface SubmitDialogProps {
  /** Số câu còn bỏ trống. */
  blank: number;
  /** Số câu đang đánh dấu. */
  marked: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Hộp xác nhận nộp bài (role="dialog", aria-modal). Focus vào "Quay lại làm bài" (lựa chọn an
 * toàn), Tab xoay vòng trong hộp, Esc đóng và trả focus về nút đã mở.
 */
export function SubmitDialog({ blank, marked, onCancel, onConfirm }: SubmitDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const backRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    backRef.current?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancelRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const first = backRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center"
      onKeyDown={onKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {t.examRun.confirm.title}
        </h2>
        <div id={bodyId} className="space-y-2 text-sm leading-relaxed">
          {blank > 0 ? (
            <p className="font-semibold text-red-700 dark:text-red-300">
              {t.examRun.confirm.blank(blank)}
            </p>
          ) : (
            <p>{t.examRun.confirm.allAnswered}</p>
          )}
          {marked > 0 ? <p>{t.examRun.confirm.marked(marked)}</p> : null}
          <p className="text-muted-foreground">{t.examRun.confirm.final}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={backRef}
            type="button"
            variant="outline"
            className="h-12 px-5 text-base"
            onClick={onCancel}
          >
            {t.examRun.confirm.back}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            className="h-12 px-5 text-base"
            onClick={onConfirm}
          >
            {t.examRun.confirm.yes}
          </Button>
        </div>
      </div>
    </div>
  );
}
