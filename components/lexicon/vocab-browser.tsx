"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import type { VocabFacets, VocabWordSummary } from "@/lib/lexicon/types";
import { FalseFriendTag, LevelTag, Tag } from "./badges";
import { FilterChips, FilterSelect, SearchField } from "./filter-controls";
import { KnownToggle } from "./known-toggle";
import { useKnownWords } from "./known-store";
import {
  filterVocab,
  isVocabFilterActive,
  parseLevelParam,
  parseStatusParam,
  statusToParam,
  type VocabFilterState,
} from "./lexicon-filter";
import { useUrlParams } from "./url-params";

/** Số từ hiện thêm mỗi lần; danh sách có thể lên tới hàng nghìn từ. */
export const VOCAB_PAGE_SIZE = 50;

/** Tham số URL của bộ lọc (tiếng Việt không dấu, dễ chia sẻ). */
const PARAM = {
  level: "cap",
  topic: "chu-de",
  pos: "tu-loai",
  falseFriend: "ban-gia",
  status: "trang-thai",
} as const;

export function VocabRow({ program, word }: { program: string; word: VocabWordSummary }) {
  return (
    <li className="flex items-stretch gap-1 rounded-xl border border-border bg-card text-card-foreground">
      <Link
        href={`/${program}/ly-thuyet/tu-vung/${word.id}`}
        className="group min-w-0 flex-1 rounded-l-xl p-3 outline-none hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span lang="ko" className="text-xl font-bold">
            {word.hangul}
          </span>
          {word.hanja ? (
            <span lang="ko" className="text-sm text-muted-foreground">
              {word.hanja}
            </span>
          ) : null}
          {word.han_viet ? (
            <span className="text-sm font-medium text-brand-soft-foreground italic">
              <span className="sr-only">{t.vocab.hanVietLabel}: </span>
              {word.han_viet}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-sm">{word.meaning_vi}</span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          <LevelTag level={word.level} />
          <Tag>{word.pos_name_vi}</Tag>
          {word.false_friend_kind ? <FalseFriendTag kind={word.false_friend_kind} /> : null}
        </span>
      </Link>
      <div className="flex items-center pr-2">
        <KnownToggle program={program} wordId={word.id} hangul={word.hangul} compact />
      </div>
    </li>
  );
}

export function VocabBrowser({
  program,
  words,
  facets,
}: {
  program: string;
  words: readonly VocabWordSummary[];
  facets: VocabFacets;
}) {
  const { params, set } = useUrlParams();
  const { known, persisted } = useKnownWords(program);
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(VOCAB_PAGE_SIZE);
  const checkboxId = useId();

  const level = parseLevelParam(params.get(PARAM.level));
  const topic = params.get(PARAM.topic);
  const pos = params.get(PARAM.pos);
  const falseFriendOnly = params.get(PARAM.falseFriend) === "1";
  const status = parseStatusParam(params.get(PARAM.status));
  const filter = useMemo<VocabFilterState>(
    () => ({ level, topic, pos, falseFriendOnly, status, q }),
    [level, topic, pos, falseFriendOnly, status, q],
  );

  const filtered = useMemo(() => filterVocab(words, filter, known), [words, filter, known]);
  const shown = filtered.slice(0, visible);
  const knownCount = useMemo(() => words.filter((w) => known.has(w.id)).length, [words, known]);
  const pendingCount = useMemo(() => words.filter((w) => !w.reviewed).length, [words]);
  const percent = words.length === 0 ? 0 : Math.round((knownCount / words.length) * 100);

  function update(updates: Record<string, string | null>) {
    setVisible(VOCAB_PAGE_SIZE);
    set(updates);
  }

  function clear() {
    setQ("");
    setVisible(VOCAB_PAGE_SIZE);
    set({
      [PARAM.level]: null,
      [PARAM.topic]: null,
      [PARAM.pos]: null,
      [PARAM.falseFriend]: null,
      [PARAM.status]: null,
    });
  }

  return (
    <div className="space-y-5">
      <section
        aria-label={t.known.progressLabel}
        className="rounded-xl border border-border bg-card p-3"
      >
        <p className="text-sm font-semibold tabular-nums">
          {t.known.progress(knownCount, words.length)}
        </p>
        <div
          role="progressbar"
          aria-label={t.known.progressLabel}
          aria-valuemin={0}
          aria-valuemax={words.length}
          aria-valuenow={knownCount}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t.known.guestNote}</p>
        {!persisted ? (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">
            {t.known.notPersisted}
          </p>
        ) : null}
      </section>

      <section aria-label={t.vocab.filterHeading} className="space-y-3">
        <FilterChips
          label={t.vocab.filters.level}
          allLabel={t.vocab.filters.levelAll}
          value={filter.level === null ? null : String(filter.level)}
          onChange={(value) => update({ [PARAM.level]: value })}
          options={facets.levels.map((level) => ({
            value: String(level.level),
            label: t.vocab.filters.levelOption(level.label, level.count),
          }))}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <FilterSelect
            label={t.vocab.filters.topic}
            allLabel={t.vocab.filters.topicAll}
            value={filter.topic}
            onChange={(value) => update({ [PARAM.topic]: value })}
            options={facets.topics.map((topic) => ({
              value: topic.code,
              label: t.vocab.filters.facetOption(topic.name_vi, topic.count),
            }))}
          />
          <FilterSelect
            label={t.vocab.filters.pos}
            allLabel={t.vocab.filters.posAll}
            value={filter.pos}
            onChange={(value) => update({ [PARAM.pos]: value })}
            options={facets.pos.map((pos) => ({
              value: pos.code,
              label: t.vocab.filters.facetOption(pos.name_vi, pos.count),
            }))}
          />
          <FilterSelect
            label={t.vocab.filters.status}
            allLabel={t.vocab.filters.statusAll}
            value={statusToParam(filter.status)}
            onChange={(value) => update({ [PARAM.status]: value })}
            options={[
              { value: "chua-thuoc", label: t.vocab.filters.statusUnknown },
              { value: "da-thuoc", label: t.vocab.filters.statusKnown },
            ]}
          />
        </div>
        <label
          htmlFor={checkboxId}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 text-sm font-medium has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 dark:has-[:checked]:bg-amber-950/40"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={filter.falseFriendOnly}
            onChange={(event) => update({ [PARAM.falseFriend]: event.target.checked ? "1" : null })}
            className="size-5 accent-[var(--primary)]"
          />
          {t.vocab.filters.falseFriend(facets.false_friend_count)}
        </label>
        <SearchField
          label={t.vocab.filters.search}
          placeholder={t.vocab.filters.searchPlaceholder}
          value={q}
          onChange={(value) => {
            setVisible(VOCAB_PAGE_SIZE);
            setQ(value);
          }}
        />
      </section>

      {pendingCount > 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t.lexicon.reviewPendingList(pendingCount)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm font-medium tabular-nums">
          {t.vocab.result(filtered.length, words.length)}
        </p>
        {isVocabFilterActive(filter) ? (
          <Button type="button" variant="outline" className="h-11 px-4" onClick={clear}>
            {t.vocab.filters.clear}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
          {t.vocab.empty}
        </p>
      ) : (
        <ul aria-label={t.vocab.listLabel} className="space-y-2">
          {shown.map((word) => (
            <VocabRow key={word.id} program={program} word={word} />
          ))}
        </ul>
      )}

      {shown.length < filtered.length ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="h-12 px-6 text-base"
            onClick={() => setVisible((n) => n + VOCAB_PAGE_SIZE)}
          >
            {t.vocab.showMore(Math.min(VOCAB_PAGE_SIZE, filtered.length - shown.length))}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
