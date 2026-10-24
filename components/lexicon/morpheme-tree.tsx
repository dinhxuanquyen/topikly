"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { FamilyMember, SyllableFamily } from "@/lib/lexicon/types";
import { FalseFriendTag, LevelTag } from "./badges";

/** Chữ Hán đang xét được tô nổi trong chuỗi Hán tự của một từ. */
function HanjaWithHighlight({ text, highlight }: { text: string; highlight: string }) {
  return (
    <span lang="ko">
      {Array.from(text).map((char, index) =>
        char === highlight ? (
          <span
            key={index}
            className="rounded bg-brand-soft px-0.5 font-bold text-brand-soft-foreground"
          >
            {char}
          </span>
        ) : (
          <span key={index}>{char}</span>
        ),
      )}
    </span>
  );
}

function FamilyWord({
  program,
  member,
  hanja,
}: {
  program: string;
  member: FamilyMember;
  hanja: string;
}) {
  return (
    <li>
      <Link
        href={`/${program}/ly-thuyet/tu-vung/${member.id}`}
        className="block rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span lang="ko" className="text-lg font-bold">
            {member.hangul}
          </span>
          {member.hanja ? (
            <span className="text-sm text-muted-foreground">
              <HanjaWithHighlight text={member.hanja} highlight={hanja} />
            </span>
          ) : null}
          {member.han_viet ? (
            <span className="text-sm font-medium text-brand-soft-foreground italic">
              {member.han_viet}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-sm">{member.meaning_vi}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span lang="ko">{t.vocabDetail.morpheme.familyWordSound(member.ko, member.hv)}</span>
          <LevelTag level={member.level} />
          {member.false_friend_kind ? <FalseFriendTag kind={member.false_friend_kind} /> : null}
        </span>
      </Link>
    </li>
  );
}

/**
 * Cây hình vị Hán-Hàn của một từ: mỗi chữ Hán là một nút; bấm để xem "gia đình từ" của chữ đó
 * (các từ khác chứa cùng chữ). Dữ liệu đã được server dựng sẵn (`families`), không gọi API.
 */
export function MorphemeTree({
  program,
  families,
}: {
  program: string;
  families: readonly SyllableFamily[];
}) {
  const [selected, setSelected] = useState(0);
  const panelId = useId();
  if (families.length === 0) return null;
  const family = families[selected] ?? families[0]!;
  const { syllable } = family;

  return (
    <section aria-labelledby={`${panelId}-heading`} className="space-y-3">
      <div>
        <h2 id={`${panelId}-heading`} className="text-lg font-bold">
          {t.vocabDetail.morpheme.heading}
        </h2>
        <p className="text-sm text-muted-foreground">{t.vocabDetail.morpheme.hint}</p>
      </div>

      <div
        role="group"
        aria-label={t.vocabDetail.morpheme.tabsLabel}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {families.map((item, index) => (
          <button
            key={`${item.syllable.hanja}-${index}`}
            type="button"
            aria-pressed={index === selected}
            aria-controls={panelId}
            aria-label={t.vocabDetail.morpheme.tab(
              item.syllable.ko,
              item.syllable.hanja,
              item.syllable.hv,
            )}
            onClick={() => setSelected(index)}
            className={cn(
              "min-h-11 rounded-xl border-2 p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
              index === selected
                ? "border-primary bg-brand-soft"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span lang="ko" className="block text-3xl leading-none font-bold">
              {item.syllable.hanja}
            </span>
            <span className="mt-1.5 flex items-baseline gap-2">
              <span lang="ko" className="text-base font-semibold">
                {item.syllable.ko}
              </span>
              <span className="text-sm font-medium italic">{item.syllable.hv}</span>
            </span>
            {item.syllable.meaning_vi ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.syllable.meaning_vi}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div id={panelId} className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">
            {t.vocabDetail.morpheme.familyHeading(syllable.hanja)}
          </h3>
          <Link
            href={`/${program}/ly-thuyet/tu-vung/han-tu/${encodeURIComponent(syllable.hanja)}`}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t.vocabDetail.morpheme.viewHanja(syllable.hanja)}
          </Link>
        </div>
        {family.alt_hv.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.vocabDetail.morpheme.altHv(family.alt_hv.join(", "))}
          </p>
        ) : null}
        {family.words.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.vocabDetail.morpheme.familyEmpty}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {family.words.map((member) => (
              <FamilyWord
                key={member.id}
                program={program}
                member={member}
                hanja={syllable.hanja}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
