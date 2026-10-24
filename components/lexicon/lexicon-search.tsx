"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { t } from "@/components/i18n";
import type { LexiconSearchResponse } from "@/lib/lexicon/types";
import { FalseFriendTag, LevelTag, Tag } from "./badges";
import { SearchField } from "./filter-controls";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "done"; result: LexiconSearchResponse };

/** Trễ sau lần gõ cuối trước khi gọi API tìm kiếm. */
export const SEARCH_DEBOUNCE_MS = 250;

/**
 * Ô tìm kiếm chung cho Từ vựng + Ngữ pháp, gọi GET /api/lexicon/search (không phân biệt dấu).
 * Không cần tài khoản. Lỗi mạng hiện thông báo, không làm hỏng phần còn lại của trang.
 */
export function LexiconSearch({ program }: { program: string }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const headingId = useId();

  useEffect(() => {
    const query = q.trim();
    if (query === "") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState({ phase: "loading" });
      try {
        const params = new URLSearchParams({ program, q: query, limit: "8" });
        const response = await fetch(`/api/lexicon/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const result = (await response.json()) as LexiconSearchResponse;
        setState({ phase: "done", result });
      } catch {
        if (!controller.signal.aborted) setState({ phase: "error" });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [program, q]);

  const active = q.trim() !== "";
  const result = active && state.phase === "done" ? state.result : null;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-sm font-semibold text-muted-foreground">
        {t.theory.search.heading}
      </h2>
      <SearchField
        label={t.theory.search.label}
        placeholder={t.theory.search.placeholder}
        value={q}
        onChange={(value) => {
          setQ(value);
          if (value.trim() === "") setState({ phase: "idle" });
        }}
      />
      <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {active && state.phase === "loading" ? t.theory.search.searching : null}
        {result
          ? result.vocab.length + result.grammar.length === 0
            ? t.theory.search.empty
            : t.theory.search.resultCount(result.vocab.length, result.grammar.length)
          : null}
      </div>
      {active && state.phase === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
          {t.theory.search.error}
        </p>
      ) : null}

      {result && result.vocab.length > 0 ? (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold">{t.theory.search.vocabHeading}</h3>
          <ul className="space-y-2">
            {result.vocab.map((word) => (
              <li key={word.id}>
                <Link
                  href={`/${program}/ly-thuyet/tu-vung/${word.id}`}
                  className="block rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span lang="ko" className="text-lg font-bold">
                      {word.hangul}
                    </span>
                    {word.hanja ? (
                      <span lang="ko" className="text-sm text-muted-foreground">
                        {word.hanja}
                      </span>
                    ) : null}
                    {word.han_viet ? (
                      <span className="text-sm font-medium italic">{word.han_viet}</span>
                    ) : null}
                  </span>
                  <span className="block text-sm">{word.meaning_vi}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <LevelTag level={word.level} />
                    {word.false_friend_kind ? (
                      <FalseFriendTag kind={word.false_friend_kind} />
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result && result.grammar.length > 0 ? (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold">{t.theory.search.grammarHeading}</h3>
          <ul className="space-y-2">
            {result.grammar.map((point) => (
              <li key={point.id}>
                <Link
                  href={`/${program}/ly-thuyet/ngu-phap/${point.slug}`}
                  className="block rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span lang="ko" className="block text-lg font-bold">
                    {point.pattern}
                  </span>
                  <span className="block text-sm">{point.meaning_vi}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <LevelTag level={point.level} />
                    <Tag>{point.function_name_vi}</Tag>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
