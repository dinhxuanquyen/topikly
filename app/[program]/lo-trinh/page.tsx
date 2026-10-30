import type { Metadata } from "next";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { PlacementCard } from "@/components/exam/placement-card";
import { PracticePageShell } from "@/components/practice/page-shell";
import { StudyPlanner } from "@/components/planner/study-planner";
import { getPlacementExam } from "@/lib/exam/queries";
import { getPlannerCatalog } from "@/lib/planner/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.roadmap.title} ${program.name}` };
}

export default async function RoadmapPage({ params }: Props) {
  const program = requireProgram((await params).program);
  const [exam, catalog] = await Promise.all([
    getPlacementExam(program.slug),
    getPlannerCatalog(program.slug),
  ]);

  return (
    <PracticePageShell
      wide
      breadcrumb={[{ label: program.name, href: `/${program.slug}` }, { label: t.roadmap.title }]}
      title={t.roadmap.title}
      description={t.roadmap.description}
    >
      <div className="space-y-8">
        <StudyPlanner program={program.slug} catalog={catalog} placementExamId={exam?.id ?? null} />
        <PlacementCard
          program={program.slug}
          exam={
            exam
              ? {
                  id: exam.id,
                  question_count: exam.question_count,
                  duration_sec: exam.duration_sec,
                }
              : null
          }
          href={`/${program.slug}/lo-trinh/test-trinh-do`}
        />
      </div>
    </PracticePageShell>
  );
}
