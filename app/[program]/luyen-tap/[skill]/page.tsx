import type { Metadata } from "next";
import { requireProgram, requireSkill } from "@/components/config/route-guards";
import { SKILLS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { PracticePageShell } from "@/components/practice/page-shell";
import { PracticeTypeCard } from "@/components/practice/practice-type-card";
import { getPracticeTypes } from "@/lib/practice/queries";
import { getWritingTypes } from "@/lib/practice/writing-queries";

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
  const breadcrumb = [
    { label: program.name, href: `/${program.slug}` },
    { label: t.practice.title, href: `/${program.slug}/luyen-tap` },
    { label: skillName },
  ];

  if (skill.code === "writing") {
    const writingTypes = await getWritingTypes(program.slug);
    return (
      <PracticePageShell
        wide
        breadcrumb={breadcrumb}
        title={t.practiceSkill.title(skillName)}
        description={t.practiceSkill.description(skillName)}
      >
        <section aria-labelledby="types-heading">
          <h2 id="types-heading" className="mb-1 text-sm font-semibold text-muted-foreground">
            {t.writingSkill.typesHeading}
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">{t.writingSkill.guestNote}</p>
          {writingTypes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
              {t.writingSkill.empty}
            </p>
          ) : (
            <ul aria-label={t.writingSkill.typeListLabel} className="grid gap-3 sm:grid-cols-2">
              {writingTypes.map((type) => (
                <li key={type.type_code}>
                  <PracticeTypeCard
                    program={program.slug}
                    skillSlug={skill.slug}
                    type={type}
                    countLabel={t.writingSkill.promptCount(type.question_count)}
                    footer={
                      <span className="block min-h-10 text-sm text-muted-foreground">
                        {type.format === "essay" && type.char_limit
                          ? `${t.writingSkill.formatEssay}: ${t.writingSkill.charLimit(type.char_limit.min, type.char_limit.max)}`
                          : t.writingSkill.formatFillBlanks}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </PracticePageShell>
    );
  }

  const types = await getPracticeTypes(program.slug, skill.code);

  return (
    <PracticePageShell
      wide
      breadcrumb={breadcrumb}
      title={t.practiceSkill.title(skillName)}
      description={t.practiceSkill.description(skillName)}
    >
      <section aria-labelledby="types-heading">
        <h2 id="types-heading" className="mb-1 text-sm font-semibold text-muted-foreground">
          {t.practiceSkill.typesHeading}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">{t.practiceSkill.guestNote}</p>
        {types.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
            {t.practiceSkill.empty}
          </p>
        ) : (
          <ul
            aria-label={t.practiceSkill.typeListLabel(skillName)}
            className="grid gap-3 sm:grid-cols-2"
          >
            {types.map((type) => (
              <li key={type.type_code}>
                <PracticeTypeCard program={program.slug} skillSlug={skill.slug} type={type} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PracticePageShell>
  );
}
