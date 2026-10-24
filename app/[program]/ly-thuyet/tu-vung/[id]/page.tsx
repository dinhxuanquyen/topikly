import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { VocabDetailView } from "@/components/lexicon/vocab-detail";
import { getVocabList, getVocabWord } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; id: string }> };

/**
 * Sinh sẵn mọi từ của các chương trình đang mở. Id lạ trả 404 lúc chạy (`notFound()`).
 * Với cacheComponents phải trả ít nhất một phần tử: cần có ít nhất một từ trong content/.
 */
export async function generateStaticParams() {
  const params: { program: string; id: string }[] = [];
  for (const program of PROGRAMS.filter(isProgramOpen)) {
    for (const word of await getVocabList(program.slug)) {
      params.push({ program: program.slug, id: word.id });
    }
  }
  return params;
}

async function resolve(params: Props["params"]) {
  const { program, id } = await params;
  const resolvedProgram = requireProgram(program);
  const detail = await getVocabWord(resolvedProgram.slug, id);
  if (!detail) notFound();
  return { program: resolvedProgram, detail };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, detail } = await resolve(params);
  return {
    title: `${t.vocabDetail.pageTitle(detail.word.hangul)} ${program.name}`,
    description: detail.word.meaning_vi,
  };
}

export default async function VocabWordPage({ params }: Props) {
  const { program, detail } = await resolve(params);

  return (
    <TheoryShell
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.vocab.title, href: `/${program.slug}/ly-thuyet/tu-vung` },
        { label: detail.word.hangul },
      ]}
    >
      <VocabDetailView program={program.slug} detail={detail} />
    </TheoryShell>
  );
}
