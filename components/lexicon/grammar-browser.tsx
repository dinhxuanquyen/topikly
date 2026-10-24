"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/components/i18n";
import { renderInline } from "@/components/practice/rich-text";
import { Button } from "@/components/ui/button";
import type { CompareGroupSummary, GrammarFacets, GrammarPointSummary } from "@/lib/lexicon/types";
import { LevelTag, Tag } from "./badges";
import { FilterChips, FilterSelect, SearchField } from "./filter-controls";
import {
  filterGrammar,
  isGrammarFilterActive,
  parseLevelParam,
  type GrammarFilterState,
} from "./lexicon-filter";
import { useUrlParams } from "./url-params";

/** Tên nhóm dạng "Chủ đề: mẫu 1 / mẫu 2" -> phần chủ đề, để nhãn trong danh sách gọn. */
export function groupShortTitle(title: string): string {
  const head = title.split(":")[0]?.trim();
  return head ? head : title;
}

const PARAM = { level: "cap", function: "chuc-nang", group: "nhom" } as const;

export function GrammarBrowser({
  program,
  points,
  facets,
  groups,
}: {
  program: string;
  points: readonly GrammarPointSummary[];
  facets: GrammarFacets;
  groups: readonly CompareGroupSummary[];
}) {
  const { params, set } = useUrlParams();
  const [q, setQ] = useState("");

  const level = parseLevelParam(params.get(PARAM.level));
  const fn = params.get(PARAM.function);
  const group = params.get(PARAM.group);
  const filter = useMemo<GrammarFilterState>(
    () => ({ level, function: fn, group, q }),
    [level, fn, group, q],
  );
  const filtered = useMemo(() => filterGrammar(points, filter), [points, filter]);
  const groupTitle = (slug: string | null) =>
    groups.find((g) => g.slug === slug)?.title_vi ?? slug ?? "";

  function clear() {
    setQ("");
    set({ [PARAM.level]: null, [PARAM.function]: null, [PARAM.group]: null });
  }

  return (
    <div className="space-y-6">
      {groups.length > 0 ? (
        <section aria-labelledby="grammar-groups-heading" className="space-y-2">
          <h2 id="grammar-groups-heading" className="text-sm font-semibold text-muted-foreground">
            {t.grammar.groupsHeading}
          </h2>
          <p className="text-xs text-muted-foreground">{t.grammar.groupsHint}</p>
          <ul aria-label={t.grammar.groupsListLabel} className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/${program}/ly-thuyet/ngu-phap/nhom/${g.slug}`}
                  className="block h-full rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="block text-sm font-semibold">
                    {renderInline(g.title_vi, { tagKorean: true })}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t.grammar.groupMeta(g.member_count, g.function_name_vi)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label={t.grammar.filterHeading} className="space-y-3">
        <FilterChips
          label={t.grammar.filters.level}
          allLabel={t.grammar.filters.levelAll}
          value={level === null ? null : String(level)}
          onChange={(value) => set({ [PARAM.level]: value })}
          options={facets.levels.map((l) => ({
            value: String(l.level),
            label: t.vocab.filters.levelOption(l.label, l.count),
          }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterSelect
            label={t.grammar.filters.function}
            allLabel={t.grammar.filters.functionAll}
            value={fn}
            onChange={(value) => set({ [PARAM.function]: value })}
            options={facets.functions.map((f) => ({
              value: f.code,
              label: t.vocab.filters.facetOption(f.name_vi, f.count),
            }))}
          />
          <FilterSelect
            label={t.grammar.filters.group}
            allLabel={t.grammar.filters.groupAll}
            value={group}
            onChange={(value) => set({ [PARAM.group]: value })}
            options={groups.map((g) => ({ value: g.slug, label: g.title_vi }))}
          />
        </div>
        <SearchField
          label={t.grammar.filters.search}
          placeholder={t.grammar.filters.searchPlaceholder}
          value={q}
          onChange={setQ}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm font-medium tabular-nums">
          {t.grammar.result(filtered.length, points.length)}
        </p>
        {isGrammarFilterActive(filter) ? (
          <Button type="button" variant="outline" className="h-11 px-4" onClick={clear}>
            {t.grammar.filters.clear}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
          {t.grammar.empty}
        </p>
      ) : (
        <ul aria-label={t.grammar.listLabel} className="space-y-2">
          {filtered.map((point) => (
            <li key={point.id}>
              <Link
                href={`/${program}/ly-thuyet/ngu-phap/${point.slug}`}
                className="block rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span lang="ko" className="block text-lg font-bold">
                  {point.pattern}
                </span>
                <span className="mt-0.5 block text-sm">{point.meaning_vi}</span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  <LevelTag level={point.level} />
                  <Tag>{point.function_name_vi}</Tag>
                  {point.compare_group ? (
                    <Tag className="bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-50">
                      <span className="sr-only">{t.grammar.inGroup}: </span>
                      {renderInline(groupShortTitle(groupTitle(point.compare_group)), {
                        tagKorean: true,
                      })}
                    </Tag>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
