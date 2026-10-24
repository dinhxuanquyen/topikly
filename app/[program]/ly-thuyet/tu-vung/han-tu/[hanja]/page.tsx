import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { FalseFriendTag, LevelTag } from "@/components/lexicon/badges";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { getHanjaFamily, getHanjaList } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; hanja: string }> };

export async function generateStaticParams() {
  const params: { program: string; hanja: string }[] = [];
  for (const program of PROGRAMS.filter(isProgramOpen)) {
    for (const entry of await getHanjaList(program.slug)) {
      params.push({ program: program.slug, hanja: entry.hanja });
    }
  }
  return params;
}

/** Segment URL có thể còn dạng %-encoded; giải mã an toàn (chuỗi hỏng thì giữ nguyên). */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function resolve(params: Props["params"]) {
  const { program, hanja } = await params;
  const resolvedProgram = requireProgram(program);
  const family = await getHanjaFamily(resolvedProgram.slug, decodeSegment(hanja));
  if (!family) notFound();
  return { program: resolvedProgram, family };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, family } = await resolve(params);
  const readings = family.readings.map((r) => t.hanja.reading(r.ko, r.hv)).join("; ");
  return {
    title: `${t.hanja.pageTitle(family.hanja)} ${program.name}`,
    description: t.hanja.pageDescription(family.hanja, readings),
  };
}

export default async function HanjaPage({ params }: Props) {
  const { program, family } = await resolve(params);
  const base = `/${program.slug}/ly-thuyet/tu-vung`;

  return (
    <TheoryShell
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.vocab.title, href: base },
        { label: t.hanja.title, href: `${base}/han-tu` },
        { label: family.hanja },
      ]}
    >
      <header className="mb-6">
        <h1 lang="ko" className="text-6xl leading-none font-bold">
          <span className="sr-only">{t.hanja.pageTitle("")}</span>
          {family.hanja}
        </h1>
      </header>

      <section aria-labelledby="readings-heading" className="mb-6 space-y-3">
        <h2 id="readings-heading" className="text-lg font-bold">
          {t.hanja.readingsHeading}
        </h2>
        <ul className="space-y-2">
          {family.readings.map((reading) => (
            <li
              key={`${reading.ko}-${reading.hv}`}
              className="rounded-xl border border-border bg-card p-3"
            >
              <p className="text-lg">
                <span lang="ko" className="font-bold">
                  {reading.ko}
                </span>{" "}
                <span className="font-medium italic">{reading.hv}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t.hanja.meaningLine(reading.meaning_vi)}
              </p>
              {reading.alt_hv.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.hanja.altHv(reading.alt_hv.join(", "))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="words-heading" className="space-y-3">
        <h2 id="words-heading" className="text-lg font-bold">
          {t.hanja.wordsHeading(family.hanja)}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {family.words.map((word) => (
            <li key={word.id}>
              <Link
                href={`${base}/${word.id}`}
                className="block h-full rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
                <span className="mt-0.5 block text-sm">{word.meaning_vi}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span lang="ko">{t.vocabDetail.morpheme.familyWordSound(word.ko, word.hv)}</span>
                  <LevelTag level={word.level} />
                  {word.false_friend_kind ? <FalseFriendTag kind={word.false_friend_kind} /> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </TheoryShell>
  );
}
