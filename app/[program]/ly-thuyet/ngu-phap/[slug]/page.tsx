import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { GrammarDetailView } from "@/components/lexicon/grammar-detail";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { getGrammarList, getGrammarPoint } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; slug: string }> };

/** Sinh sẵn mọi điểm ngữ pháp; slug lạ trả 404 lúc chạy. Cần ≥ 1 phần tử (cacheComponents). */
export async function generateStaticParams() {
  const params: { program: string; slug: string }[] = [];
  for (const program of PROGRAMS.filter(isProgramOpen)) {
    for (const point of await getGrammarList(program.slug)) {
      params.push({ program: program.slug, slug: point.slug });
    }
  }
  return params;
}

async function resolve(params: Props["params"]) {
  const { program, slug } = await params;
  const resolvedProgram = requireProgram(program);
  const point = await getGrammarPoint(resolvedProgram.slug, slug);
  if (!point) notFound();
  return { program: resolvedProgram, point };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, point } = await resolve(params);
  return {
    title: `${t.grammarDetail.pageTitle(point.pattern)} ${program.name}`,
    description: point.meaning_vi,
  };
}

export default async function GrammarPointPage({ params }: Props) {
  const { program, point } = await resolve(params);

  return (
    <TheoryShell
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.grammar.title, href: `/${program.slug}/ly-thuyet/ngu-phap` },
        { label: point.pattern },
      ]}
    >
      <GrammarDetailView program={program.slug} point={point} />
    </TheoryShell>
  );
}
