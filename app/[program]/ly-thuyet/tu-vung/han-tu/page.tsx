import type { Metadata } from "next";
import Link from "next/link";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { getHanjaList } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.hanja.title} ${program.name}`, description: t.hanja.description };
}

export default async function HanjaListPage({ params }: Props) {
  const program = requireProgram((await params).program);
  const entries = await getHanjaList(program.slug);

  return (
    <TheoryShell
      wide
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.vocab.title, href: `/${program.slug}/ly-thuyet/tu-vung` },
        { label: t.hanja.title },
      ]}
      title={t.hanja.title}
      description={t.hanja.description}
    >
      <ul
        aria-label={t.hanja.listLabel}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      >
        {entries.map((entry) => {
          const readings = entry.readings.map((r) => t.hanja.reading(r.ko, r.hv)).join("; ");
          return (
            <li key={entry.hanja}>
              <Link
                href={`/${program.slug}/ly-thuyet/tu-vung/han-tu/${encodeURIComponent(entry.hanja)}`}
                aria-label={t.hanja.itemLabel(entry.hanja, readings, entry.word_count)}
                className="block h-full rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span lang="ko" className="block text-4xl leading-none font-bold">
                  {entry.hanja}
                </span>
                <span className="mt-2 block space-y-0.5 text-sm">
                  {entry.readings.map((r) => (
                    <span key={`${r.ko}-${r.hv}`} className="block">
                      <span lang="ko" className="font-semibold">
                        {r.ko}
                      </span>{" "}
                      <span className="italic">{r.hv}</span>
                    </span>
                  ))}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t.hanja.wordCount(entry.word_count)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </TheoryShell>
  );
}
