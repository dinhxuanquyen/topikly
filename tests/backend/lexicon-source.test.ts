import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { topikII } from "@/lib/db/programs";
import {
  clearLexiconCache,
  foldText,
  getCompareGroup,
  getGrammarFacets,
  getGrammarPoint,
  getHanjaFamily,
  getVocabFacets,
  getVocabWord,
  getVocabWordDetail,
  listCompareGroups,
  listGrammar,
  listHanja,
  listVocab,
  searchLexicon,
} from "@/lib/lexicon/source";

const FIXTURE_ROOT = path.join(process.cwd(), "tests", "fixtures", "content", "valid");
const fx = { contentRoot: FIXTURE_ROOT };

/** Khoá không bao giờ được xuất hiện trong dữ liệu gửi cho client. */
const FORBIDDEN_KEYS = [
  "notes_internal",
  "reviewed_by",
  "reviewed_at",
  "verification_vi",
  "level_basis",
  "refs",
  "source",
  "authored_by",
  "created_at",
  "status",
  "batch",
] as const;

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, keys));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      collectKeys(v, keys);
    }
  }
  return keys;
}

const tmpDirs: string[] = [];
afterEach(() => {
  clearLexiconCache();
  vi.restoreAllMocks();
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function copyFixtures(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "topikly-lexicon-"));
  tmpDirs.push(root);
  cpSync(FIXTURE_ROOT, root, { recursive: true });
  return root;
}

