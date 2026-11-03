import { z } from "zod";

export const ratings = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof ratings)[number];
const cardSchema = z.object({
  wordId: z.string().min(1).max(64),
  dueAt: z.number().finite().nonnegative(),
  lastReviewedAt: z.number().finite().nonnegative(),
  intervalDays: z.number().finite().min(0).max(365),
  reviews: z.number().int().min(1).max(1_000_000),
  rating: z.enum(ratings),
});
export type ReviewCard = z.infer<typeof cardSchema>;
export type ReviewCards = Record<string, ReviewCard>;

/** Lịch ôn theo khoảng cách tăng dần; không giả định đã hiệu chỉnh bằng FSRS. */
export function scheduleReview(
  wordId: string,
  previous: ReviewCard | undefined,
  rating: ReviewRating,
  now: number,
): ReviewCard {
  const old = previous?.intervalDays ?? 0;
  const intervalDays =
    rating === "again"
      ? 0
      : Math.min(
          365,
          rating === "hard"
            ? Math.max(1, Math.ceil(old * 1.2))
            : rating === "good"
              ? Math.max(3, Math.ceil(old * 2))
              : Math.max(7, Math.ceil(old * 3)),
        );
  return {
    wordId,
    intervalDays,
    dueAt: now + (rating === "again" ? 600_000 : intervalDays * 86_400_000),
    lastReviewedAt: now,
    reviews: Math.min(1_000_000, (previous?.reviews ?? 0) + 1),
    rating,
  };
}

export function parseReviewCards(value: unknown): ReviewCards {
  if (!Array.isArray(value)) return {};
  const result: ReviewCards = {};
  for (const item of value.slice(0, 20000)) {
    const parsed = cardSchema.safeParse(item);
    if (
      parsed.success &&
      /^[a-zA-Z0-9][\w-]*$/.test(parsed.data.wordId) &&
      !["constructor", "prototype", "__proto__"].includes(parsed.data.wordId)
    )
      result[parsed.data.wordId] = parsed.data;
  }
  return result;
}

/** Đến hạn trước, từ mới sau; từ đã thuộc không tự trở thành thẻ mới. */
export function dueWords<T extends { id: string }>(
  words: readonly T[],
  cards: ReviewCards,
  known: ReadonlySet<string>,
  now: number,
): T[] {
  return words
    .filter((word) => (cards[word.id] ? cards[word.id]!.dueAt <= now : !known.has(word.id)))
    .toSorted((a, b) => (cards[a.id]?.dueAt ?? Infinity) - (cards[b.id]?.dueAt ?? Infinity));
}
