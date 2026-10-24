import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { validateContent, type ValidationIssue } from "@/lib/db/content-validation";
import {
  effectiveReviewedBy,
  grammarTagOf,
  isLexiconPath,
  validateLexicon,
} from "@/lib/db/lexicon-validation";
import { topikII } from "@/lib/db/programs";

const ROOT = path.resolve(__dirname, "../fixtures/content/valid");

const TABLE = "topik-ii/vocab/_hanja-syllables.yaml";
const BATCH = "topik-ii/vocab/general.yaml";
const G1 = "topik-ii/grammar/g-0001-neula-go.yaml";
const G2 = "topik-ii/grammar/g-0002-neun-baram-e.yaml";
const GROUP = "topik-ii/grammar/groups/nguyen-nhan-ket-qua-xau.yaml";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function readAll(dir: string, out: Record<string, string> = {}, rel = ""): Record<string, string> {
  for (const entry of readdirSync(path.join(dir, rel))) {
    const r = rel ? `${rel}/${entry}` : entry;
    if (statSync(path.join(dir, r)).isDirectory()) readAll(dir, out, r);
    else if (/\.ya?ml$/.test(entry) && /\/(vocab|grammar)\//.test(`/${r}`)) {
      out[r] = readFileSync(path.join(dir, r), "utf8");
    }
  }
  return out;
}

const FIXTURES = readAll(ROOT);

type Mutator = Record<string, (doc: Doc) => void>;

/** Kiểm các fixture sau khi chỉnh sửa. `raw` ghi đè nguyên văn text của file. */
function run(
  mutate: Mutator = {},
  options: { forImport?: boolean; raw?: Record<string, string>; drop?: string[] } = {},
): ValidationIssue[] {
  const files = Object.entries(FIXTURES)
    .filter(([file]) => !options.drop?.includes(file))
    .map(([file, text]) => {
      if (options.raw?.[file] !== undefined) return { file, text: options.raw[file]! };
      const fn = mutate[file];
      if (!fn) return { file, text };
      const doc = parse(text) as Doc;
      fn(doc);
      return { file, text: stringify(doc, { lineWidth: 0 }) };
    });
  return validateLexicon(files, { programs: [topikII], forImport: options.forImport === true });
}

const errors = (issues: ValidationIssue[]) => issues.filter((i) => i.severity === "error");
const warnings = (issues: ValidationIssue[]) => issues.filter((i) => i.severity === "warning");
const has = (
  issues: ValidationIssue[],
  severity: "error" | "warning",
  file: string,
  pathPart: string,
  messagePart: string,
) =>
  issues.some(
    (i) =>
      i.severity === severity &&
      i.file === file &&
      i.path.includes(pathPart) &&
      i.message.includes(messagePart),
  );
const hasError = (i: ValidationIssue[], file: string, p: string, m: string) =>
  has(i, "error", file, p, m);
const hasWarning = (i: ValidationIssue[], file: string, p: string, m: string) =>
  has(i, "warning", file, p, m);

const word = (doc: Doc, id: string) => (doc.words as Doc[]).find((w) => w.id === id)!;