describe("lexicon/source: dữ liệu thật content/topik-ii", () => {
  it("bộ lọc khả dụng: tổng, cấp, chủ đề, từ loại kèm nhãn tiếng Việt từ cấu hình", () => {
    const f = getVocabFacets("topik-ii")!;
    expect(f.total).toBe(52);
    expect(f.levels.map((l) => l.level)).toEqual([2, 3, 4]);
    expect(f.levels.find((l) => l.level === 3)!.label).toBe("3급");
    expect(f.levels.find((l) => l.level === 2)!.label).toBe("2급");
    expect(f.levels.reduce((n, l) => n + l.count, 0)).toBe(52);
    expect(f.pos.find((p) => p.code === "noun")).toMatchObject({ name_vi: "Danh từ", count: 34 });
    expect(f.topics.find((t) => t.code === "society")).toMatchObject({ name_vi: "Xã hội" });
    expect(f.false_friend_count).toBe(14);
    // chủ đề sắp theo danh sách cấu hình, không theo số lượng
    const order = topikII.lexicon.topics.map((t) => t.code);
    const idx = f.topics.map((t) => order.indexOf(t.code));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(getVocabFacets("khong-co")).toBeUndefined();
  });

  it("danh sách theo cấp / chủ đề / từ loại / bạn giả", () => {
    expect(listVocab("topik-ii")).toHaveLength(52);
    const level3 = listVocab("topik-ii", { level: 3 });
    expect(level3).toHaveLength(22);
    expect(level3.every((w) => w.level === 3)).toBe(true);
    const society = listVocab("topik-ii", { topic: "society" });
    expect(society.length).toBeGreaterThan(0);
    expect(society.every((w) => w.topics.some((t) => t.code === "society"))).toBe(true);
    expect(society[0]!.topics.find((t) => t.code === "society")!.name_vi).toBe("Xã hội");
    const verbs = listVocab("topik-ii", { pos: "verb" });
    expect(verbs.every((w) => w.pos === "verb" && w.pos_name_vi === "Động từ")).toBe(true);
    const ff = listVocab("topik-ii", { falseFriend: true });
    expect(ff).toHaveLength(14);
    expect(
      ff.every((w) => w.false_friend_kind === "full" || w.false_friend_kind === "partial"),
    ).toBe(true);
    expect(ff.filter((w) => w.false_friend_kind === "full")).toHaveLength(3);
    expect(listVocab("topik-ii", { falseFriend: false })).toHaveLength(38);
    // kết hợp bộ lọc và sắp theo cấp rồi hangul
    const mixed = listVocab("topik-ii", { level: 4, pos: "noun" });
    expect(mixed.every((w) => w.level === 4 && w.pos === "noun")).toBe(true);
    const hangul = mixed.map((w) => w.hangul);
    expect(hangul).toEqual([...hangul].sort((a, b) => a.localeCompare(b, "ko")));
    expect(listVocab("topik-ii", { level: 9 })).toEqual([]);
    expect(listVocab("khong-co")).toEqual([]);
  });

  it("một từ theo id, kèm âm tiết có nghĩa chữ Hán và gia đình từ", () => {
    const d = getVocabWordDetail("topik-ii", "v-00001")!;
    expect(d.word).toMatchObject({
      id: "v-00001",
      program: "topik-ii",
      hangul: "사회",
      hanja: "社會",
      han_viet: "xã hội",
      pos: "noun",
      pos_name_vi: "Danh từ",
      level: 3,
      false_friend: null,
      reviewed: false,
    });
    expect(d.word.syllables.map((s) => [s.ko, s.hanja, s.hv])).toEqual([
      ["사", "社", "xã"],
      ["회", "會", "hội"],
    ]);
    expect(d.word.syllables.every((s) => (s.meaning_vi ?? "").length > 0)).toBe(true);
    expect(d.word.collocations.length).toBeGreaterThanOrEqual(2);
    expect(d.families.map((f) => f.syllable.hanja)).toEqual(["社", "會"]);
    // gia đình từ không gồm chính từ đang xem
    for (const fam of d.families) {
      expect(fam.words.some((w) => w.id === "v-00001")).toBe(false);
      for (const w of fam.words) {
        expect(w.hanja).toContain(fam.syllable.hanja);
        expect(w.hv.length).toBeGreaterThan(0);
      }
    }
    expect(getVocabWord("topik-ii", "v-00001")).toEqual(d.word);
    expect(getVocabWord("topik-ii", "v-99999")).toBeUndefined();
    expect(getVocabWordDetail("khong-co", "v-00001")).toBeUndefined();
  });

  it("từ bạn giả có cấu trúc đầy đủ; từ thuần Hàn không có âm tiết", () => {
    const ff = listVocab("topik-ii", { falseFriend: true })[0]!;
    const word = getVocabWord("topik-ii", ff.id)!;
    expect(word.false_friend).toMatchObject({ kind: ff.false_friend_kind });
    expect(word.false_friend!.vi_meaning.length).toBeGreaterThan(0);
    expect(word.false_friend!.note_vi.length).toBeGreaterThan(0);
    const native = listVocab("topik-ii").find((w) => w.hanja === null)!;
    const detail = getVocabWordDetail("topik-ii", native.id)!;
    expect(detail.word.syllables).toEqual([]);
    expect(detail.families).toEqual([]);
    expect(native.han_viet).toBeNull();
  });

  it("danh sách chữ Hán và trang riêng của một chữ", () => {
    const hanja = listHanja("topik-ii");
    expect(hanja.length).toBeGreaterThan(30);
    expect(hanja.every((h) => h.word_count > 0 && h.readings.length > 0)).toBe(true);
    const sa = hanja.find((h) => h.hanja === "社")!;
    expect(sa.readings[0]).toMatchObject({ ko: "사", hv: "xã" });
    const family = getHanjaFamily("topik-ii", "社")!;
    expect(family.words.map((w) => w.hangul)).toContain("사회");
    expect(family.words.every((w) => w.hanja?.includes("社"))).toBe(true);
    expect(getHanjaFamily("topik-ii", "龍")).toBeUndefined();
  });

  it("KHÔNG lộ metadata nội bộ ở bất kỳ kiểu nào", () => {
    const everything = [
      ...listVocab("topik-ii").map((w) => getVocabWordDetail("topik-ii", w.id)),
      ...listGrammar("topik-ii").map((p) => getGrammarPoint("topik-ii", p.slug)),
      ...listCompareGroups("topik-ii").map((g) => getCompareGroup("topik-ii", g.slug)),
      ...listHanja("topik-ii").map((h) => getHanjaFamily("topik-ii", h.hanja)),
      getVocabFacets("topik-ii"),
      getGrammarFacets("topik-ii"),
      searchLexicon("topik-ii", "xa"),
    ];
    const keys = collectKeys(everything);
    for (const key of FORBIDDEN_KEYS) expect(keys.has(key), `có khoá ${key}`).toBe(false);
    // chuỗi nằm trong notes_internal / verification_vi của nội dung thật
    const json = JSON.stringify(everything);
    expect(json).not.toContain("Tự biên soạn từ kiến thức");
    expect(json).not.toContain("Không đánh dấu bạn giả vì 'nhân khẩu'");
    expect(json).not.toContain("Cấp 4 là đánh giá của người soạn");
  });

  it("nội dung chưa duyệt hiện mặc định (reviewed: false); requireReviewed ẩn hết", () => {
    expect(listVocab("topik-ii").every((w) => w.reviewed === false)).toBe(true);
    expect(listGrammar("topik-ii").every((p) => p.reviewed === false)).toBe(true);
    const strict = { requireReviewed: true };
    expect(listVocab("topik-ii", {}, strict)).toEqual([]);
    expect(listGrammar("topik-ii", {}, strict)).toEqual([]);
    expect(listCompareGroups("topik-ii", strict)).toEqual([]);
    expect(getVocabFacets("topik-ii", strict)!.total).toBe(0);
  });

  it("ngữ pháp: lọc theo cấp / chức năng / nhóm, nhãn chức năng từ cấu hình", () => {
    const all = listGrammar("topik-ii");
    expect(all).toHaveLength(10);
    expect(all.map((p) => p.level)).toEqual([...all.map((p) => p.level)].sort((a, b) => a - b));
    expect(listGrammar("topik-ii", { level: 3 }).map((p) => p.id)).toEqual(["g-0006"]);
    const cause = listGrammar("topik-ii", { function: "cause" });
    expect(cause.map((p) => p.id)).toEqual(["g-0001", "g-0002", "g-0003"]);
    expect(cause[0]!.function_name_vi).toBe("Nguyên nhân, lý do");
    expect(listGrammar("topik-ii", { group: "nhuong-bo-cho-du" }).map((p) => p.id)).toEqual([
      "g-0007",
      "g-0008",
    ]);
    expect(listGrammar("topik-ii", { function: "khong-co" })).toEqual([]);
    expect(listGrammar("khong-co")).toEqual([]);
    const f = getGrammarFacets("topik-ii")!;
    expect(f.total).toBe(10);
    expect(f.functions.find((x) => x.code === "cause")).toMatchObject({ count: 3 });
    expect(f.levels.map((l) => l.level)).toEqual([3, 4]);
  });

  it("một điểm ngữ pháp theo slug: ràng buộc, ví dụ, nhóm, điểm liên quan", () => {
    const p = getGrammarPoint("topik-ii", "neula-go")!;
    expect(p).toMatchObject({
      id: "g-0001",
      pattern: "-느라고",
      variants: ["-느라"],
      level: 4,
      function: "cause",
      compare_group: "nguyen-nhan-ket-qua-xau",
      reviewed: false,
    });
    expect(p.form[0]).toMatchObject({ host: "V" });
    expect(p.constraints).toMatchObject({ register: "both", polarity: "negative" });
    expect(p.examples.length).toBeGreaterThanOrEqual(3);
    expect(p.non_examples.length).toBeGreaterThanOrEqual(2);
    expect(p.non_examples.every((e) => !e.ko.includes("*"))).toBe(true);
    expect(p.common_mistakes_vi.length).toBeGreaterThan(0);
    expect(p.related.map((r) => r.id)).toEqual(["g-0002", "g-0003"]);
    expect(p.related[0]).toEqual({ id: "g-0002", slug: "neun-baram-e", pattern: "-는 바람에" });
    expect(p.group).toMatchObject({ slug: "nguyen-nhan-ket-qua-xau" });
    expect(p.group!.title_vi).toContain("-느라고");
    expect(p.body_md).toContain("Ý cốt lõi");
    expect(getGrammarPoint("topik-ii", "khong-co")).toBeUndefined();
    // điểm không thuộc nhóm
    expect(getGrammarPoint("topik-ii", "eulkka-bwa")).toMatchObject({
      compare_group: null,
      group: null,
    });
  });

  it("nhóm so sánh: thành viên đúng thứ tự cột, bảng đủ 7 khoá, ví dụ đối chiếu có pattern", () => {
    const groups = listCompareGroups("topik-ii");
    expect(groups.map((g) => g.slug).sort()).toEqual([
      "nguyen-nhan-ket-qua-xau",
      "nhuong-bo-cho-du",
      "phong-doan-dua-vao-quan-sat",
    ]);
    expect(groups.map((g) => g.level)).toEqual([3, 4, 4]);
    const g = getCompareGroup("topik-ii", "nguyen-nhan-ket-qua-xau")!;
    expect(g).toMatchObject({
      member_count: 3,
      function: "cause",
      function_name_vi: "Nguyên nhân, lý do",
    });
    expect(g.members.map((m) => m.pattern)).toEqual(g.compare_table.columns);
    expect(g.members.map((m) => m.id)).toEqual(["g-0001", "g-0002", "g-0003"]);
    const keys = new Set(g.compare_table.rows.map((r) => r.criterion_key));
    for (const k of ["meaning", "pos", "subject", "tense", "main_clause", "nuance", "register"]) {
      expect(keys.has(k as never), k).toBe(true);
    }
    for (const row of g.compare_table.rows) expect(row.cells).toHaveLength(3);
    expect(g.contrast_examples.length).toBeGreaterThanOrEqual(2);
    for (const item of g.contrast_examples.flatMap((s) => s.items)) {
      expect(g.members.some((m) => m.id === item.member && m.pattern === item.pattern)).toBe(true);
    }
    expect(g.decision_tips_vi.length).toBeGreaterThan(0);
    expect(getCompareGroup("topik-ii", "khong-co")).toBeUndefined();
  });

  it("tìm kiếm: hangul, hanja, âm Hán-Việt không dấu, nghĩa, pattern, biến thể", () => {
    expect(searchLexicon("topik-ii", "사회").vocab.map((w) => w.id)).toContain("v-00001");
    expect(searchLexicon("topik-ii", "社會").vocab.map((w) => w.id)).toContain("v-00001");
    expect(searchLexicon("topik-ii", "xa hoi").vocab.map((w) => w.id)).toContain("v-00001");
    expect(searchLexicon("topik-ii", "XÃ HỘI").vocab.map((w) => w.id)).toContain("v-00001");
    // khớp đầu chuỗi xếp trước
    const hits = searchLexicon("topik-ii", "xã hội").vocab;
    expect(hits[0]!.han_viet?.startsWith("xã hội") || hits[0]!.hangul.startsWith("xã")).toBe(true);
    expect(searchLexicon("topik-ii", "느라고").grammar.map((p) => p.id)).toContain("g-0001");
    expect(searchLexicon("topik-ii", "-느라").grammar.map((p) => p.id)).toContain("g-0001");
    expect(searchLexicon("topik-ii", "탓으로").grammar.map((p) => p.id)).toContain("g-0003");
    expect(searchLexicon("topik-ii", "  ").vocab).toEqual([]);
    expect(searchLexicon("topik-ii", "zzzzzz")).toEqual({ q: "zzzzzz", vocab: [], grammar: [] });
    expect(searchLexicon("topik-ii", "사", 2).vocab.length).toBeLessThanOrEqual(2);
    expect(searchLexicon("khong-co", "사회").vocab).toEqual([]);
  });

  it("foldText: bỏ dấu tiếng Việt, đ -> d", () => {
    expect(foldText("Đối Xử")).toBe("doi xu");
    expect(foldText("giải quyết")).toBe("giai quyet");
    expect(foldText("사회")).toBe("사회");
  });
});

