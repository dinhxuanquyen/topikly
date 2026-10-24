import type { Metadata } from "next";
import { BookA, BookOpenText, Languages, TriangleAlert, type LucideIcon } from "lucide-react";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { LexiconSearch } from "@/components/lexicon/lexicon-search";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { LinkCard } from "@/components/placeholder/link-card";
import {
  getCompareGroups,
  getGrammarFacets,
  getHanjaList,
  getVocabFacets,
} from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.theory.title} ${program.name}` };
}

interface Entry {
  key: string;
  href: string;
  title: string;
  summary: string;
  Icon: LucideIcon;
}

export default async function TheoryPage({ params }: Props) {
  const program = requireProgram((await params).program);
  const base = `/${program.slug}/ly-thuyet`;

  const [vocabFacets, grammarFacets, hanja, groups] = await Promise.all([
    getVocabFacets(program.slug),
    getGrammarFacets(program.slug),
    getHanjaList(program.slug),
    getCompareGroups(program.slug),
  ]);

  const entries: Entry[] = [];
  if (vocabFacets && vocabFacets.total > 0) {
    entries.push({
      key: "vocab",
      href: `${base}/tu-vung`,
      title: t.theory.sections.vocab.title,
      summary: t.theory.sections.vocab.summary(vocabFacets.total),
      Icon: BookA,
    });
    if (hanja.length > 0) {
      entries.push({
        key: "hanja",
        href: `${base}/tu-vung/han-tu`,
        title: t.theory.sections.hanja.title,
        summary: t.theory.sections.hanja.summary(hanja.length),
        Icon: Languages,
      });
    }
  }
  if (grammarFacets && grammarFacets.total > 0) {
    entries.push({
      key: "grammar",
      href: `${base}/ngu-phap`,
      title: t.theory.sections.grammar.title,
      summary: t.theory.sections.grammar.summary(grammarFacets.total, groups.length),
      Icon: BookOpenText,
    });
  }
  if (vocabFacets && vocabFacets.false_friend_count > 0) {
    entries.push({
      key: "falseFriends",
      href: `${base}/tu-vung?ban-gia=1`,
      title: t.theory.sections.falseFriends.title,
      summary: t.theory.sections.falseFriends.summary(vocabFacets.false_friend_count),
      Icon: TriangleAlert,
    });
  }

  return (
    <TheoryShell
      wide
      program={program.slug}
      breadcrumb={[{ label: program.name, href: `/${program.slug}` }, { label: t.theory.title }]}
      title={t.theory.title}
      description={t.theory.description}
    >
      <div className="space-y-8">
        <section aria-labelledby="learn-heading">
          <h2 id="learn-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
            {t.theory.learnHeading}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <LinkCard
                key={entry.key}
                href={entry.href}
                title={entry.title}
                summary={entry.summary}
                Icon={entry.Icon}
              />
            ))}
          </div>
        </section>

        <LexiconSearch program={program.slug} />

        <section aria-labelledby="coming-heading">
          <h2 id="coming-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
            {t.theory.comingHeading}
          </h2>
          <ul className="space-y-2">
            {t.theory.planned.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </TheoryShell>
  );
}
