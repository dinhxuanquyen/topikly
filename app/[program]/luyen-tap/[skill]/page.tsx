import type { Metadata } from "next";
import { requireProgram, requireSkill } from "@/components/config/route-guards";
import { SKILLS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { LinkCard } from "@/components/placeholder/link-card";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; skill: string }> };

export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skill: skill.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program: programSlug, skill: skillSlug } = await params;
  const program = requireProgram(programSlug);
  const skill = requireSkill(skillSlug);
  return { title: `${t.practiceSkill.title(t.skills[skill.slug].name)} ${program.name}` };
}

export default async function PracticeSkillPage({ params }: Props) {
  const { program: programSlug, skill: skillSlug } = await params;
  const program = requireProgram(programSlug);
  const skill = requireSkill(skillSlug);
  const skillName = t.skills[skill.slug].name;

  return (
    <PlaceholderPage
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.practice.title, href: `/${program.slug}/luyen-tap` },
        { label: skillName },
      ]}
      title={t.practiceSkill.title(skillName)}
      description={t.practiceSkill.description(skillName)}
      planned={t.practiceSkill.planned}
    >
      <section aria-labelledby="sample-type-heading">
        <h2 id="sample-type-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
          {t.practiceSkill.sampleTypeHeading}
        </h2>
        <LinkCard
          href={`/${program.slug}/luyen-tap/${skill.slug}/${skill.sampleType}`}
          title={t.practiceType.title(skill.sampleType)}
        />
      </section>
    </PlaceholderPage>
  );
}
