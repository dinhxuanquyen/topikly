"use client";

import { Check, Circle } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { useKnownWords } from "./known-store";

/**
 * Nút bật/tắt "đã thuộc" của một từ (chế độ khách, lưu trên máy). Là nút bật tắt thật
 * (aria-pressed); trạng thái luôn có chữ hoặc biểu tượng + nhãn, không chỉ dựa vào màu.
 * `compact` = chỉ biểu tượng (trong danh sách), chữ chuyển thành sr-only.
 */
export function KnownToggle({
  program,
  wordId,
  hangul,
  compact = false,
  className,
}: {
  program: string;
  wordId: string;
  hangul: string;
  compact?: boolean;
  className?: string;
}) {
  const { isKnown, toggle } = useKnownWords(program);
  const known = isKnown(wordId);
  const Icon = known ? Check : Circle;

  return (
    <button
      type="button"
      aria-pressed={known}
      aria-label={t.known.toggleLabel(hangul)}
      title={known ? t.known.known : t.known.unknown}
      onClick={() => toggle(wordId)}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
        compact ? "min-w-11 px-2.5" : "px-4",
        known
          ? "border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-50"
          : "border-border bg-background hover:bg-muted",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      <span className={compact ? "sr-only" : undefined}>
        {known ? t.known.known : t.known.unknown}
      </span>
    </button>
  );
}
