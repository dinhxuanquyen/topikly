import Link from "next/link";
import {
  ArrowRight,
  BellOff,
  Check,
  CircleCheck,
  Flame,
  Lightbulb,
  Lock,
  PanelTop,
  Star,
  X,
} from "lucide-react";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { TopiCat } from "@/components/brand/topi-cat";
import { PILLAR_KEYS, pillarHref } from "@/components/config/pillars";
import { PROGRAMS } from "@/components/config/programs";
import { choiceNumber } from "@/components/practice/choice-list";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { PILLAR_ICONS } from "@/components/nav/pillar-icons";
import type { BlogPostSummary } from "@/lib/blog/types";
import type { LandingData } from "@/lib/landing/queries";
import { cn } from "@/lib/utils";

const L = t.landing;
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
const frame = "mx-auto w-full max-w-7xl px-4 md:px-6";

function SectionHead({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="max-w-3xl">
      <h2 id={id} data-reveal className="lp-h2">
        {title}
      </h2>
      {lead ? (
        <p data-reveal style={delay(80)} className="lp-lead mt-4">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ con số

export function NumberStrip({
  typeCount,
  trapCount,
  placementMinutes,
}: {
  typeCount: number;
  trapCount: number;
  placementMinutes: number;
}) {
  const items = [
    [String(typeCount), L.numbers.types],
    [String(trapCount), L.numbers.traps],
    ["4", L.numbers.choices],
    [`${placementMinutes}'`, L.numbers.placement],
  ];
  return (
    <section aria-labelledby="numbers-heading" className={cn(frame, "py-16 md:py-20")}>
      <h2 id="numbers-heading" className="sr-only">
        {L.numbers.heading}
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {items.map(([n, label], i) => (
          <li
            key={label}
            data-reveal
            style={delay(i * 70)}
            className="rounded-3xl bg-sky-50 p-5 md:p-6"
          >
            <p className="lp-tabular text-5xl font-black tracking-tight text-sky-600">{n}</p>
            <p className="mt-2 text-base leading-snug font-bold">{label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ chế độ tập trung

const FOCUS_ICONS = [PanelTop, BellOff, Lightbulb];

export function FocusSection({ question }: { question: LandingData["question"] }) {
  const first = question?.choices.slice(0, 2) ?? [];
  return (
    <section aria-labelledby="focus-heading" className="bg-sky-50">
      <div className={cn(frame, "grid items-center gap-12 py-24 md:py-28 lg:grid-cols-2")}>
        <div>
          <SectionHead id="focus-heading" title={L.focus.heading} lead={L.focus.lead} />
          <ul className="mt-8 grid gap-5">
            {L.focus.items.map(([title, body], i) => {
              const Icon = FOCUS_ICONS[i];
              return (
                <li key={title} data-reveal style={delay(120 + i * 80)} className="flex gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background text-sky-600">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <span>
                    <span className="lp-title block">{title}</span>
                    <span className="mt-1 block text-lg leading-relaxed">{body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Ảnh chụp tĩnh của màn làm bài, dựng bằng chính giao diện (không phải ảnh). */}
        <figure
          data-reveal
          style={delay(160)}
          aria-label={L.focus.mockLabel}
          data-ui
          className="rounded-[2rem] border-2 border-line bg-background p-6 md:p-8"
        >
          <div className="flex items-center gap-4" aria-hidden>
            <X className="size-5 text-ink-300" />
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-line">
              <span className="block h-full w-3/5 rounded-full bg-mint-500" />
            </span>
            <span className="text-sm font-bold text-ink-600">3 / 5</span>
          </div>
          <p className="lp-title mt-6">{L.focus.mockQuestion}</p>
          {question?.passage ? (
            <p lang="ko" className="mt-3 rounded-2xl bg-surface p-4 font-bold">
              {question.passage}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2.5" aria-hidden>
            {first.map((c, i) => (
              <div
                key={c.label}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 border-b-4 p-3",
                  i === 0 ? "border-sky-600 bg-sky-50" : "border-line",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg border-2 text-sm font-extrabold",
                    i === 0 ? "border-sky-600 text-sky-600" : "border-ink-300 text-ink-600",
                  )}
                >
                  {choiceNumber(c.label)}
                </span>
                <span lang="ko" className="text-base font-medium">
                  {c.text}
                </span>
              </div>
            ))}
          </div>
          <span
            aria-hidden
            className={cn(buttonVariants(), "pointer-events-none mt-5 h-12 w-full text-base")}
          >
            {t.landing.quiz.check}
          </span>
        </figure>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ bốn tính năng

function FeatureCard({
  tone,
  title,
  body,
  children,
  d,
}: {
  tone: "sky" | "plain";
  title: string;
  body: string;
  children: React.ReactNode;
  d: number;
}) {
  return (
    <article
      data-reveal
      style={delay(d)}
      className={cn(
        "flex flex-col gap-4 rounded-[2rem] border-b-[6px] p-6 md:p-8",
        tone === "sky" ? "border-sky-200 bg-sky-50" : "border-line bg-surface",
      )}
    >
      <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
      <p className="text-lg leading-relaxed">{body}</p>
      <div data-ui className="mt-auto rounded-3xl bg-background p-5">
        {children}
      </div>
    </article>
  );
}

export function Features({
  program,
  question,
  hanja,
}: {
  program: string;
  question: LandingData["question"];
  hanja: LandingData["hanja"];
}) {
  const F = L.features;
  const trap = question?.choices.find((c) => !c.correct && c.note_vi);
  return (
    <section aria-labelledby="features-heading" className={cn(frame, "py-24 md:py-32")}>
      <SectionHead id="features-heading" title={F.heading} lead={F.lead} />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <FeatureCard tone="sky" title={F.distractor.title} body={F.distractor.body} d={0}>
          {trap ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl border-2 border-b-4 border-coral-500 bg-coral-100 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-coral-500 text-white">
                  <X aria-hidden className="size-4" strokeWidth={3} />
                </span>
                <span lang="ko" className="text-base font-medium">
                  {trap.text}
                </span>
              </div>
              <p className="mt-3 text-base leading-relaxed">
                {trap.trap_name_vi ? (
                  <span className="mr-2 inline-block rounded-full bg-coral-100 px-2.5 py-0.5 text-sm font-extrabold text-coral-700">
                    {trap.trap_name_vi}
                  </span>
                ) : null}
                {trap.note_vi}
              </p>
            </>
          ) : null}
        </FeatureCard>

        <FeatureCard tone="plain" title={F.hanja.title} body={F.hanja.body} d={80}>
          <div className="flex flex-wrap items-center gap-3">
            <span
              lang="ko"
              className="grid size-20 place-items-center rounded-2xl bg-ink-900 text-4xl font-bold text-white"
            >
              {hanja?.hanja ?? "經"}
            </span>
            <span
              lang="ko"
              className="grid size-20 place-items-center rounded-2xl bg-sky-600 text-4xl font-bold text-white"
            >
              {hanja?.ko ?? "경"}
            </span>
            <span className="grid h-20 min-w-20 place-items-center rounded-2xl bg-sky-100 px-3 text-2xl font-extrabold text-sky-700">
              {hanja?.hv ?? "kinh"}
            </span>
          </div>
          {hanja && hanja.words.length > 0 ? (
            <>
              <p className="mt-4 text-sm font-bold text-ink-600">{F.hanja.family(hanja.hanja)}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {hanja.words.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/${program}/ly-thuyet/tu-vung/${w.id}`}
                      className="inline-flex items-baseline gap-2 rounded-xl bg-surface px-3 py-2 text-base font-bold transition-colors outline-none hover:bg-sky-100 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span lang="ko">{w.hangul}</span>
                      <span className="font-semibold text-ink-600">{w.han_viet}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </FeatureCard>

        <FeatureCard tone="plain" title={F.writing.title} body={F.writing.body} d={0}>
          <div
            aria-hidden
            className="grid grid-cols-[repeat(12,minmax(0,1fr))] overflow-hidden rounded-lg"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                lang="ko"
                className="grid aspect-[5/6] place-items-center border border-sky-200 text-base font-medium"
              >
                {F.writing.sample[i] ?? ""}
              </span>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap gap-2 text-sm font-extrabold">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
              {F.writing.count}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-3 py-1 text-mint-700">
              {F.writing.style} <Check aria-hidden className="size-3.5" strokeWidth={3} />
            </span>
          </p>
        </FeatureCard>

        <FeatureCard tone="sky" title={F.diagnose.title} body={F.diagnose.body} d={80}>
          <ul className="grid gap-4">
            {F.diagnose.rows.map(([label, pct], i) => (
              <li key={label}>
                <span className="flex justify-between text-sm font-bold">
                  <span>{label}</span>
                  <span className="lp-tabular text-ink-600">{pct}%</span>
                </span>
                <span className="mt-1.5 block h-3 overflow-hidden rounded-full bg-line">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      i === 0 ? "bg-coral-500" : i === 1 ? "bg-sky-300" : "bg-sky-600",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-600">{F.diagnose.sample}</p>
        </FeatureCard>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ lộ trình

const PATH_INDENT = ["md:ml-0", "md:ml-20", "md:ml-36", "md:ml-20", "md:ml-0"];

export function Roadmap({ program }: { program: string }) {
  const R = L.roadmap;
  return (
    <section aria-labelledby="roadmap-heading" className="bg-sky-50">
      <div className={cn(frame, "grid items-center gap-12 py-24 md:py-28 lg:grid-cols-2")}>
        <ol data-ui aria-label={R.pathLabel} className="order-2 grid gap-4 lg:order-1">
          {R.path.map(([state, label], i) => (
            <li
              key={label}
              data-reveal
              style={delay(i * 90)}
              className={cn("flex items-center gap-4", PATH_INDENT[i])}
            >
              <span
                className={cn(
                  "relative grid size-16 shrink-0 place-items-center rounded-full border-b-[6px]",
                  state === "done" && "border-sky-300 bg-sky-200 text-sky-700",
                  state === "current" && "lp-pulse border-sky-700 bg-sky-600 text-white",
                  state === "locked" && "border-ink-300 bg-line text-ink-300",
                )}
              >
                {state === "done" ? (
                  <Check aria-hidden className="size-7" strokeWidth={3} />
                ) : state === "current" ? (
                  <Star aria-hidden className="size-7 fill-white" />
                ) : (
                  <Lock aria-hidden className="size-6" />
                )}
                <span className="sr-only">{R.stateLabel[state]}: </span>
              </span>
              <span
                className={cn(
                  "text-lg font-bold",
                  state === "current" &&
                    "rounded-2xl border-2 border-sky-600 bg-background px-4 py-2 text-sky-700",
                  state === "locked" && "text-ink-600",
                )}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
        <div className="order-1 lg:order-2">
          <SectionHead id="roadmap-heading" title={R.heading} />
          <ul className="mt-6 grid gap-4">
            {R.items.map((item, i) => (
              <li
                key={item}
                data-reveal
                style={delay(80 + i * 70)}
                className="flex gap-3 text-lg font-bold"
              >
                <CircleCheck
                  aria-hidden
                  className="mt-0.5 size-6 shrink-0 fill-sky-600 text-white"
                />
                {item}
              </li>
            ))}
          </ul>
          <div data-reveal style={delay(300)} className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/${program}/lo-trinh/test-trinh-do`}
              className={cn(buttonVariants(), "h-12 px-6 text-base")}
            >
              {R.cta}
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-background px-4 py-2 text-base font-bold">
              <Flame aria-hidden className="size-5 fill-sun-400 text-sun-600" />
              {R.streak}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ năm trụ

export function Pillars({ program }: { program: string }) {
  return (
    <section aria-labelledby="pillars-heading" className={cn(frame, "py-24 md:py-32")}>
      <SectionHead id="pillars-heading" title={L.pillars.heading} lead={L.pillars.lead} />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PILLAR_KEYS.map((key, i) => {
          const Icon = PILLAR_ICONS[key];
          return (
            <li key={key} data-reveal style={delay(i * 60)}>
              <Link
                href={pillarHref(key, program)}
                className="group flex h-full flex-col gap-3 rounded-3xl border-2 border-b-[5px] border-line bg-card p-5 transition-[background-color,border-color,transform] duration-150 outline-none hover:border-sky-200 hover:bg-sky-50 focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-600">
                  <Icon aria-hidden className="size-6" />
                </span>
                <span className="lp-title flex items-center gap-1">
                  {t.nav.pillars[key]}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-sky-600 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                  />
                </span>
                <span className="text-base leading-relaxed">{t.pillarSummaries[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ cấp mục tiêu

const LEVEL_TONE = [
  "bg-sky-200 text-sky-700 border-sky-300",
  "bg-sky-300 text-ink-900 border-sky-500",
  "bg-sky-600 text-white border-sky-700",
  "bg-sky-700 text-white border-ink-900",
];

export function Levels({
  levels,
  totalMaxScore,
  sections,
}: Pick<LandingData, "levels" | "totalMaxScore" | "sections">) {
  const V = L.levels;
  const parts = sections
    .map((s) => `${V.skillNames[s.skill] ?? s.skill} ${s.max_score}`)
    .join(" · ");
  const top = Math.max(...levels.map((l) => l.min_score));
  return (
    <section aria-labelledby="levels-heading" className="bg-surface">
      <div className={cn(frame, "py-24 md:py-28")}>
        <SectionHead id="levels-heading" title={V.heading} lead={V.lead(totalMaxScore, parts)} />
        <ul data-bars className="mt-12 grid grid-cols-2 items-end gap-4 md:grid-cols-4 md:gap-5">
          {levels.map((l, i) => (
            <li key={l.level}>
              <span
                className={cn(
                  "lp-bar flex flex-col justify-between rounded-3xl border-b-[6px] p-5",
                  LEVEL_TONE[i] ?? LEVEL_TONE[0],
                )}
                style={{ height: `${Math.round((l.min_score / top) * 16)}rem`, ...delay(i * 110) }}
              >
                <span lang="ko" className="text-4xl font-black">
                  {l.label}
                </span>
                <span className="lp-tabular text-lg font-extrabold">{V.from(l.min_score)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ bài viết mới

export function LatestPosts({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="latest-heading" className={cn(frame, "pt-24 md:pt-28")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHead id="latest-heading" title={L.latestHeading} lead={L.latestLead} />
        <Link
          href="/blog"
          data-reveal
          className="group inline-flex shrink-0 items-center gap-2 rounded-lg text-lg font-extrabold text-sky-600 outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {L.latestAll}
          <ArrowRight
            aria-hidden
            className="size-5 transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>
      <ul aria-label={L.latestHeading} className="mt-10 grid gap-4 md:grid-cols-3">
        {posts.map((post, i) => (
          <li key={post.slug} data-reveal style={delay(i * 70)}>
            <BlogPostCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ kết

export function Closing({ program }: { program: string }) {
  return (
    <section aria-labelledby="closing-heading" className={cn(frame, "py-24 md:py-28")}>
      <div className="flex flex-col items-center gap-8 rounded-[2.5rem] border-b-8 border-sky-700 bg-sky-600 px-6 py-12 text-center text-white lg:flex-row lg:px-14 lg:text-left">
        <TopiCat sparkles className="lp-float size-36 shrink-0" />
        <div className="flex-1">
          <h2 id="closing-heading" data-reveal className="lp-h2">
            {L.closing.heading}
          </h2>
          <p data-reveal style={delay(80)} className="lp-lead mt-3 text-sky-100">
            {L.closing.body}
          </p>
        </div>
        <Link
          href={`/${program}/luyen-tap`}
          className="inline-flex h-14 shrink-0 items-center rounded-xl border-b-4 border-sun-600 bg-sun-400 px-8 text-lg font-extrabold text-ink-900 transition-[background-color,transform,border-bottom-width] duration-150 outline-none hover:bg-[#f0b93a] focus-visible:ring-3 focus-visible:ring-white/70 active:border-b-2 motion-safe:active:translate-y-0.5"
        >
          {L.ctaStart}
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter({ program }: { program: string }) {
  const F = L.footer;
  return (
    <footer className="bg-surface">
      <div className={cn(frame, "grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]")}>
        <div>
          <p className="flex items-center gap-2 text-2xl font-black text-sky-600">
            <TopiCat className="size-10" />
            {t.brand.name}
          </p>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-ink-600">{F.tagline}</p>
        </div>
        <nav aria-label={F.learn}>
          <h2 className="font-extrabold">{F.learn}</h2>
          <ul className="mt-3 grid gap-2 text-base text-ink-600">
            {PILLAR_KEYS.map((key) => (
              <li key={key}>
                <Link
                  href={pillarHref(key, program)}
                  className="rounded outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {t.nav.pillars[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-extrabold">{F.programs}</h2>
          <ul className="mt-3 grid gap-2 text-base text-ink-600">
            {PROGRAMS.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="rounded outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {p.name}
                </Link>
                {p.status === "soon" ? <span> · {t.status.soon.toLowerCase()}</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-extrabold">{F.more}</h2>
          <ul className="mt-3 grid gap-2 text-base text-ink-600">
            <li>
              <Link
                href="/blog"
                className="rounded outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t.nav.blog}
              </Link>
            </li>
            <li>
              <Link
                href="/tai-khoan"
                className="rounded outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t.nav.account}
              </Link>
            </li>
            <li>
              <a
                href="#main"
                className="rounded outline-none hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {F.top}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
