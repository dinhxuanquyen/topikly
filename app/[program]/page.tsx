import type { Metadata } from "next";
import { PILLAR_KEYS, pillarHref } from "@/components/config/pillars";
import { requireProgram } from "@/components/config/route-guards";
import { SKILLS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { PILLAR_ICONS } from "@/components/nav/pillar-icons";
import { LinkCard } from "@/components/placeholder/link-card";
import { TodayPanel, type TodayType } from "@/components/today/today-panel";
import { getPracticeTypes } from "@/lib/practice/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: t.programOverview.title(program.name) };
}

/**
 * Trang tổng quan chương trình = màn "Hôm nay" (Figma "Di động — Hôm nay"): mục tiêu ngày,
 * học tiếp, các dạng tiếp theo; bên dưới là năm trụ để khám phá.
 */
export default async function ProgramOverviewPage({ params }: Props) {
  const program = requireProgram((await params).program);
  // Đọc trước, Nghe sau: thứ tự gợi ý học tiếp.
  const order = ["doc", "nghe"] as const;
  const types: TodayType[] = [];
  for (const slug of order) {
    const skill = SKILLS.find((s) => s.slug === slug)!;
    for (const type of await getPracticeTypes(
      program.slug,
      skill.code as "reading" | "listening",
    )) {
      types.push({
        type_code: type.type_code,
        skill_slug: slug,
        skill_name: t.skills[slug].name,
        name_vi: type.name_vi,
        question_count: type.question_count,
      });
    }
  }

  return (
    <article className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 md:px-6 md:py-10">
      <h1 className="mb-4 text-3xl font-black tracking-tight md:mb-6">
        {t.today.heading}
        <span className="sr-only"> · {program.name}</span>
      </h1>
      <TodayPanel program={program.slug} types={types} />

      <section aria-labelledby="explore-heading" className="mt-10">
        <h2 id="explore-heading" className="mb-3 text-xl font-extrabold">
          {t.today.exploreHeading}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PILLAR_KEYS.map((key) => (
            <LinkCard
              key={key}
              href={pillarHref(key, program.slug)}
              title={t.nav.pillars[key]}
              summary={t.pillarSummaries[key]}
              Icon={PILLAR_ICONS[key]}
            />
          ))}
        </div>
      </section>
    </article>
  );
}