describe("lexicon-validation: fixture hợp lệ", () => {
  it("không có lỗi; chỉ cảnh báo chưa duyệt / cấp độ chưa đối chiếu", () => {
    const issues = run();
    expect(errors(issues)).toEqual([]);
    expect(warnings(issues).length).toBeGreaterThan(0);
    // Từ v-00003 có reviewed_by riêng -> chỉ 3/4 từ chưa duyệt
    expect(
      issues.some((i) => i.code === "not-reviewed" && i.message.includes("3 từ chưa duyệt")),
    ).toBe(true);
  });

  it("validateContent định tuyến vocab/ và grammar/ sang bộ kiểm riêng", () => {
    const files = Object.entries(FIXTURES).map(([file, text]) => ({ file, text }));
    const r = validateContent(files);
    expect(r.errorCount).toBe(0);
    expect(r.lexiconChecked).toBe(files.length);
    expect(r.filesChecked).toBe(0);
  });

  it("isLexiconPath và grammarTagOf", () => {
    expect(isLexiconPath(["topik-ii", "vocab", "general.yaml"])).toBe(true);
    expect(isLexiconPath(["topik-ii", "grammar", "groups", "x.yaml"])).toBe(true);
    expect(isLexiconPath(["topik-ii", "practice", "R10", "r10-0001.yaml"])).toBe(false);
    expect(isLexiconPath(["topik-ii"])).toBe(false);
    expect(grammarTagOf("-(으)ㄹ까 봐")).toBe("grammar:-(으)ㄹ까-봐");
    expect(grammarTagOf("-(으)ㄴ/는 탓에")).toBe("grammar:-(으)ㄴ/는-탓에");
  });

  it("reviewed_by hiệu lực: khoá riêng của mục thắng khoá của gốc", () => {
    expect(effectiveReviewedBy({}, { reviewed_by: "a" })).toBe("a");
    expect(effectiveReviewedBy({ reviewed_by: null }, { reviewed_by: "a" })).toBeNull();
    expect(effectiveReviewedBy({ reviewed_by: "b" }, { reviewed_by: null })).toBe("b");
    expect(effectiveReviewedBy({}, {})).toBeNull();
  });
});

describe("lexicon-validation: luật 12, import chỉ nhận mục đã duyệt", () => {
  it("--for-import: từ có reviewed_by hiệu lực null là LỖI, từ có khoá riêng thì qua", () => {
    const issues = run({}, { forImport: true });
    expect(hasError(issues, BATCH, "words[0].reviewed_by", "v-00001")).toBe(true);
    expect(errors(issues).some((i) => i.path === "words[2].reviewed_by")).toBe(false);
    expect(hasError(issues, G1, "reviewed_by", "không được import")).toBe(true);
    expect(hasError(issues, GROUP, "reviewed_by", "không được import")).toBe(true);
    expect(hasError(issues, TABLE, "reviewed_by", "không được import")).toBe(true);
  });

  it("gốc lô đã duyệt thì mọi từ không có khoá riêng đều qua; khoá riêng null thắng", () => {
    const issues = run(
      {
        [BATCH]: (d) => {
          d.reviewed_by = "nguoi-dung";
          word(d, "v-00003").reviewed_by = null;
        },
      },
      { forImport: true },
    );
    expect(hasError(issues, BATCH, "words[2].reviewed_by", "v-00003")).toBe(true);
    expect(errors(issues).filter((i) => i.file === BATCH)).toHaveLength(1);
  });

  it("source khác original là lỗi", () => {
    const issues = run({
      [BATCH]: (d) => (d.source = "krdict"),
      [G1]: (d) => (d.source = "copied"),
    });
    expect(hasError(issues, BATCH, "source", "original")).toBe(true);
    expect(hasError(issues, G1, "source", "original")).toBe(true);
  });
});

