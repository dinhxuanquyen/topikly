"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { dueWords, scheduleReview, type ReviewRating } from "@/lib/lexicon/review-schedule";
import type { VocabWord } from "@/lib/lexicon/types";
import { useKnownWords } from "./known-store";
import { rateWord, useReviewCards } from "./review-store";
import { subscribeClock } from "@/components/progress/use-clock";

const LABELS: Record<ReviewRating, string> = {
  again: "Chưa nhớ",
  hard: "Khó nhớ",
  good: "Đã nhớ",
  easy: "Rất dễ",
};
export function FlashcardRoute({ program, words }: { program: string; words: VocabWord[] }) {
  const id = useSearchParams().get("tu");
  const word = id ? words.find((item) => item.id === id) : undefined;
  return (
    <>
      {id && !word && (
        <p role="status" className="mb-4">
          Từ này không còn trong danh sách. Bạn vẫn có thể ôn các từ khác.
        </p>
      )}
      <FlashcardStudy
        key={word?.id ?? "all"}
        program={program}
        words={word ? [word] : words}
        targeted={!!word}
      />
    </>
  );
}

export function FlashcardStudy({
  program,
  words,
  targeted = false,
}: {
  program: string;
  words: VocabWord[];
  targeted?: boolean;
}) {
  const { cards, persisted, ready } = useReviewCards(program);
  const { known } = useKnownWords(program);
  const now = useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 60000) * 60000,
    () => 0,
  );
  const [level, setLevel] = useState("");
  const [deck, setDeck] = useState<VocabWord[] | null>(() => (targeted ? words.slice(0, 1) : null));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [last, setLast] = useState("");
  const ratingLock = useRef(false);
  const filtered = words.filter((w) => !level || w.level === Number(level));
  const due = dueWords(filtered, cards, known, now);
  const dueCount = due.filter((w) => cards[w.id]).length;
  const nextDue = filtered
    .map((w) => cards[w.id]?.dueAt)
    .filter((time): time is number => !!time && time > now)
    .sort((a, b) => a - b)[0];
  const word = deck?.[index];
  const formatDate = (time: number) =>
    new Date(time).toLocaleString("vi-VN", {
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  function start() {
    setDeck(due.slice(0, 10));
    setIndex(0);
    setRevealed(false);
    setLast("");
  }
  function rate(rating: ReviewRating, time: number) {
    if (!word || !revealed || ratingLock.current) return;
    ratingLock.current = true;
    const next = scheduleReview(word.id, cards[word.id], rating, time);
    rateWord(program, word.id, rating, time);
    setLast(`${word.hangul}: ôn tiếp ${formatDate(next.dueAt)}.`);
    setIndex((value) => value + 1);
    setRevealed(false);
  }
  if (!ready || !now) return <p role="status">Đang tải lịch ôn trên thiết bị…</p>;
  return (
    <div className="space-y-5">
      {!persisted && (
        <p role="alert" className="text-coral-700">
          Không lưu được lịch ôn. Bạn vẫn có thể học trong phiên này; hãy cho phép lưu dữ liệu trên
          thiết bị.
        </p>
      )}
      {deck && word ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="tabular-nums">
              Thẻ {index + 1} / {deck.length}
            </p>
            <Button variant="ghost" className="min-h-11" onClick={() => setDeck(null)}>
              Kết thúc phiên
            </Button>
          </div>
          <section aria-label="Thẻ từ vựng" className="rounded-2xl bg-surface p-6 md:p-8">
            <p className="text-sm text-muted-foreground">
              Cấp {word.level} · {word.pos_name_vi}
            </p>
            <h2 lang="ko" className="mt-4 text-4xl font-semibold break-keep">
              {word.hangul}
            </h2>
            {!revealed ? (
              <Button
                className="mt-6 min-h-11"
                onClick={() => {
                  ratingLock.current = false;
                  setRevealed(true);
                }}
              >
                Hiện nghĩa
              </Button>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xl font-semibold">{word.meaning_vi}</p>
                {word.hanja && (
                  <p>
                    <span lang="ko">{word.hanja}</span> · Hán-Việt: {word.han_viet}
                  </p>
                )}
                {word.example_ko && (
                  <div>
                    <p lang="ko" className="text-lg break-keep">
                      {word.example_ko}
                    </p>
                    <p className="mt-1 text-muted-foreground">{word.example_vi}</p>
                  </div>
                )}
                {word.false_friend && (
                  <p className="rounded-xl bg-background p-3">
                    Dễ nhầm Hán-Việt: {word.false_friend.note_vi}
                  </p>
                )}
                {!word.reviewed && (
                  <p className="text-sm text-muted-foreground">Nội dung đang chờ duyệt.</p>
                )}
                <Link
                  href={`/${program}/ly-thuyet/tu-vung/${word.id}`}
                  className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                >
                  Xem giải thích và gia đình từ
                </Link>
              </div>
            )}
          </section>
          {revealed && (
            <fieldset>
              <legend className="mb-3 font-semibold">Bạn nhớ từ này đến đâu?</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.keys(LABELS) as ReviewRating[]).map((rating) => {
                  const next = scheduleReview(word.id, cards[word.id], rating, now);
                  return (
                    <Button
                      key={rating}
                      variant="outline"
                      className="h-auto min-h-16 flex-col gap-1 px-2 py-3"
                      onClick={() => rate(rating, Date.now())}
                    >
                      {LABELS[rating]}{" "}
                      <span className="text-sm font-normal">
                        {rating === "again" ? "10 phút" : `${next.intervalDays} ngày`}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </>
      ) : targeted ? (
        <div className="space-y-4 rounded-2xl bg-surface p-5">
          <p className="font-semibold">{deck ? "Đã ôn xong từ này." : "Đã kết thúc phiên ôn."}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${program}/lo-trinh`}
              className={buttonVariants({ className: "min-h-11" })}
            >
              Về lộ trình
            </Link>
            <Link
              href={`/${program}/ly-thuyet/tu-vung/on-tap`}
              className={buttonVariants({ variant: "outline", className: "min-h-11" })}
            >
              Tất cả flashcard
            </Link>
          </div>
        </div>
      ) : (
        <>
          {deck && (
            <p role="status" className="text-lg font-semibold">
              Đã ôn {deck.length} thẻ. Lịch ôn tiếp theo đã cập nhật.
            </p>
          )}
          <section className="space-y-4 rounded-2xl bg-surface p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Lượt ôn hôm nay</h2>
              <select
                aria-label="Cấp từ vựng"
                className="min-h-11 rounded-xl border border-input bg-background px-3"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">Tất cả cấp</option>
                {[...new Set(words.map((w) => w.level))].sort().map((value) => (
                  <option key={value} value={value}>
                    Cấp {value}
                  </option>
                ))}
              </select>
            </div>
            <p>
              <span className="text-3xl tabular-nums">{dueCount}</span> thẻ đến hạn ·{" "}
              <span className="tabular-nums">{due.length - dueCount}</span> từ mới
            </p>
            <p className="text-muted-foreground">
              Ôn thẻ đến hạn trước, rồi học từ mới. Mỗi phiên tối đa 10 thẻ.
            </p>
            <Button className="min-h-11" disabled={!due.length} onClick={start}>
              Bắt đầu ôn{due.length ? ` ${Math.min(10, due.length)} thẻ` : ""}
            </Button>
            {!due.length && (
              <p>
                {nextDue
                  ? `Đã ôn xong. Lần ôn tiếp theo: ${formatDate(nextDue)}.`
                  : "Chưa có từ cần ôn ở cấp này. Bạn có thể đổi cấp hoặc bỏ dấu đã thuộc trong danh sách từ."}
              </p>
            )}
          </section>
          <p className="text-sm text-muted-foreground">
            Từ đã đánh dấu thuộc sẽ không được thêm làm thẻ mới. Thẻ đã học vẫn được nhắc ôn theo
            lịch riêng.
          </p>
        </>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {last}
      </p>
    </div>
  );
}
