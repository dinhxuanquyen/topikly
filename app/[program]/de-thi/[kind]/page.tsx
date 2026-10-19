import type { Metadata } from "next";
import { requireExamKind, requireProgram } from "@/components/config/route-guards";
import { EXAM_KINDS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { LinkCard } from "@/components/placeholder/link-card";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; kind: string }> };

export function generateStaticParams() {
  return EXAM_KINDS.map((kind) => ({ kind: kind.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program: programSlug, kind: kindSlug } = await params;
  const program = requireProgram(programSlug);
  const kind = requireExamKind(kindSlug);
  return { title: `${t.examKind.title(t.examKinds[kind.slug].name)} ${program.name}` };
}

export default async function ExamKindPage({ params }: Props) {
  const { program: programSlug, kind: kindSlug } = await params;
  const program = requireProgram(programSlug);
  const kind = requireExamKind(kindSlug);
  const kindName = t.examKinds[kind.slug].name;

  return (
    <PlaceholderPage
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.exams.title, href: `/${program.slug}/de-thi` },
        { label: kindName },
      ]}
      title={t.examKind.title(kindName)}
      description={t.examKinds[kind.slug].summary}
      planned={t.examKind.planned}
    >
      <section aria-labelledby="sample-exam-heading">
        <h2 id="sample-exam-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
          {t.examKind.sampleHeading}
        </h2>
        <LinkCard
          href={`/${program.slug}/de-thi/${kind.slug}/${kind.sampleExamId}`}
          title={t.examKind.examLabel(kind.sampleExamId)}
        />
      </section>
    </PlaceholderPage>
  );
}