describe("lexicon-validation: file và định dạng (luật 2–3)", () => {
  it("YAML hỏng, file rỗng, gốc là danh sách", () => {
    expect(hasError(run({}, { raw: { [BATCH]: "words: [\n  - a: b" } }), BATCH, "", "YAML")).toBe(
      true,
    );
    expect(hasError(run({}, { raw: { [BATCH]: "" } }), BATCH, "", "rỗng")).toBe(true);
    expect(hasError(run({}, { raw: { [BATCH]: "- hangul: 학교\n" } }), BATCH, "", "map")).toBe(
      true,
    );
  });

  it("BOM, tab, CRLF", () => {
    const text = FIXTURES[BATCH]!;
    expect(hasError(run({}, { raw: { [BATCH]: "﻿" + text } }), BATCH, "", "BOM")).toBe(true);
    expect(
      hasError(run({}, { raw: { [BATCH]: text.replace(/\n/g, "\r\n") } }), BATCH, "", "CRLF"),
    ).toBe(true);
    expect(
      hasError(
        run({}, { raw: { [BATCH]: text.replace("  - id: v-00001", "\t- id: v-00001") } }),
        BATCH,
        "",
        "tab",
      ),
    ).toBe(true);
  });

  it("Hangul không NFC (dạng tổ hợp jamo)", () => {
    const issues = run({
      [BATCH]: (d) => (word(d, "v-00001").example_ko = "우리 사회는 변하고 있다.".normalize("NFD")),
    });
    expect(hasError(issues, BATCH, "example_ko", "NFC")).toBe(true);
  });

  it("batch phải trùng tên file; tên lô phải là topic hoặc general; program phải trùng thư mục", () => {
    expect(
      hasError(run({ [BATCH]: (d) => (d.batch = "economy") }), BATCH, "batch", "trùng tên file"),
    ).toBe(true);
    expect(hasError(run({ [BATCH]: (d) => delete d.batch }), BATCH, "batch", "thiếu")).toBe(true);
    expect(
      hasError(run({ [BATCH]: (d) => (d.program = "eps") }), BATCH, "program", "thư mục"),
    ).toBe(true);
    const renamed = Object.fromEntries(
      Object.entries(FIXTURES).map(([f, t]) => [
        f === BATCH ? "topik-ii/vocab/khong-phai-chu-de.yaml" : f,
        t,
      ]),
    );
    const issues = validateLexicon(
      Object.entries(renamed).map(([file, text]) => ({ file, text })),
      { programs: [topikII], forImport: false },
    );
    expect(hasError(issues, "topik-ii/vocab/khong-phai-chu-de.yaml", "", "topic")).toBe(true);
  });

  it("thiếu bảng âm tiết hoặc chương trình lạ", () => {
    const issues = run({}, { drop: [TABLE] });
    expect(hasError(issues, BATCH, "", "_hanja-syllables.yaml")).toBe(true);
    const unknown = validateLexicon([{ file: "khong-co/vocab/general.yaml", text: "a: 1" }], {
      programs: [topikII],
      forImport: false,
    });
    expect(unknown[0]!.message).toContain("chưa được cấu hình");
  });
});

