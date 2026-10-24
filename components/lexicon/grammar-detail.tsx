import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { t } from "@/components/i18n";
import { RichMarkdown } from "@/components/practice/rich-markdown";
import { renderInline } from "@/components/practice/rich-text";
import type { GrammarPoint } from "@/lib/lexicon/types";
import { LevelTag, PendingReviewTag, Tag } from "./badges";

function Card({
  title,
  headingId,
  children,
}: {
  title: string;
  headingId: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-border bg-card p-4 text-card-foreground"
    >
      <h2 id={headingId} className="text-base font-semibold">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** Các dòng ràng buộc có giá trị, theo thứ tự cố định. */
export function constraintRows(point: GrammarPoint): { label: string; value: string }[] {
  const c = point.constraints;
  const labels = t.grammarDetail.constraintLabels;
  const rows: { label: string; value: string }[] = [
    { label: labels.register, value: t.grammarDetail.register[c.register] },
  ];
  if (c.polarity && c.polarity !== "any") {
    rows.push({ label: labels.polarity, value: t.grammarDetail.polarity[c.polarity] });
  }
  if (c.subject_vi) rows.push({ label: labels.subject, value: c.subject_vi });
  if (c.tense_vi) rows.push({ label: labels.tense, value: c.tense_vi });
  if (c.main_clause_vi) rows.push({ label: labels.mainClause, value: c.main_clause_vi });
  if (c.other_vi) rows.push({ label: labels.other, value: c.other_vi });
  return rows;
}

/** Nội dung trang chi tiết một điểm ngữ pháp (không gồm breadcrumb). */
export function GrammarDetailView({ program, point }: { program: string; point: GrammarPoint }) {
  const base = `/${program}/ly-thuyet/ngu-phap`;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 lang="ko" className="text-3xl leading-tight font-bold break-words md:text-4xl">
          {point.pattern}
        </h1>
        {point.variants.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">{t.grammarDetail.variants}: </span>
            <span lang="ko">{point.variants.join(" · ")}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <LevelTag level={point.level} />
          <Tag>{point.function_name_vi}</Tag>
          {!point.reviewed ? <PendingReviewTag /> : null}
        </div>
        {!point.reviewed ? (
          <p className="text-xs text-muted-foreground">{t.lexicon.reviewPendingDetail}</p>
        ) : null}
      </header>

      <Card title={t.grammarDetail.meaningHeading} headingId="meaning-heading">
        <p className="text-lg leading-relaxed">
          {renderInline(point.meaning_vi, { tagKorean: true })}
        </p>
      </Card>

      {point.body_md.trim() !== "" ? (
        <Card title={t.grammarDetail.bodyHeading} headingId="body-heading">
          <RichMarkdown text={point.body_md} className="text-sm" />
        </Card>
      ) : null}

      {point.form.length > 0 ? (
        <Card title={t.grammarDetail.formHeading} headingId="form-heading">
          <dl className="space-y-3">
            {point.form.map((form, index) => (
              <div key={`${form.host}-${index}`}>
                <dt className="text-sm font-semibold">{t.grammarDetail.hostNames[form.host]}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed">
                  <span className="text-base font-medium">
                    {renderInline(form.attach, { tagKorean: true })}
                  </span>
                  {form.note_vi ? (
                    <span className="block text-muted-foreground">
                      {renderInline(form.note_vi, { tagKorean: true })}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <Card title={t.grammarDetail.constraintsHeading} headingId="constraints-heading">
        <dl className="space-y-2.5">
          {constraintRows(point).map((row) => (
            <div key={row.label}>
              <dt className="text-sm font-semibold">{row.label}</dt>
              <dd className="text-sm leading-relaxed">
                {renderInline(row.value, { tagKorean: true })}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {point.examples.length > 0 ? (
        <Card title={t.grammarDetail.examplesHeading} headingId="examples-heading">
          <ol className="space-y-3">
            {point.examples.map((example, index) => (
              <li key={index} className="border-l-4 border-primary/30 pl-3">
                <p lang="ko" className="text-base leading-relaxed font-medium">
                  {example.ko}
                </p>
                <p className="text-sm text-muted-foreground">{example.vi}</p>
                {example.note_vi ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {renderInline(example.note_vi, { tagKorean: true })}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {point.non_examples.length > 0 ? (
        <Card title={t.grammarDetail.nonExamplesHeading} headingId="non-examples-heading">
          <ul className="space-y-3">
            {point.non_examples.map((item, index) => (
              <li
                key={index}
                className="rounded-lg border-2 border-red-600 bg-red-50 p-3 text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-50"
              >
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <CircleX aria-hidden className="size-4" />
                  {t.grammarDetail.wrongBadge}
                </p>
                <p lang="ko" className="mt-1 text-base leading-relaxed">
                  {item.ko}
                </p>
                {item.fix_ko ? (
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm">
                    <CircleCheck aria-hidden className="size-4 translate-y-0.5 self-center" />
                    <span className="font-semibold">{t.grammarDetail.fixLabel}:</span>
                    <span lang="ko" className="text-base">
                      {item.fix_ko}
                    </span>
                  </p>
                ) : null}
                <p className="mt-1.5 text-sm leading-relaxed">
                  {renderInline(item.note_vi, { tagKorean: true })}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {point.common_mistakes_vi.length > 0 ? (
        <Card title={t.grammarDetail.mistakesHeading} headingId="mistakes-heading">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {point.common_mistakes_vi.map((mistake, index) => (
              <li key={index} className="leading-relaxed">
                {renderInline(mistake, { tagKorean: true })}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {point.group ? (
        <Card title={t.grammarDetail.groupHeading} headingId="group-heading">
          <p className="text-sm font-medium">
            {renderInline(point.group.title_vi, { tagKorean: true })}
          </p>
          <Link
            href={`${base}/nhom/${point.group.slug}`}
            className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t.grammarDetail.viewGroup}
          </Link>
        </Card>
      ) : null}

      {point.related.length > 0 ? (
        <Card title={t.grammarDetail.relatedHeading} headingId="related-heading">
          <ul className="flex flex-wrap gap-2">
            {point.related.map((ref) => (
              <li key={ref.id}>
                <Link
                  href={`${base}/${ref.slug}`}
                  lang="ko"
                  className="inline-flex min-h-11 items-center rounded-lg border-2 border-border bg-background px-3 text-sm font-semibold outline-none hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {ref.pattern}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