describe("lexicon/source: fixture (số liệu cố định)", () => {
  it("gia đình từ: mọi từ chứa cùng chữ Hán, kèm âm trong từ", () => {
    const d = getVocabWordDetail("topik-ii", "v-00002", fx)!;
    const quyet = d.families.find((f) => f.syllable.hanja === "決")!;
    expect(quyet.syllable).toMatchObject({
      ko: "결",
      hv: "quyết",
      meaning_vi: "quyết định, dứt khoát",
    });
    expect(quyet.words.map((w) => w.id)).toEqual(["v-00003"]);
    expect(quyet.words[0]).toMatchObject({ hangul: "결정하다", ko: "결", hv: "quyết" });
    const giai = d.families.find((f) => f.syllable.hanja === "解")!;
    expect(giai.words).toEqual([]);
    expect(giai.alt_hv).toEqual(["giới"]);
    const family = getHanjaFamily("topik-ii", "決", fx)!;
    // sắp theo cấp rồi hangul: 결정하다 đứng trước 해결하다
    expect(family.words.map((w) => w.id)).toEqual(["v-00003", "v-00002"]);
    expect(family.readings).toHaveLength(1);
    expect(
      listHanja("topik-ii", fx)
        .map((h) => h.hanja)
        .sort(),
    ).toEqual(["會", "定", "決", "社", "解"].sort());
    expect(listHanja("topik-ii", fx).find((h) => h.hanja === "決")!.word_count).toBe(2);
  });

  it("requireReviewed: reviewed_by riêng của từ thắng gốc lô; ngữ pháp chưa duyệt bị ẩn", () => {
    const strict = { ...fx, requireReviewed: true };
    expect(listVocab("topik-ii", {}, strict).map((w) => w.id)).toEqual(["v-00003"]);
    expect(listVocab("topik-ii", {}, strict)[0]!.reviewed).toBe(true);
    expect(listVocab("topik-ii", {}, fx)).toHaveLength(4);
    expect(listGrammar("topik-ii", {}, strict)).toEqual([]);
    expect(listCompareGroups("topik-ii", strict)).toEqual([]);
  });

  it("nhóm bị bỏ khi một thành viên bị ẩn: điểm còn lại không trỏ tới nhóm", () => {
    const root = copyFixtures();
    const file = path.join(root, "topik-ii/grammar/g-0002-neun-baram-e.yaml");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace("reviewed_by: null", "reviewed_by: nguoi-dung"),
    );
    const g1 = path.join(root, "topik-ii/grammar/g-0001-neula-go.yaml");
    writeFileSync(
      g1,
      readFileSync(g1, "utf8").replace("reviewed_by: null", "reviewed_by: nguoi-dung"),
    );
    const groupFile = path.join(root, "topik-ii/grammar/groups/nguyen-nhan-ket-qua-xau.yaml");
    writeFileSync(
      groupFile,
      readFileSync(groupFile, "utf8").replace("reviewed_by: null", "reviewed_by: nguoi-dung"),
    );
    const strict = { contentRoot: root, requireReviewed: true };
    expect(listCompareGroups("topik-ii", strict)).toHaveLength(1);
    expect(listGrammar("topik-ii", {}, strict)).toHaveLength(2);
    // bỏ duyệt điểm g-0002 -> nhóm thiếu thành viên -> nhóm biến mất, g-0001 không còn nhóm
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace("reviewed_by: nguoi-dung", "reviewed_by: null"),
    );
    clearLexiconCache();
    expect(listCompareGroups("topik-ii", strict)).toEqual([]);
    expect(getGrammarPoint("topik-ii", "neula-go", strict)).toMatchObject({
      compare_group: null,
      group: null,
    });
  });

  it("file lỗi bị bỏ qua (có console.warn), file tốt vẫn dùng được", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const root = copyFixtures();
    const file = path.join(root, "topik-ii/grammar/g-0002-neun-baram-e.yaml");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(/^examples:[\s\S]*?(?=^non_examples)/m, ""),
    );
    const opts = { contentRoot: root };
    expect(listGrammar("topik-ii", {}, opts).map((p) => p.id)).toEqual(["g-0001"]);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]![0])).toContain("g-0002-neun-baram-e.yaml");
    // g-0001 trỏ tới nhóm có thành viên g-0002 bị lỗi: nhóm biến mất, g-0001 không còn nhóm
    expect(listCompareGroups("topik-ii", opts)).toEqual([]);
    expect(getGrammarPoint("topik-ii", "neula-go", opts)!.group).toBeNull();
    // related trỏ tới điểm không còn thì bị lọc
    expect(getGrammarPoint("topik-ii", "neula-go", opts)!.related).toEqual([]);
  });

  it("từ retired không hiện; thư mục không có nội dung trả rỗng", () => {
    const root = copyFixtures();
    const file = path.join(root, "topik-ii/vocab/general.yaml");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(
        "  - id: v-00004\n",
        "  - id: v-00004\n    status: retired\n",
      ),
    );
    expect(listVocab("topik-ii", {}, { contentRoot: root }).map((w) => w.id)).toEqual([
      "v-00003",
      "v-00001",
      "v-00002",
    ]);
    const empty = mkdtempSync(path.join(os.tmpdir(), "topikly-lexicon-"));
    tmpDirs.push(empty);
    expect(listVocab("topik-ii", {}, { contentRoot: empty })).toEqual([]);
    expect(getVocabFacets("topik-ii", { contentRoot: empty })!.total).toBe(0);
  });
});

describe("programs: cấu hình lexicon", () => {
  it("nhãn chủ đề khớp danh sách tag, không trùng mã, có tên tiếng Việt", () => {
    const { lexicon, tag_vocabulary } = topikII;
    expect(lexicon.topics.map((t) => t.code)).toEqual([...tag_vocabulary.topic]);
    for (const list of [lexicon.pos, lexicon.grammar_functions, lexicon.topics]) {
      expect(new Set(list.map((x) => x.code)).size).toBe(list.length);
      expect(list.every((x) => x.name_vi.length > 0)).toBe(true);
    }
    expect(lexicon.pos).toHaveLength(13);
    expect(lexicon.grammar_functions).toHaveLength(28);
    expect(lexicon.level_range).toEqual({ min: 3, max: 6 });
  });
});