describe("lexicon-validation: từ vựng (luật 1, 2, 4–9)", () => {
  it("thiếu trường bắt buộc, sai enum, level ngoài 1–6", () => {
    const issues = run({
      [BATCH]: (d) => {
        const w = word(d, "v-00001");
        delete w.meaning_vi;
        w.pos = "danh-tu";
        w.level = 7;
        w.level_basis = "tu-doan";
        delete w.example_vi;
      },
    });
    expect(hasError(issues, BATCH, "words[0].meaning_vi", "thiếu")).toBe(true);
    expect(hasError(issues, BATCH, "words[0].pos", "cho phép")).toBe(true);
    expect(hasError(issues, BATCH, "words[0].level", "1 đến 6")).toBe(true);
    expect(hasError(issues, BATCH, "words[0].level_basis", "cho phép")).toBe(true);
    expect(hasError(issues, BATCH, "words[0].example_vi", "thiếu")).toBe(true);
  });

  it("id sai định dạng hoặc trùng (cả giữa hai lô)", () => {
    expect(
      hasError(run({ [BATCH]: (d) => (word(d, "v-00001").id = "v-1") }), BATCH, "id", "v-NNNNN"),
    ).toBe(true);
    expect(
      hasError(run({ [BATCH]: (d) => (word(d, "v-00002").id = "v-00001") }), BATCH, "id", "trùng"),
    ).toBe(true);
    const second = stringify({ ...(parse(FIXTURES[BATCH]!) as Doc), batch: "economy" });
    const issues = run({}, {});
    expect(errors(issues)).toEqual([]);
    const dup = validateLexicon(
      [
        ...Object.entries(FIXTURES).map(([file, text]) => ({ file, text })),
        { file: "topik-ii/vocab/economy.yaml", text: second },
      ],
      { programs: [topikII], forImport: false },
    );
    expect(hasError(dup, BATCH, "id", "trùng với topik-ii/vocab/economy.yaml")).toBe(true);
  });

  it("hanja và han_viet/syllables phải đi cùng nhau", () => {
    const a = run({ [BATCH]: (d) => (word(d, "v-00001").han_viet = null) });
    expect(hasError(a, BATCH, "han_viet", "phải có han_viet")).toBe(true);
    const b = run({ [BATCH]: (d) => delete word(d, "v-00001").syllables });
    expect(hasError(b, BATCH, "syllables", "phải có syllables")).toBe(true);
    const c = run({ [BATCH]: (d) => (word(d, "v-00004").han_viet = "gi-do") });
    expect(hasError(c, BATCH, "han_viet", "phải là null")).toBe(true);
    const e = run({
      [BATCH]: (d) => (word(d, "v-00004").syllables = [{ ko: "어", hanja: "語", hv: "ngữ" }]),
    });
    expect(hasError(e, BATCH, "syllables", "không có syllables")).toBe(true);
    const f = run({ [BATCH]: (d) => delete word(d, "v-00001").hanja });
    expect(hasError(f, BATCH, "hanja", "thiếu")).toBe(true);
  });

  it("hanja chứa Hangul hoặc ký tự ngoài khối CJK", () => {
    const a = run({ [BATCH]: (d) => (word(d, "v-00002").hanja = "解決하다") });
    expect(hasError(a, BATCH, "hanja", "Hangul")).toBe(true);
    const b = run({ [BATCH]: (d) => (word(d, "v-00002").hanja = "解A") });
    expect(hasError(b, BATCH, "hanja", "CJK")).toBe(true);
  });

  it("nối hanja / hv / ko của syllables phải khớp từ (luật 5)", () => {
    const a = run({ [BATCH]: (d) => (word(d, "v-00001").hanja = "會社") });
    expect(hasError(a, BATCH, "syllables", "khác hanja của từ")).toBe(true);
    const b = run({ [BATCH]: (d) => (word(d, "v-00001").han_viet = "hội xã") });
    expect(hasError(b, BATCH, "han_viet", "khác phần nối hv")).toBe(true);
    const c = run({ [BATCH]: (d) => (word(d, "v-00001").hangul = "회사") });
    expect(hasError(c, BATCH, "hangul", "bắt đầu bằng")).toBe(true);
  });

  it("cặp (ko, hanja) phải có trong bảng; hv phải thuộc hv/alt_hv (luật 6)", () => {
    const a = run({
      [BATCH]: (d) => (word(d, "v-00001").syllables[0] = { ko: "사", hanja: "事", hv: "sự" }),
    });
    expect(hasError(a, BATCH, "syllables[0]", "chưa có trong _hanja-syllables.yaml")).toBe(true);
    const b = run({ [BATCH]: (d) => (word(d, "v-00001").syllables[0].hv = "tả") });
    expect(hasError(b, BATCH, "hv", "không thuộc hv")).toBe(true);
  });

  it("âm trong alt_hv hợp lệ nhưng cần giải thích; âm mặc định thì không", () => {
    const mutate = (d: Doc) => {
      const w = word(d, "v-00002");
      w.syllables[0].hv = "giới";
      w.han_viet = "giới quyết";
      delete w.note_vi;
      delete w.notes_internal;
    };
    const issues = run({ [BATCH]: mutate });
    expect(errors(issues)).toEqual([]);
    expect(hasWarning(issues, BATCH, "syllables[0]", "giải thích")).toBe(true);
    const explained = run({
      [BATCH]: (d) => {
        mutate(d);
        word(d, "v-00002").note_vi = "Âm khác mặc định, có giải thích.";
      },
    });
    expect(hasWarning(explained, BATCH, "syllables[0]", "giải thích")).toBe(false);
  });

  it("bảng âm tiết: dòng trùng khoá, chữ Hán sai", () => {
    const a = run({
      [TABLE]: (d) =>
        d.syllables.push({ ko: "사", hanja: "社", hv: "xã", alt_hv: [], meaning_vi: "trùng" }),
    });
    expect(hasError(a, TABLE, "syllables", "trùng khoá")).toBe(true);
    const b = run({ [TABLE]: (d) => (d.syllables[0].hanja = "ABC") });
    expect(hasError(b, TABLE, "hanja", "đúng một chữ Hán")).toBe(true);
    const c = run({ [TABLE]: (d) => (d.syllables[0].ko = "ab") });
    expect(hasError(c, TABLE, "ko", "Hangul")).toBe(true);
    const e = run({ [TABLE]: (d) => delete d.syllables[0].meaning_vi });
    expect(hasError(e, TABLE, "meaning_vi", "thiếu")).toBe(true);
  });

  it("false_friend: phải có khoá; object thiếu trường hoặc kind sai là lỗi", () => {
    const a = run({ [BATCH]: (d) => delete word(d, "v-00001").false_friend });
    expect(hasError(a, BATCH, "false_friend", "thiếu")).toBe(true);
    const b = run({ [BATCH]: (d) => (word(d, "v-00004").false_friend = { kind: "half" }) });
    expect(hasError(b, BATCH, "false_friend.kind", "cho phép")).toBe(true);
    expect(hasError(b, BATCH, "false_friend.vi_meaning", "thiếu")).toBe(true);
    expect(hasError(b, BATCH, "false_friend.note_vi", "thiếu")).toBe(true);
    const c = run({ [BATCH]: (d) => (word(d, "v-00004").false_friend = "ban-gia") });
    expect(hasError(c, BATCH, "false_friend", "null hoặc đối tượng")).toBe(true);
  });

  it("cảnh báo: cấp ngoài khoảng chương trình, chủ đề lạ, collocations ít, ví dụ thiếu phần Hán", () => {
    const issues = run({
      [BATCH]: (d) => {
        const w = word(d, "v-00001");
        w.level = 2;
        w.topics = ["khong-co-chu-de"];
        w.collocations = [{ ko: "사회 문제", vi: "vấn đề xã hội" }];
        w.example_ko = "이 도시는 빠르게 변하고 있다.";
      },
    });
    expect(errors(issues)).toEqual([]);
    expect(hasWarning(issues, BATCH, "words[0].level", "ngoài khoảng 3–6")).toBe(true);
    expect(hasWarning(issues, BATCH, "words[0].topics", "khong-co-chu-de")).toBe(true);
    expect(hasWarning(issues, BATCH, "words", "dưới 2 collocations")).toBe(true);
    expect(hasWarning(issues, BATCH, "words[0].example_ko", "phần Hán")).toBe(true);
  });

  it("cảnh báo: (hangul, hanja) trùng, ví dụ trùng, ví dụ hai câu, phần thuần Hàn lạ", () => {
    const issues = run({
      [BATCH]: (d) => {
        const dup = structuredClone(word(d, "v-00001"));
        dup.id = "v-00005";
        d.words.push(dup);
        word(d, "v-00002").example_ko = "문제를 해결한다. 그리고 쉰다.";
        word(d, "v-00003").hangul = "결정질하다";
      },
    });
    expect(hasWarning(issues, BATCH, "words[4]", "trùng với v-00001")).toBe(true);
    expect(hasWarning(issues, BATCH, "words[4].example_ko", "ví dụ trùng")).toBe(true);
    expect(hasWarning(issues, BATCH, "words[1].example_ko", "MỘT câu")).toBe(true);
    expect(hasWarning(issues, BATCH, "words[2].hangul", "phần thuần Hàn")).toBe(true);
  });

  it("từ retired không tính vào cảnh báo trùng; status sai là lỗi", () => {
    const retired = run({
      [BATCH]: (d) => {
        const dup = structuredClone(word(d, "v-00001"));
        dup.id = "v-00005";
        dup.status = "retired";
        dup.example_ko = "우리 사회는 늘 바쁘다.";
        d.words.push(dup);
      },
    });
    expect(hasWarning(retired, BATCH, "words[4]", "trùng với")).toBe(false);
    const bad = run({ [BATCH]: (d) => (word(d, "v-00001").status = "deleted") });
    expect(hasError(bad, BATCH, "status", "cho phép")).toBe(true);
  });

  it("cảnh báo: note_vi nhắc bạn giả nhưng false_friend là null", () => {
    const issues = run({
      [BATCH]: (d) => (word(d, "v-00001").note_vi = "Đây là một bạn giả Hán-Việt điển hình."),
    });
    expect(hasWarning(issues, BATCH, "false_friend", "bạn giả")).toBe(true);
    const negated = run({
      [BATCH]: (d) =>
        (word(d, "v-00001").note_vi = "Không phải bạn giả vì âm Hán-Việt không dùng."),
    });
    expect(hasWarning(negated, BATCH, "false_friend", "bạn giả")).toBe(false);
  });

  it("cảnh báo: lô quá 80 từ", () => {
    const issues = run({
      [BATCH]: (d) => {
        for (let i = 0; i < 80; i++) {
          const w = structuredClone(word(d, "v-00004"));
          w.id = `v-${String(100 + i).padStart(5, "0")}`;
          w.hangul = `어울리다${i}`;
          w.example_ko = `이 넥타이는 어울려요 ${i}.`;
          d.words.push(w);
        }
      },
    });
    expect(hasWarning(issues, BATCH, "words", "nên ≤ 80")).toBe(true);
  });
});

