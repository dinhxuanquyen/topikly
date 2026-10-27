import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { TopiCat } from "@/components/brand/topi-cat";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import type { LandingQuestion } from "@/lib/landing/queries";
import { cn } from "@/lib/utils";
import { HeroStage } from "./hero-stage";

const L = t.landing;

/** Màn đầu: tiêu đề, một nút chính, một liên kết phụ; bên phải là câu làm thử thật. */
export function Hero({
  program,
  question,
  placementMinutes,
}: {
  program: string;
  question: LandingQuestion | null;
  placementMinutes: number;
}) {
  return (
    <section aria-labelledby="hero-title" className="bg-sky-50">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-10 pb-20 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pb-28">
        <div>
          <div className="flex items-center gap-3 lg:hidden">
            <TopiCat sparkles className="lp-float size-20" />
          </div>
          <h1 id="hero-title" className="lp-display mt-4 lg:mt-0 lg:whitespace-nowrap">
            {L.titleLines.map((line, i) => (
              <span
                key={line}
                className="lp-rise block"
                style={{ "--d": `${i * 90}ms` } as React.CSSProperties}
              >
                {line}
              </span>
            ))}
          </h1>
          <p
            className="lp-rise lp-lead mt-6 max-w-[34rem]"
            style={{ "--d": "200ms" } as React.CSSProperties}
          >
            {L.lead}
          </p>
          <div
            className="lp-rise mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
            style={{ "--d": "280ms" } as React.CSSProperties}
          >
            <Link
              href={`/${program}/luyen-tap`}
              className={cn(buttonVariants(), "h-14 px-8 text-lg")}
            >
              {L.ctaStart}
            </Link>
            <Link
              href={`/${program}/lo-trinh/test-trinh-do`}
              className="group inline-flex items-center gap-2 rounded-lg text-lg font-extrabold text-sky-600 outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {L.ctaPlacement(placementMinutes)}
              <ArrowRight
                aria-hidden
                className="size-5 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
          <ul
            className="lp-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base font-bold text-ink-600"
            style={{ "--d": "340ms" } as React.CSSProperties}
          >
            {L.proof.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <Check aria-hidden className="size-4 text-mint-700" strokeWidth={3} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {question ? (
          <div className="lp-rise" style={{ "--d": "160ms" } as React.CSSProperties}>
            <HeroStage program={program} question={question} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
