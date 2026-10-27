import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { ExamRunner } from "@/components/exam/exam-runner";
import { PracticePageShell } from "@/components/practice/page-shell";
import { getPlacementExam } from "@/lib/exam/queries";
import { getPracticeTypes } from "@/lib/practice/queries";
import { PRACTICE_SKILLS } from "@/lib/practice/types";
import { findProgram } from "@/lib/db/programs";
import { cn } from "@/lib/utils";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.placement.title} · ${t.roadmap.title} ${program.name}` };
}

export default async function PlacementPage({ params }: Props) {
  const program = requireProgram((await params).program);
  const roadmapHref = `/${program.slug}/lo-trinh`;
  const breadcrumb = [
    { label: program.name, href: `/${program.slug}` },
    { label: t.roadmap.title, href: roadmapHref },
    { label: t.placement.title },
  ];

  const exam = await getPlacementExam(program.slug);

  if (!exam) {
    return (
      <PracticePageShell
        wide
        breadcrumb={breadcrumb}
        title={t.placement.title}
        description={t.placement.description}
      >
        <section
          aria-labelledby="placement-unavailable"
          className="rounded-xl border border-dashed border-border bg-muted/40 p-4"
        >
          <h2 id="placement-unavailable" className="font-semibold">
            {t.placement.unavailableTitle}
          </h2>
          <p className="mt-1 text-sm">{t.placement.unavailable}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/${program.slug}/luyen-tap`}
              className={cn(buttonVariants(), "h-11 px-5 text-base")}
            >
              {t.placement.unavailablePractice}
            </Link>
            <Link
              href={roadmapHref}
              className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5 text-base")}
            >
              {t.placement.unavailableRoadmap}
            </Link>
          </div>
        </section>
      </PracticePageShell>
    );
  }

  // Dạng nào đã có câu luyện: trang kết quả chỉ gắn "Luyện dạng này" tới trang tồn tại.
  const practiceTypeCodes: string[] = [];
  for (const skill of exam.skills) {
    if (skill === "writing" || !PRACTICE_SKILLS.includes(skill)) continue;
    for (const type of await getPracticeTypes(program.slug, skill)) {
      practiceTypeCodes.push(type.type_code);
    }
  }

  return (
    <PracticePageShell
      wide
      breadcrumb={breadcrumb}
      title={t.placement.title}
      description={t.placement.description}
    >
      <ExamRunner
        exam={exam}
        practiceTypeCodes={practiceTypeCodes}
        listHref={roadmapHref}
        passRatio={findProgram(program.slug)?.placement.band_pass_ratio}
      />
    </PracticePageShell>
  );
}
