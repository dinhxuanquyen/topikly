import type { Metadata } from "next";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { TheoryShell } from "@/components/lexicon/theory-shell";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.sources.title} ${program.name}`, description: t.sources.description };
}

/** Trang "Nguồn và ghi công" theo docs/vocab-grammar-spec.md mục 9.2. */
export default async function SourcesPage({ params }: Props) {
  const program = requireProgram((await params).program);

  return (
    <TheoryShell
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.sources.title },
      ]}
      title={t.sources.title}
      description={t.sources.description}
    >
      <div className="space-y-6">
        <section
          aria-labelledby="attribution-heading"
          className="rounded-xl border-2 border-primary/30 bg-brand-soft p-4"
        >
          <h2 id="attribution-heading" className="text-base font-semibold">
            {t.sources.attributionHeading}
          </h2>
          <p className="mt-2 leading-relaxed">{t.sources.attribution}</p>
        </section>

        <section aria-labelledby="sources-heading" className="space-y-2">
          <h2 id="sources-heading" className="text-base font-semibold">
            {t.sources.sourcesHeading}
          </h2>
          <ul aria-label={t.sources.sourcesListLabel} className="space-y-2">
            {t.sources.sourceItems.map((source) => (
              <li key={source.name} className="rounded-xl border border-border bg-card p-3">
                <p>
                  <span lang="ko" className="font-bold">
                    {source.name}
                  </span>{" "}
                  <span lang="ko" className="text-sm text-muted-foreground">
                    ({source.org})
                  </span>
                </p>
                <p className="text-sm">{source.use}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-heading" className="space-y-2">
          <h2 id="how-heading" className="text-base font-semibold">
            {t.sources.howHeading}
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {t.sources.how.map((item) => (
              <li key={item} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="status-heading" className="space-y-2">
          <h2 id="status-heading" className="text-base font-semibold">
            {t.sources.statusHeading}
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {t.sources.status.map((item) => (
              <li key={item} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </TheoryShell>
  );
}
