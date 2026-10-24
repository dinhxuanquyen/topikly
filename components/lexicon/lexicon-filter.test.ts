import { describe, expect, it } from "vitest";
import type { GrammarPointSummary, VocabWordSummary } from "@/lib/lexicon/types";
import {
  EMPTY_GRAMMAR_FILTER,
  EMPTY_VOCAB_FILTER,
  filterGrammar,
  filterVocab,
  isVocabFilterActive,
  normalizeSearch,
  parseLevelParam,
  parseStatusParam,
} from "./lexicon-filter";

function word(partial: Partial<VocabWordSummary> & { id: string }): VocabWordSummary {
  return {
    hangul: "경제",
    hanja: "經濟",
    han_viet: "kinh tế",
    meaning_vi: "nền kinh tế",
    pos: "noun",
    pos_name_vi: "Danh từ",
    level: 3,
    topics: [{ code: "economy", name_vi: "Kinh tế" }],
    false_friend_kind: null,
    reviewed: false,
    ...partial,
  };
}

const WORDS = [
  word({ id: "v-1" }),
  word({
    id: "v-2",
    hangul: "대처",
    hanja: "對處",
    han_viet: "đối xử",
    meaning_vi: "đối phó, xử lý",
    level: 4,
    pos: "verb",
    topics: [{ code: "society", name_vi: "Xã hội" }],
    false_friend_kind: "full",
  }),
  word({ id: "v-3", hangul: "쓰레기", hanja: null, han_viet: null, meaning_vi: "rác", level: 2 }),
];

describe("normalizeSearch", () => {
  it("bỏ dấu tiếng Việt, đ -> d, chữ thường", () => {
    expect(normalizeSearch("  Đối  Xử ")).toBe("doi xu");
  });
});

describe("filterVocab", () => {
  const none = new Set<string>();

  it("không lọc: trả đủ", () => {
    expect(filterVocab(WORDS, EMPTY_VOCAB_FILTER, none)).toHaveLength(3);
  });
  it("lọc theo cấp, chủ đề, từ loại, bạn giả", () => {
    expect(filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, level: 4 }, none).map((w) => w.id)).toEqual([
      "v-2",
    ]);
    expect(
      filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, topic: "economy" }, none).map((w) => w.id),
    ).toEqual(["v-1", "v-3"]);
    expect(filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, pos: "verb" }, none)).toHaveLength(1);
    expect(
      filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, falseFriendOnly: true }, none).map((w) => w.id),
    ).toEqual(["v-2"]);
  });
  it("lọc theo trạng thái đã thuộc / chưa thuộc", () => {
    const known = new Set(["v-1"]);
    expect(
      filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, status: "known" }, known).map((w) => w.id),
    ).toEqual(["v-1"]);
    expect(
      filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, status: "unknown" }, known).map((w) => w.id),
    ).toEqual(["v-2", "v-3"]);
  });
  it("tìm không phân biệt dấu trên hangul, hanja, âm Hán-Việt và nghĩa", () => {
    const ids = (q: string) =>
      filterVocab(WORDS, { ...EMPTY_VOCAB_FILTER, q }, none).map((w) => w.id);
    expect(ids("doi xu")).toEqual(["v-2"]);
    expect(ids("Kinh Tế")).toEqual(["v-1"]);
    expect(ids("經濟")).toEqual(["v-1"]);
    expect(ids("쓰레")).toEqual(["v-3"]);
    expect(ids("không có")).toEqual([]);
  });
  it("isVocabFilterActive", () => {
    expect(isVocabFilterActive(EMPTY_VOCAB_FILTER)).toBe(false);
    expect(isVocabFilterActive({ ...EMPTY_VOCAB_FILTER, q: " " })).toBe(false);
    expect(isVocabFilterActive({ ...EMPTY_VOCAB_FILTER, status: "known" })).toBe(true);
  });
});

describe("filterGrammar", () => {
  const point = (p: Partial<GrammarPointSummary> & { id: string }): GrammarPointSummary => ({
    slug: p.id,
    pattern: "-느라고",
    variants: [],
    meaning_vi: "vì mải làm việc gì đó",
    level: 4,
    function: "cause",
    function_name_vi: "Nguyên nhân",
    compare_group: "nguyen-nhan",
    reviewed: false,
    ...p,
  });
  const points = [
    point({ id: "g-1" }),
    point({
      id: "g-2",
      pattern: "-나 보다",
      variants: ["-(으)ㄴ가 보다"],
      meaning_vi: "chắc là",
      level: 3,
      function: "conjecture",
      compare_group: null,
    }),
  ];
  it("lọc theo cấp, chức năng, nhóm và tìm trong biến thể", () => {
    expect(filterGrammar(points, { ...EMPTY_GRAMMAR_FILTER, level: 3 }).map((p) => p.id)).toEqual([
      "g-2",
    ]);
    expect(
      filterGrammar(points, { ...EMPTY_GRAMMAR_FILTER, function: "cause" }).map((p) => p.id),
    ).toEqual(["g-1"]);
    expect(
      filterGrammar(points, { ...EMPTY_GRAMMAR_FILTER, group: "nguyen-nhan" }).map((p) => p.id),
    ).toEqual(["g-1"]);
    expect(filterGrammar(points, { ...EMPTY_GRAMMAR_FILTER, q: "ㄴ가" }).map((p) => p.id)).toEqual([
      "g-2",
    ]);
    expect(filterGrammar(points, { ...EMPTY_GRAMMAR_FILTER, q: "chac la" })).toHaveLength(1);
  });
});

describe("tham số URL", () => {
  it("parseLevelParam chỉ nhận cấp 1–6", () => {
    expect(parseLevelParam("3")).toBe(3);
    expect(parseLevelParam("0")).toBeNull();
    expect(parseLevelParam("9")).toBeNull();
    expect(parseLevelParam("abc")).toBeNull();
    expect(parseLevelParam(null)).toBeNull();
  });
  it("parseStatusParam", () => {
    expect(parseStatusParam("da-thuoc")).toBe("known");
    expect(parseStatusParam("chua-thuoc")).toBe("unknown");
    expect(parseStatusParam("x")).toBe("all");
  });
});
