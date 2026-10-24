import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { CompareGroupView } from "@/components/lexicon/compare-group-view";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { getCompareGroup, getCompareGroups } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; slug: string }> };

/**
 * Sinh sẵn mọi nhóm so sánh. Với cacheComponents phải trả ít nhất một phần tử: cần có ít nhất
 * một nhóm trong content/.
 */
export async function generateStaticParams() {
  const params: { program: string; slug: string }[] = [];
  for (const program of PROGRAMS.filter(isProgramOpen)) {
    for (const group of await getCompareGroups(program.slug)) {
      params.push({ program: program.slug, slug: group.slug });
    }
  }
  return params;
}

async function resolve(params: Props["params"]) {
  const { program, slug } = await params;
  const resolvedProgram = requireProgram(program);
  const group = await getCompareGroup(resolvedProgram.slug, slug);
  if (!group) notFound();
  return { program: resolvedProgram, group };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, group } = await resolve(params);
  return { title: `${t.compare.pageTitle(group.title_vi)} ${program.name}` };
}

export default async function CompareGroupPage({ params }: Props) {
  const { program, group } = await resolve(params);

  return (
    <TheoryShell
      wide
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.grammar.title, href: `/${program.slug}/ly-thuyet/ngu-phap` },
        { label: group.title_vi.split(":")[0]!.trim() },
      ]}
    >
      <CompareGroupView program={program.slug} group={group} />
    </TheoryShell>
  );
}
