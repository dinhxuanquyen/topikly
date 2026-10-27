import { CircleAlert, CircleCheck, CircleMinus } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import {
  charLimitStatus,
  type CharLimitStatus,
  type WritingCharLimit,
} from "@/lib/practice/writing-types";

const STATUS_STYLE: Record<CharLimitStatus, string> = {
  below: "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
  within:
    "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50",
  above: "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-50",
};

const STATUS_ICON = { below: CircleMinus, within: CircleCheck, above: CircleAlert } as const;

/**
 * Bộ đếm ký tự của ô viết (đếm kể cả khoảng trắng, theo `countChars`) kèm trạng thái so với khung.
 * Trạng thái luôn có chữ + biểu tượng (không chỉ dựa vào màu). Vùng aria-live chỉ đọc khi TRẠNG
 * THÁI đổi (dưới/đạt/vượt), không đọc từng ký tự gõ.
 */
export function CharCounter({
  id,
  count,
  limit,
  announce = true,
}: {
  /** id của phần tử hiển thị số đếm, để ô viết trỏ aria-describedby tới. */
  id: string;
  count: number;
  limit?: WritingCharLimit;
  /** false = bộ đếm tĩnh (xem lại bài đã nộp): không có vùng aria-live đọc trạng thái. */
  announce?: boolean;
}) {
  if (!limit) {
    return (
      <p id={id} className="text-sm tabular-nums">
        {t.writing.counter.count(count)}
      </p>
    );
  }

  const status = charLimitStatus(count, limit);
  const Icon = STATUS_ICON[status];
  const statusText = t.writing.counter.status[status](limit.min, limit.max);
  const fill = Math.min(100, Math.round((count / limit.max) * 100));
  const minMark = Math.round((limit.min / limit.max) * 100);

  return (
    <div className="space-y-1.5">
      <div
        id={id}
        data-status={status}
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm",
          STATUS_STYLE[status],
        )}
      >
        <span className="font-semibold tabular-nums">{t.writing.counter.count(count)}</span>
        <span className="tabular-nums">{t.writing.counter.range(limit.min, limit.max)}</span>
        <span className="flex items-center gap-1 font-medium">
          <Icon aria-hidden className="size-4" />
          {statusText}
        </span>
      </div>
      <div aria-hidden className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            status === "above"
              ? "bg-red-600"
              : status === "within"
                ? "bg-emerald-600"
                : "bg-amber-500",
          )}
          style={{ width: `${fill}%` }}
        />
        <div className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${minMark}%` }} />
      </div>
      {announce ? (
        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>
      ) : null}
    </div>
  );
}
