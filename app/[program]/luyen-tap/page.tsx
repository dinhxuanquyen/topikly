import type { Metadata } from "next";
import { BookOpenText, Headphones, PenLine, type LucideIcon } from "lucide-react";
import { requireProgram } from "@/components/config/route-guards";
import { SKILLS, type SkillSlug } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { LinkCard } from "@/components/placeholder/link-card";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

const SKILL_ICONS: Record<SkillSlug, LucideIcon> = {
  nghe: Headphones,
  doc: BookOpenText,
  viet: PenLine,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.practice.title} ${program.name}` };
}

export default async function PracticePage({ params }: Props) {
  const program = requireProgram((await params).program);

  return (
    <PlaceholderPage
      breadcrumb={[{ label: program.name, href: `/${program.slug}` }, { label: t.practice.title }]}
      title={t.practice.title}
      description={t.practice.description}
      planned={t.practice.planned}
    >
      <section aria-labelledby="skills-heading">
        <h2 id="skills-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
          {t.practice.skillHeading}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SKILLS.map((skill) => (
            <LinkCard
              key={skill.slug}
              href={`/${program.slug}/luyen-tap/${skill.slug}`}
              title={t.skills[skill.slug].name}
              ko={t.skills[skill.slug].ko}
              Icon={SKILL_ICONS[skill.slug]}
            />
          ))}
        </div>
      </section>
    </PlaceholderPage>
  );
}
