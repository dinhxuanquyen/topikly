"use client";

import { useState } from "react";
import { t } from "@/components/i18n";
import { manuscriptLayout } from "@/lib/practice/manuscript-layout";
import { cn } from "@/lib/utils";

/** The native textarea remains the only editable/accessibility surface. */
export function ManuscriptPreview({ text, maxCells }: { text: string; maxCells?: number }) {
  const [visible, setVisible] = useState(true);
  const rows = manuscriptLayout(text);
  const used = rows.length * 20;
  const shown = rows.length ? rows : [Array<string>(20).fill("")];
  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label={t.writing.manuscript.modeLabel}
        className="flex flex-wrap gap-2"
      >
        {[true, false].map((paper) => (
          <button
            key={String(paper)}
            type="button"
            aria-pressed={visible === paper}
            onClick={() => setVisible(paper)}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              visible === paper
                ? "border-primary bg-brand-soft text-brand-soft-foreground"
                : "border-border bg-background",
            )}
          >
            {paper ? t.writing.manuscript.paper : t.writing.manuscript.ibt}
          </button>
        ))}
      </div>
      {visible ? (
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-muted-foreground">{t.writing.manuscript.caption(used)}</p>
          <div
            className="max-h-[32rem] overflow-y-auto rounded-lg border border-border bg-card p-2 sm:p-4"
            aria-hidden="true"
          >
            {/* 20 equal cells fill the existing column; no minimum width that overflows phones. */}
            <div lang="ko" className="grid grid-cols-20 border-t border-l border-primary/30">
              {shown.flat().map((cell, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex aspect-square min-w-0 items-center justify-center overflow-hidden border-r border-b border-primary/30 text-[clamp(10px,2.8vw,20px)] leading-none",
                    maxCells !== undefined && i >= maxCells && "bg-destructive/10 text-destructive",
                  )}
                >
                  {cell === " " ? "\u00a0" : cell}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t.writing.manuscript.hint}</p>
          {maxCells !== undefined && used > maxCells ? (
            <p className="text-sm font-medium text-destructive">
              {t.writing.manuscript.overflow(maxCells)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
