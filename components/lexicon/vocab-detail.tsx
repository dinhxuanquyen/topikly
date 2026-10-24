import { TriangleAlert } from "lucide-react";
import { t } from "@/components/i18n";
import { renderInline } from "@/components/practice/rich-text";
import { cn } from "@/lib/utils";
import type { FalseFriend, VocabWordDetail } from "@/lib/lexicon/types";
import { LevelTag, PendingReviewTag, Tag } from "./badges";
import { KnownToggle } from "./known-toggle";
import { MorphemeTree } from "./morpheme-tree";

/** Cảnh báo bạn giả Hán-Việt: nổi bật, có biểu tượng + chữ (không chỉ dựa vào màu). */
export function FalseFriendCallout({
  friend,
  hanViet,
}: {
  friend: FalseFriend;
  hanViet: string | null;
}) {
  const label =
    friend.kind === "full" ? t.vocabDetail.falseFriend.full : t.vocabDetail.falseFriend.partial;
  const body =
    friend.kind === "full"
      ? t.vocabDetail.falseFriend.fullBody
      : t.vocabDetail.falseFriend.partialBody;
  return (
    <section
      aria-labelledby="false-friend-heading"
      data-kind={friend.kind}
      className={cn(
        "rounded-2xl border-2 p-4",
        friend.kind === "full"
          ? "border-red-600 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-50"
          : "border-amber-600 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-50",
      )}
    >
      <h2 id="false-friend-heading" className="flex items-center gap-2 text-lg font-bold">
        <TriangleAlert aria-hidden className="size-5 shrink-0" />
        {label}
      </h2>
      <p className="mt-1 text-sm">{body}</p>
      <div className="mt-3 space-y-2 text-sm leading-relaxed">
        <p>
          <span className="font-semibold">
            {hanViet ? t.vocabDetail.falseFriend.viMeaning(hanViet) : ""}
          </span>{" "}
          {renderInline(friend.vi_meaning, { tagKorean: true })}
        </p>
        <p>
          <span className="font-semibold">{t.vocabDetail.falseFriend.noteHeading}: </span>
          {renderInline(friend.note_vi, { tagKorean: true })}
        </p>
      </div>
    </section>
  );
}

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

/** Nội dung trang chi tiết một từ (không gồm breadcrumb / tiêu đề trang). */
export function VocabDetailView({ program, detail }: { program: string; detail: VocabWordDetail }) {
  const { word, families } = detail;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 lang="ko" className="text-4xl leading-tight font-bold md:text-5xl">
              {word.hangul}
            </h1>
            {word.hanja ? (
              <p lang="ko" className="mt-1 text-xl text-muted-foreground">
                {word.hanja}
              </p>
            ) : null}
            {word.han_viet ? (
              <p className="mt-0.5 text-lg font-medium text-brand-soft-foreground italic">
                {t.vocabDetail.hanVietLine(word.han_viet)}
              </p>
            ) : null}
          </div>
          <KnownToggle program={program} wordId={word.id} hangul={word.hangul} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <LevelTag level={word.level} />
          <Tag>{word.pos_name_vi}</Tag>
          {word.topics.map((topic) => (
            <Tag key={topic.code}>{topic.name_vi}</Tag>
          ))}
          {!word.reviewed ? <PendingReviewTag /> : null}
        </div>
        {!word.reviewed ? (
          <p className="text-xs text-muted-foreground">{t.lexicon.reviewPendingDetail}</p>
        ) : null}
      </header>

      {word.false_friend ? (
        <FalseFriendCallout friend={word.false_friend} hanViet={word.han_viet} />
      ) : null}

      <Card title={t.vocabDetail.meaningHeading} headingId="meaning-heading">
        <p className="text-lg leading-relaxed">{word.meaning_vi}</p>
      </Card>

      {families.length > 0 ? (
        <MorphemeTree program={program} families={families} />
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {t.vocabDetail.pureKorean}
        </p>
      )}

      <Card title={t.vocabDetail.exampleHeading} headingId="example-heading">
        <p lang="ko" className="text-lg leading-relaxed">
          {word.example_ko}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{word.example_vi}</p>
      </Card>

      {word.collocations.length > 0 ? (
        <Card title={t.vocabDetail.collocationsHeading} headingId="collocations-heading">
          <ul className="space-y-1.5">
            {word.collocations.map((c) => (
              <li key={c.ko} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span lang="ko" className="text-base font-semibold">
                  {c.ko}
                </span>
                <span className="text-sm text-muted-foreground">{c.vi}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {word.note_vi ? (
        <Card title={t.vocabDetail.noteHeading} headingId="note-heading">
          <p className="text-sm leading-relaxed">
            {renderInline(word.note_vi, { tagKorean: true })}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
