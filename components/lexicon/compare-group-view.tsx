import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { t } from "@/components/i18n";
import { RichMarkdown } from "@/components/practice/rich-markdown";
import { renderInline } from "@/components/practice/rich-text";
import type { CompareGroup } from "@/lib/lexicon/types";
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

/**
 * Bảng so sánh các mẫu ngữ pháp gần nghĩa. Trên điện thoại bảng cuộn ngang TRONG khung của nó
 * (khung có thể focus bằng bàn phím và có nhãn), không làm trang tràn ngang. Cột tiêu chí dính
 * bên trái để luôn biết đang đọc hàng nào.
 */
export function CompareTable({ group }: { group: CompareGroup }) {
  const { columns, rows } = group.compare_table;
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${t.compare.tableLabel(group.title_vi)}. ${t.compare.scrollHint}`}
      className="max-w-full overflow-x-auto rounded-lg border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption className="sr-only">{t.compare.tableLabel(group.title_vi)}</caption>
        <thead>
          <tr className="bg-muted/60">
            <th
              scope="col"
              className="sticky left-0 z-10 w-28 min-w-28 border-b border-border bg-muted px-3 py-2 font-semibold"
            >
              {t.compare.criterionColumn}
            </th>
            {columns.map((column, index) => (
              <th
                key={`${column}-${index}`}
                scope="col"
                lang="ko"
                className="min-w-56 border-b border-l border-border px-3 py-2 text-base font-bold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.criterion_key}>
              <th
                scope="row"
                className="sticky left-0 z-10 w-28 min-w-28 border-t border-border bg-card px-3 py-2 align-top font-semibold"
              >
                {row.criterion}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className="min-w-56 border-t border-l border-border px-3 py-2 align-top leading-relaxed"
                >
                  {renderInline(cell, { tagKorean: true })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CompareGroupView({ program, group }: { program: string; group: CompareGroup }) {
  const base = `/${program}/ly-thuyet/ngu-phap`;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
          {renderInline(group.title_vi, { tagKorean: true })}
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <LevelTag level={group.level} />
          <Tag>{group.function_name_vi}</Tag>
          {!group.reviewed ? <PendingReviewTag /> : null}
        </div>
        {!group.reviewed ? (
          <p className="text-xs text-muted-foreground">{t.lexicon.reviewPendingDetail}</p>
        ) : null}
      </header>

      <Card title={t.compare.summaryHeading} headingId="summary-heading">
        <RichMarkdown text={group.summary_vi} className="text-sm" />
      </Card>

      <section aria-labelledby="members-heading" className="space-y-2">
        <h2 id="members-heading" className="text-base font-semibold">
          {t.compare.membersHeading}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {group.members.map((member) => (
            <li key={member.id}>
              <Link
                href={`${base}/${member.slug}`}
                className="block h-full rounded-xl border border-border bg-card p-3 outline-none hover:border-primary/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span lang="ko" className="block text-base font-bold">
                  {member.pattern}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t.compare.memberMeta(member.level)}
                </span>
                <span className="mt-1 block text-sm">{member.meaning_vi}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="table-heading" className="min-w-0 space-y-2">
        <h2 id="table-heading" className="text-base font-semibold">
          {t.compare.tableHeading}
        </h2>
        <p className="text-xs text-muted-foreground">{t.compare.scrollHint}</p>
        <CompareTable group={group} />
      </section>

      {group.contrast_examples.length > 0 ? (
        <section aria-labelledby="contrast-heading" className="space-y-3">
          <h2 id="contrast-heading" className="text-base font-semibold">
            {t.compare.contrastHeading}
          </h2>
          <ol className="space-y-4">
            {group.contrast_examples.map((example, index) => (
              <li key={index} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">
                  {t.compare.situation}: {renderInline(example.situation_vi, { tagKorean: true })}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {example.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      data-ok={item.ok}
                      className={
                        item.ok
                          ? "rounded-lg border-2 border-emerald-600 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-50"
                          : "rounded-lg border-2 border-red-600 bg-red-50 p-3 text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-50"
                      }
                    >
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold">
                        {item.ok ? (
                          <CircleCheck aria-hidden className="size-4" />
                        ) : (
                          <CircleX aria-hidden className="size-4" />
                        )}
                        {item.ok ? t.compare.okBadge : t.compare.notOkBadge}
                        <span lang="ko" className="font-semibold">
                          {item.pattern}
                        </span>
                      </p>
                      <p lang="ko" className="mt-1 text-base leading-relaxed">
                        {item.ko}
                      </p>
                      <p className="text-sm opacity-90">{item.vi}</p>
                      <p className="mt-1 text-sm leading-relaxed">
                        {renderInline(item.note_vi, { tagKorean: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {group.decision_tips_vi.length > 0 ? (
        <Card title={t.compare.tipsHeading} headingId="tips-heading">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {group.decision_tips_vi.map((tip, index) => (
              <li key={index} className="leading-relaxed">
                {renderInline(tip, { tagKorean: true })}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {group.topik_traps_vi.length > 0 ? (
        <Card title={t.compare.trapsHeading} headingId="traps-heading">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {group.topik_traps_vi.map((trap, index) => (
              <li key={index} className="leading-relaxed">
                {renderInline(trap, { tagKorean: true })}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
