import type { Metadata } from "next";
import { requireProgram, requireSkill, requireTypeCode } from "@/components/config/route-guards";
import { SKILLS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; skill: string; type: string }> };

export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skill: skill.slug, type: skill.sampleType }));
}

async function resolve(params: Props["params"]) {
  const { program, skill, type } = await params;
  const resolvedSkill = requireSkill(skill);
  return {
    program: requireProgram(program),
    skill: resolvedSkill,
    code: requireTypeCode(resolvedSkill, type),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, code } = await resolve(params);
  return { title: `${t.practiceType.title(code)} ${program.name}` };
}

export default async function PracticeTypePage({ params }: Props) {
  const { program, skill, code } = await resolve(params);
  const skillName = t.skills[skill.slug].name;

  return (
    <PlaceholderPage
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.practice.title, href: `/${program.slug}/luyen-tap` },
        { label: skillName, href: `/${program.slug}/luyen-tap/${skill.slug}` },
        { label: code },
      ]}
      title={t.practiceType.title(code)}
      description={t.practiceType.description(skillName)}
      planned={t.practiceType.planned}
    />
  );
}
