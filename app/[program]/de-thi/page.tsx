import type { Metadata } from "next";
import { FileText, Gauge, Monitor, Timer, type LucideIcon } from "lucide-react";
import { requireProgram } from "@/components/config/route-guards";
import { EXAM_KINDS, type ExamKindSlug } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { LinkCard } from "@/components/placeholder/link-card";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

const KIND_ICONS: Record<ExamKindSlug, LucideIcon> = {
  full: FileText,
  mini: Timer,
  hard: Gauge,
  ibt: Monitor,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.exams.title} ${program.name}` };
}

export default async function ExamsPage({ params }: Props) {
  const program = requireProgram((await params).program);

  return (
    <PlaceholderPage
      breadcrumb={[{ label: program.name, href: `/${program.slug}` }, { label: t.exams.title }]}
      title={t.exams.title}
      description={t.exams.description}
      planned={t.exams.planned}
    >
      <section aria-labelledby="kinds-heading">
        <h2 id="kinds-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
          {t.exams.kindHeading}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAM_KINDS.map((kind) => (
            <LinkCard
              key={kind.slug}
              href={`/${program.slug}/de-thi/${kind.slug}`}
              title={t.examKinds[kind.slug].name}
              summary={t.examKinds[kind.slug].summary}
              Icon={KIND_ICONS[kind.slug]}
            />
          ))}
        </div>
      </section>
    </PlaceholderPage>
  );
}
