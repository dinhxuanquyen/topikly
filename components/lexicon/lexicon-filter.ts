import type { GrammarPointSummary, VocabWordSummary } from "@/lib/lexicon/types";

/** Bỏ dấu tiếng Việt, đưa về chữ thường để tìm không phân biệt dấu (giống API /api/lexicon/search). */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "d")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

export type KnownStatus = "all" | "known" | "unknown";

export interface VocabFilterState {
  level: number | null;
  topic: string | null;
  pos: string | null;
  /** true = chỉ bạn giả. */
  falseFriendOnly: boolean;
  status: KnownStatus;
  q: string;
}

export const EMPTY_VOCAB_FILTER: VocabFilterState = {
  level: null,
  topic: null,
  pos: null,
  falseFriendOnly: false,
  status: "all",
  q: "",
};

export function isVocabFilterActive(filter: VocabFilterState): boolean {
  return (
    filter.level !== null ||
    filter.topic !== null ||
    filter.pos !== null ||
    filter.falseFriendOnly ||
    filter.status !== "all" ||
    filter.q.trim() !== ""
  );
}

function vocabHaystack(word: VocabWordSummary): string {
  return normalizeSearch(
    [word.hangul, word.hanja ?? "", word.han_viet ?? "", word.meaning_vi].join(" "),
  );
}

export function filterVocab(
  words: readonly VocabWordSummary[],
  filter: VocabFilterState,
  known: ReadonlySet<string>,
): VocabWordSummary[] {
  const q = normalizeSearch(filter.q);
  return words.filter((word) => {
    if (filter.level !== null && word.level !== filter.level) return false;
    if (filter.topic !== null && !word.topics.some((topic) => topic.code === filter.topic)) {
      return false;
    }
    if (filter.pos !== null && word.pos !== filter.pos) return false;
    if (filter.falseFriendOnly && word.false_friend_kind === null) return false;
    if (filter.status === "known" && !known.has(word.id)) return false;
    if (filter.status === "unknown" && known.has(word.id)) return false;
    if (q !== "" && !vocabHaystack(word).includes(q)) return false;
    return true;
  });
}

export interface GrammarFilterState {
  level: number | null;
  function: string | null;
  /** Slug nhóm so sánh. */
  group: string | null;
  q: string;
}

export const EMPTY_GRAMMAR_FILTER: GrammarFilterState = {
  level: null,
  function: null,
  group: null,
  q: "",
};

export function isGrammarFilterActive(filter: GrammarFilterState): boolean {
  return (
    filter.level !== null ||
    filter.function !== null ||
    filter.group !== null ||
    filter.q.trim() !== ""
  );
}

function grammarHaystack(point: GrammarPointSummary): string {
  return normalizeSearch([point.pattern, ...point.variants, point.meaning_vi].join(" "));
}

export function filterGrammar(
  points: readonly GrammarPointSummary[],
  filter: GrammarFilterState,
): GrammarPointSummary[] {
  const q = normalizeSearch(filter.q);
  return points.filter((point) => {
    if (filter.level !== null && point.level !== filter.level) return false;
    if (filter.function !== null && point.function !== filter.function) return false;
    if (filter.group !== null && point.compare_group !== filter.group) return false;
    if (q !== "" && !grammarHaystack(point).includes(q)) return false;
    return true;
  });
}

/** Đọc số nguyên dương từ tham số URL; không hợp lệ -> null. */
export function parseLevelParam(value: string | null): number | null {
  if (value === null || !/^\d$/.test(value)) return null;
  const level = Number(value);
  return level >= 1 && level <= 6 ? level : null;
}

export function parseStatusParam(value: string | null): KnownStatus {
  return value === "da-thuoc" ? "known" : value === "chua-thuoc" ? "unknown" : "all";
}

export function statusToParam(status: KnownStatus): string | null {
  return status === "known" ? "da-thuoc" : status === "unknown" ? "chua-thuoc" : null;
}
