import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DEFAULT_PROGRAM } from "@/components/config/programs";
import { PILLAR_KEYS, pillarHref } from "@/components/config/pillars";
import { t } from "@/components/i18n";
import { PILLAR_ICONS } from "@/components/nav/pillar-icons";
import { LinkCard } from "@/components/placeholder/link-card";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const program = DEFAULT_PROGRAM;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-brand-soft">
        <span
          aria-hidden
          lang="ko"
          className="pointer-events-none absolute -right-4 -bottom-10 text-[9rem] leading-none font-black text-primary/10 select-none md:right-12 md:text-[14rem]"
        >
          토픽
        </span>
        <div className="relative mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-20">
          <p className="mb-3 text-sm font-semibold text-brand-soft-foreground">{t.brand.tagline}</p>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {t.landing.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-pretty text-foreground/80 md:text-lg">
            {t.landing.lead(program.name)}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${program.slug}`}
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
            >
              {t.landing.ctaProgram(program.name)}
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
            <Link
              href={`/${program.slug}/luyen-tap`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-6 text-base",
              )}
            >
              {t.landing.ctaTry}
            </Link>
          </div>
          <p className="mt-4 max-w-xl text-sm text-foreground/75">{t.landing.guestNote}</p>
        </div>
      </section>

      <section
        aria-labelledby="values-heading"
        className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14"
      >
        <h2 id="values-heading" className="mb-5 text-xl font-bold md:text-2xl">
          {t.landing.valuesHeading}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {t.landing.values.map((value) => (
            <li key={value.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">{value.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{value.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="pillars-heading"
        className="mx-auto w-full max-w-4xl px-4 pb-12 md:px-6 md:pb-16"
      >
        <h2 id="pillars-heading" className="mb-5 text-xl font-bold md:text-2xl">
          {t.landing.pillarsHeading}
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
    </>
  );
}
