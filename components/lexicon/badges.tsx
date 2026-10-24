import { ClockAlert, TriangleAlert } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { FalseFriendKind } from "@/lib/lexicon/types";

/** Nhãn nhỏ dùng chung cho danh sách / chi tiết từ vựng và ngữ pháp. */

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LevelTag({ level, label }: { level: number; label?: string }) {
  return (
    <Tag className="bg-brand-soft text-brand-soft-foreground">
      {label ?? t.lexicon.levelLabel(level)}
    </Tag>
  );
}

/** Cảnh báo ngắn "Bạn giả" trong danh sách (chi tiết đầy đủ ở FalseFriendCallout). */
export function FalseFriendTag({ kind }: { kind: FalseFriendKind }) {
  return (
    <Tag className="bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-50">
      <TriangleAlert aria-hidden className="size-3" />
      {t.vocab.falseFriendShort}
      <span className="sr-only">
        : {kind === "full" ? t.vocabDetail.falseFriend.full : t.vocabDetail.falseFriend.partial}
      </span>
    </Tag>
  );
}

/** Nhãn "Nội dung đang chờ duyệt" cho mục chưa được người dùng duyệt (cờ `reviewed` = false). */
export function PendingReviewTag({ className }: { className?: string }) {
  return (
    <Tag
      className={cn(
        "border border-dashed border-border bg-background text-muted-foreground",
        className,
      )}
    >
      <ClockAlert aria-hidden className="size-3" />
      {t.lexicon.reviewPending}
    </Tag>
  );
}
