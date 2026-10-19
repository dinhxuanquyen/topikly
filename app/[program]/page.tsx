import type { Metadata } from "next";
import { PILLAR_KEYS, pillarHref } from "@/components/config/pillars";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { PILLAR_ICONS } from "@/components/nav/pillar-icons";
import { LinkCard } from "@/components/placeholder/link-card";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: t.programOverview.title(program.name) };
}

export default async function ProgramOverviewPage({ params }: Props) {
  const program = requireProgram((await params).program);

  return (
    <PlaceholderPage
      title={t.programOverview.title(program.name)}
      description={t.programOverview.description(program.name)}
    >
      <section aria-labelledby="explore-heading">
        <h2 id="explore-heading" className="sr-only">
          {t.common.exploreHeading}
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
    </PlaceholderPage>
  );
}