describe("lexicon-validation: ngữ pháp (luật 1, 2, 10, 11)", () => {
  it("thiếu trường, function sai, level sai", () => {
    const issues = run({
      [G1]: (d) => {
        delete d.meaning_vi;
        d.function = "khong-co";
        d.level = 0;
        delete d.body_md;
        delete d.constraints.register;
      },
    });
    expect(hasError(issues, G1, "meaning_vi", "thiếu")).toBe(true);
    expect(hasError(issues, G1, "function", "cho phép")).toBe(true);
    expect(hasError(issues, G1, "level", "1 đến 6")).toBe(true);
    expect(hasError(issues, G1, "body_md", "thiếu")).toBe(true);
    expect(hasError(issues, G1, "constraints.register", "thiếu")).toBe(true);
  });

  it("id/slug phải khớp tên file và đúng định dạng; id, slug, pattern không trùng", () => {
    expect(hasError(run({ [G1]: (d) => (d.id = "g-0009") }), G1, "id", "tên file")).toBe(true);
    expect(hasError(run({ [G1]: (d) => (d.slug = "sai-slug") }), G1, "slug", "tên file")).toBe(
      true,
    );
    expect(hasError(run({ [G1]: (d) => (d.id = "gg-1") }), G1, "id", "g-NNNN")).toBe(true);
    expect(hasError(run({ [G2]: (d) => (d.pattern = "-느라고") }), G2, "pattern", "trùng")).toBe(
      true,
    );
  });

  it("pattern: không ~, không jamo ghép, đúng bộ ký tự, không khoảng trắng kép", () => {
    expect(hasError(run({ [G1]: (d) => (d.pattern = "~느라고") }), G1, "pattern", "~")).toBe(true);
    expect(hasError(run({ [G1]: (d) => (d.pattern = "-나고") }), G1, "pattern", "jamo ghép")).toBe(
      true,
    );
    expect(hasError(run({ [G1]: (d) => (d.pattern = "-느라고!") }), G1, "pattern", "§5.1")).toBe(
      true,
    );
    expect(
      hasError(run({ [G1]: (d) => (d.pattern = "-는  바람에") }), G1, "pattern", "khoảng trắng"),
    ).toBe(true);
    expect(errors(run({ [G1]: (d) => (d.pattern = "N 때문에") })).some((e) => e.file === G1)).toBe(
      false,
    );
  });

  it("examples ≥ 3, common_mistakes_vi ≥ 1, form/host hợp lệ", () => {
    const a = run({ [G1]: (d) => (d.examples = d.examples.slice(0, 2)) });
    expect(hasError(a, G1, "examples", "ít nhất 3")).toBe(true);
    const b = run({ [G1]: (d) => (d.common_mistakes_vi = []) });
    expect(hasError(b, G1, "common_mistakes_vi", "ít nhất 1")).toBe(true);
    const c = run({ [G1]: (d) => (d.form[0].host = "X") });
    expect(hasError(c, G1, "form[0].host", "cho phép")).toBe(true);
    const e = run({ [G1]: (d) => (d.constraints.polarity = "xau") });
    expect(hasError(e, G1, "constraints.polarity", "cho phép")).toBe(true);
  });

  it("điểm thuộc nhóm so sánh phải có subject_vi, tense_vi, main_clause_vi, polarity", () => {
    const issues = run({
      [G1]: (d) => {
        delete d.constraints.subject_vi;
        delete d.constraints.polarity;
      },
    });
    expect(hasError(issues, G1, "constraints.subject_vi", "đủ")).toBe(true);
    expect(hasError(issues, G1, "constraints.polarity", "đủ")).toBe(true);
    const free = run({
      [G1]: (d) => {
        d.compare_group = null;
        delete d.constraints.subject_vi;
      },
      [GROUP]: (d) => (d.members = ["g-0002"]),
    });
    expect(hasError(free, G1, "constraints.subject_vi", "đủ")).toBe(false);
  });

  it("non_examples: cảnh báo * và note_vi không bắt đầu bằng Sai", () => {
    const issues = run({
      [G1]: (d) => {
        d.non_examples[0].ko = "*비가 오느라고 못 갔어요.";
        d.non_examples[1].note_vi = "Vì dùng tính từ.";
      },
    });
    expect(hasWarning(issues, G1, "non_examples[0].ko", "*")).toBe(true);
    expect(hasWarning(issues, G1, "non_examples[1].note_vi", "Sai")).toBe(true);
    expect(errors(issues)).toEqual([]);
  });

  it("compare_group trỏ tới nhóm không tồn tại; nhóm không liệt kê điểm khai nhóm", () => {
    const a = run({ [G1]: (d) => (d.compare_group = "nhom-khong-co") });
    expect(hasError(a, G1, "compare_group", "không tồn tại")).toBe(true);
    // nhóm vẫn liệt kê g-0001 nhưng g-0001 khai nhóm khác
    expect(hasError(a, GROUP, "members", "không khai compare_group")).toBe(true);
    const b = run({}, { drop: [GROUP] });
    expect(hasError(b, G1, "compare_group", "không tồn tại")).toBe(true);
    expect(hasError(b, G2, "compare_group", "không tồn tại")).toBe(true);
    const c = run({
      [GROUP]: (d) => {
        d.members = ["g-0001"];
      },
    });
    expect(hasError(c, GROUP, "members", "2–5")).toBe(true);
    expect(hasError(c, G2, "compare_group", "không liệt kê")).toBe(true);
  });

  it("nhóm: thành viên không tồn tại, columns lệch pattern, số ô lệch cột", () => {
    const a = run({
      [GROUP]: (d) => {
        d.members = ["g-0001", "g-0002", "g-0099"];
        d.compare_table.columns.push("-xxx");
        for (const row of d.compare_table.rows) row.cells.push("…");
      },
    });
    expect(hasError(a, GROUP, "members", "g-0099")).toBe(true);
    const b = run({ [GROUP]: (d) => (d.compare_table.columns = ["-는 바람에", "-느라고"]) });
    expect(hasError(b, GROUP, "compare_table.columns", "khớp pattern")).toBe(true);
    const c = run({ [GROUP]: (d) => d.compare_table.rows[0].cells.push("thừa") });
    expect(hasError(c, GROUP, "rows[0].cells", "số cột")).toBe(true);
  });

  it("bảng so sánh phải đủ 7 criterion_key, mỗi khoá một lần, khoá lạ là lỗi, other được lặp", () => {
    const a = run({
      [GROUP]: (d) =>
        (d.compare_table.rows = d.compare_table.rows.filter(
          (r: Doc) => r.criterion_key !== "tense",
        )),
    });
    expect(hasError(a, GROUP, "compare_table.rows", '"tense"')).toBe(true);
    const b = run({
      [GROUP]: (d) => d.compare_table.rows.push({ ...d.compare_table.rows[0] }),
    });
    expect(hasError(b, GROUP, "compare_table.rows", '"meaning" xuất hiện 2 lần')).toBe(true);
    const c = run({ [GROUP]: (d) => (d.compare_table.rows[0].criterion_key = "khac") });
    expect(hasError(c, GROUP, "criterion_key", "cho phép")).toBe(true);
    const e = run({
      [GROUP]: (d) => d.compare_table.rows.push({ ...d.compare_table.rows.at(-1) }),
    });
    expect(errors(e)).toEqual([]);
  });

  it("contrast_examples: ≥ 2 tình huống, member thuộc nhóm, ok phải là boolean", () => {
    const a = run({ [GROUP]: (d) => (d.contrast_examples = d.contrast_examples.slice(0, 1)) });
    expect(hasError(a, GROUP, "contrast_examples", "ít nhất 2")).toBe(true);
    const b = run({ [GROUP]: (d) => (d.contrast_examples[0].items[0].member = "g-0099") });
    expect(hasError(b, GROUP, "member", "không nằm trong members")).toBe(true);
    const c = run({ [GROUP]: (d) => (d.contrast_examples[0].items[0].ok = "no") });
    expect(hasError(c, GROUP, "ok", "true hoặc false")).toBe(true);
  });

  it("ok: false mà note_vi không bắt đầu bằng 'Sai:' (hiện là cảnh báo, chờ sửa nội dung)", () => {
    const issues = run({
      [GROUP]: (d) => (d.contrast_examples[0].items[0].note_vi = "Sai như trên."),
    });
    expect(hasWarning(issues, GROUP, "items[0].note_vi", 'bắt đầu bằng "Sai:"')).toBe(true);
    expect(issues.find((i) => i.code === "ok-false-prefix")?.severity).toBe("warning");
    expect(errors(issues)).toEqual([]);
  });

  it("nhóm: slug trùng tên file, thiếu mẹo chọn nhanh, level lệch cấp thấp nhất", () => {
    expect(hasError(run({ [GROUP]: (d) => (d.slug = "khac") }), GROUP, "slug", "tên file")).toBe(
      true,
    );
    expect(
      hasError(
        run({ [GROUP]: (d) => (d.decision_tips_vi = []) }),
        GROUP,
        "decision_tips_vi",
        "ít nhất 1",
      ),
    ).toBe(true);
    expect(
      hasWarning(run({ [GROUP]: (d) => (d.level = 5) }), GROUP, "level", "cấp thấp nhất"),
    ).toBe(true);
  });

  it("related trỏ tới điểm chưa có là cảnh báo", () => {
    const issues = run({ [G1]: (d) => (d.related = ["g-0002", "g-0077"]) });
    expect(hasWarning(issues, G1, "related", "g-0077")).toBe(true);
    expect(errors(issues)).toEqual([]);
  });
});
