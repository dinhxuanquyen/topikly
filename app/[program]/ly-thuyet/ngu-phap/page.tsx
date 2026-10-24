import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { GrammarBrowser } from "@/components/lexicon/grammar-browser";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { getCompareGroups, getGrammarFacets, getGrammarList } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.grammar.title} ${program.name}`, description: t.grammar.description };
}

/** Danh sách ngữ pháp: tải một lần rồi lọc ở client (cấp, chức năng, nhóm); bộ lọc nằm trên URL. */
export default async function GrammarListPage({ params }: Props) {
  const program = requireProgram((await params).program);
  const [facets, points, groups] = await Promise.all([
    getGrammarFacets(program.slug),
    getGrammarList(program.slug),
    getCompareGroups(program.slug),
  ]);
  if (!facets) notFound();

  return (
    <TheoryShell
      wide
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.grammar.title },
      ]}
      title={t.grammar.title}
      description={t.grammar.description}
    >
      <GrammarBrowser program={program.slug} points={points} facets={facets} groups={groups} />
    </TheoryShell>
  );
}
