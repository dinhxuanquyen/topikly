"use client";

import { useEffect, useState } from "react";
import { t } from "@/components/i18n";
import { EMPTY_STATS, ratePercent, type TypeStats } from "./guest-stats";
import { invalidateStatsCache, loadStatsByType, subscribeGuestChanges } from "./guest-store";

/**
 * Thống kê của chế độ khách cho MỘT dạng câu, nhúng trong thẻ dạng. Hydrate sau khi trang
 * prerender xong: lần đầu chỉ giữ chỗ (không đổi bố cục), rồi đọc IndexedDB.
 * Tự đọc lại khi có ghi mới, khi tab hiện lại và khi trang được khôi phục từ bộ nhớ đệm.
 */
export function GuestTypeStats({
  program,
  typeCode,
  questionCount,
}: {
  program: string;
  typeCode: string;
  questionCount: number;
}) {
  const [stats, setStats] = useState<TypeStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void loadStatsByType(program).then((map) => {
        if (!cancelled) setStats(map[typeCode] ?? EMPTY_STATS);
      });
    };
    const refreshFromDisk = () => {
      invalidateStatsCache();
      refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshFromDisk();
    };
    refresh();
    const unsubscribe = subscribeGuestChanges(refresh);
    window.addEventListener("pageshow", refreshFromDisk);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("pageshow", refreshFromDisk);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [program, typeCode]);

  // Giữ đúng chiều cao dòng khi chưa có dữ liệu để thẻ không nhảy.
  if (stats === null) {
    return (
      <span className="block min-h-10" aria-hidden>
        &nbsp;
      </span>
    );
  }

  if (stats.attempted === 0 || stats.rate === null) {
    return (
      <span className="block min-h-10 text-sm text-muted-foreground">{t.guestStats.notDone}</span>
    );
  }

  const percent = ratePercent(stats.rate);
  return (
    <span className="block min-h-10 space-y-1.5">
      <span className="block text-sm font-semibold">
        {t.guestStats.summary(stats.correct, stats.attempted, percent)}
      </span>
      <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
      <span className="block text-xs text-muted-foreground">
        {t.guestStats.progress(stats.attempted, questionCount)}
      </span>
    </span>
  );
}
