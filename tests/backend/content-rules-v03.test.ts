import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { countChars } from "@/lib/db/char-count";
import {
  analyzeAnswerLabels,
  checkChartSemantics,
  checkParagraphWhitespace,
  checkTags,
} from "@/lib/db/content-rules";
import {
  validateContent,
  type ContentFileInput,
  type ValidationResult,
} from "@/lib/db/content-validation";
import { verifyFormatOnly } from "@/lib/db/format-only";
import { estimateManuscriptCells, estimateManuscriptLines } from "@/lib/db/manuscript";
import { findQuestionType, topikII } from "@/lib/db/programs";

// ---------------------------------------------------------------- tiện ích

const VALID_ROOT = path.resolve(__dirname, "../fixtures/content/valid");
const R10 = "topik-ii/practice/R10/r10-0001.yaml";
const R19 = "topik-ii/practice/R19/r19-0001.yaml";
const L09 = "topik-ii/practice/L09/l09-0001.yaml";
const W53 = "topik-ii/practice/W53/w53-0001.yaml";
const W54 = "topik-ii/practice/W54/w54-0001.yaml";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const load = (rel: string): Doc => parse(readFileSync(path.join(VALID_ROOT, rel), "utf8")) as Doc;

const toInput = (rel: string, doc: unknown): ContentFileInput => ({
  file: rel,
  text: stringify(doc, { lineWidth: 0 }),
});

function run(rel: string, mutate?: (d: Doc) => void, extra: ContentFileInput[] = []) {
  const doc = load(rel);
  mutate?.(doc);
  return validateContent([toInput(rel, doc), ...extra]);
}

const errors = (r: ValidationResult) => r.issues.filter((i) => i.severity === "error");
const warnings = (r: ValidationResult) => r.issues.filter((i) => i.severity === "warning");
const hasError = (r: ValidationResult, p: string, text?: string) =>
  errors(r).some((i) => i.path === p && (!text || i.message.includes(text)));
const hasWarning = (r: ValidationResult, p: string, text?: string) =>
  warnings(r).some((i) => i.path === p && (!text || i.message.includes(text)));

// ---------------------------------------------------------------- age_range, trap, R10

describe("v0.3 · age_range, concession_point, R10", () => {
  it.each(["teen", "20s", "30s-40s", "50s", "60s+"])("age_range %s hợp lệ", (v) => {
    expect(errors(run(L09, (d) => (d.speakers[0].age_range = v)))).toEqual([]);
  });

  it.each(["50s+", "10s", "senior"])("age_range %s ngoài enum -> lỗi", (v) => {
    expect(
      hasError(
        run(L09, (d) => (d.speakers[0].age_range = v)),
        "speakers[0].age_range",
      ),
    ).toBe(true);
  });

  it("trap concession_point hợp lệ, danh mục có 18 mã", () => {
    expect(topikII.traps.map((t) => t.code)).toContain("concession_point");
    expect(errors(run(R19, (d) => (d.choices[1].trap = "concession_point")))).toEqual([]);
  });

  it("R10: bỏ passage, dùng chart_data[].caption -> hợp lệ", () => {
    const r = validateContent([toInput(R10, load(R10))]);
    expect(errors(r)).toEqual([]);
    expect(load(R10).passage).toBeUndefined();
    expect(load(R10).chart_data[0].caption).toBeTruthy();
  });

  it("R10 vẫn được có passage; các câu Đọc khác thiếu passage thì lỗi", () => {
    expect(errors(run(R10, (d) => (d.passage = "Đoạn chữ ngoài biểu đồ.")))).toEqual([]);
    expect(
      hasError(
        run(R19, (d) => delete d.passage),
        "passage",
      ),
    ).toBe(true);
  });

  it("L46 độ khó 5–6 theo v0.3 (5 không bị cảnh báo lệch)", () => {
    expect(findQuestionType("topik-ii", "L46")?.typical_difficulty).toEqual([5, 6]);
  });
});

// ---------------------------------------------------------------- chart_data

describe("v0.3 · chart_data luôn là list", () => {
  it("chart_data là đối tượng đơn (không phải list) -> lỗi", () => {
    const r = run(R10, (d) => (d.chart_data = d.chart_data[0]));
    expect(hasError(r, "chart_data", "luôn là list")).toBe(true);
  });

  it.each(["chart_type", "title", "unit", "series"])("phần tử thiếu %s -> lỗi", (field) => {
    const r = run(R10, (d) => delete d.chart_data[0][field]);
    expect(hasError(r, `chart_data[0].${field}`, "thiếu trường bắt buộc")).toBe(true);
  });

  it("caption là tuỳ chọn", () => {
    expect(errors(run(R10, (d) => delete d.chart_data[0].caption))).toEqual([]);
  });

  it("W53: chart_data là list nhiều biểu đồ, lỗi báo đúng chỉ số", () => {
    const r = run(W53, (d) => delete d.chart_data[1].title);
    expect(hasError(r, "chart_data[1].title")).toBe(true);
  });

  it("pie có tổng lệch 100 quá ±1 -> cảnh báo; ±1 thì không", () => {
    const pie = (y: number[]) => ({
      chart_type: "pie",
      unit: "%",
      series: [{ name: "x", points: y.map((v, i) => ({ x: `m${i}`, y: v })) }],
    });
    expect(checkChartSemantics(pie([52, 27, 21]))).toEqual([]);
    expect(checkChartSemantics(pie([52, 27, 20]))).toEqual([]); // 99
    expect(checkChartSemantics(pie([52, 27, 19]))[0]?.message).toMatch(/lệch 100/);
    const r = run(W53, (d) => (d.chart_data[1].series[0].points[0].y = 40));
    expect(hasWarning(r, "chart_data[1].series[0]", "lệch 100")).toBe(true);
    expect(errors(r)).toEqual([]);
  });

  it("pie phải có unit %", () => {
    const w = checkChartSemantics({ chart_type: "pie", unit: "명", series: [] });
    expect(w.some((x) => x.path === "unit")).toBe(true);
  });

  it("bar/line nhiều series phải cùng tập x và cùng thứ tự x", () => {
    const r = run(R10, (d) => d.chart_data[0].series[1].points.reverse());
    expect(hasWarning(r, "chart_data[0].series[1]", "cùng tập x")).toBe(true);
  });
});

// ---------------------------------------------------------------- tags

describe("v0.3 · tags: danh sách đóng", () => {
  const vocab = topikII.tag_vocabulary;

  it("danh sách đóng nằm trong cấu hình chương trình", () => {
    expect(vocab.topic).toContain("daily-life");
    expect(vocab.genre).toContain("edu-program");
    expect(vocab.genre).not.toContain("talk-show");
    expect(vocab.setting).toContain("museum");
    expect(vocab.free_prefixes).toEqual(["grammar", "connector", "idiom", "vocab"]);
  });

  it("tag hợp lệ, gồm giá trị tự do và 1 setting", () => {
    expect(
      checkTags(
        ["topic:health", "genre:expository", "setting:office", "grammar:-느라고", "vocab:능률"],
        vocab,
      ),
    ).toEqual([]);
  });

  it("thiếu topic, thiếu hoặc nhiều genre", () => {
    expect(checkTags(["genre:news"], vocab).some((p) => p.message.includes("topic:"))).toBe(true);
    expect(
      checkTags(["topic:health"], vocab).some((p) => p.message.includes("đúng 1 tag genre:")),
    ).toBe(true);
    expect(
      checkTags(["topic:health", "genre:news", "genre:lecture"], vocab).some((p) =>
        p.message.includes("hiện có 2"),
      ),
    ).toBe(true);
  });

  it("giá trị ngoài danh sách topic/genre/setting", () => {
    const r1 = checkTags(["topic:khong-co", "genre:news"], vocab);
    expect(r1.some((p) => p.message.includes('"khong-co"'))).toBe(true);
    const r2 = checkTags(["topic:health", "genre:talk-show"], vocab);
    expect(r2.some((p) => p.message.includes("talk-show"))).toBe(true);
    const r3 = checkTags(["topic:health", "genre:news", "setting:laundry"], vocab);
    expect(r3.some((p) => p.message.includes("laundry"))).toBe(true);
  });

  it("hơn 1 tag setting:", () => {
    const r = checkTags(["topic:health", "genre:news", "setting:office", "setting:phone"], vocab);
    expect(r.some((p) => p.message.includes("tối đa 1 tag setting:"))).toBe(true);
  });

  it("tiền tố lạ, sai định dạng, chữ hoa, có khoảng trắng", () => {
    for (const bad of ["level:4", "khongcoprefix", "Topic:health", "topic:Health", "topic:a b"]) {
      expect(checkTags(["topic:health", "genre:news", bad], vocab).length, bad).toBeGreaterThan(0);
    }
  });

  it("qua validator: lỗi nằm ở đường dẫn tags", () => {
    const r = run(R19, (d) => d.tags.push("setting:office", "setting:phone"));
    expect(hasError(r, "tags", "tối đa 1 tag setting:")).toBe(true);
    const r2 = run(R19, (d) => (d.tags[0] = "topic:khong-co"));
    expect(hasError(r2, "tags[0]", "khong-co")).toBe(true);
  });

  it("quá 8 tag -> cảnh báo", () => {
    const r = run(R19, (d) => d.tags.push("vocab:a", "vocab:b", "vocab:c", "vocab:d", "vocab:e"));
    expect(errors(r)).toEqual([]);
    expect(hasWarning(r, "tags", "nên tối đa 8")).toBe(true);
  });
});

// ---------------------------------------------------------------- khoảng trắng

describe("v0.3 · khoảng trắng (lỗi 14, §5.7)", () => {
  it("văn bản chuẩn không có lỗi; dấu chỗ trống (   ) được phép; \\n cuối được phép", () => {
    expect(checkParagraphWhitespace("가 나 (   ) 다.\n라 마.\n")).toEqual([]);
    expect(checkParagraphWhitespace("một dòng")).toEqual([]);
  });

  it.each([
    ["khoảng trắng đầu dòng", " 가나", "đầu dòng"],
    ["khoảng trắng cuối dòng", "가나 \n다라", "cuối dòng"],
    ["khoảng trắng kép", "가  나", "kép"],
    ["tab", "가\t나", "tab"],
    ["dòng trống", "가\n\n나", "dòng trống"],
  ])("%s -> lỗi", (_name, text, keyword) => {
    const problems = checkParagraphWhitespace(text);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.message.includes(keyword))).toBe(true);
  });

  it("báo số dòng", () => {
    expect(checkParagraphWhitespace("a\nb  c")[0]?.message).toMatch(/^dòng 2:/);
  });

  it.each([
    [R19, "passage"],
    [L09, "transcript_ko"],
    [L09, "transcript_vi"],
    [W53, "task"],
  ])("%s: trường %s bị kiểm", (rel, field) => {
    const r = run(rel, (d) => (d[field] = d[field].replace("\n", "\n\n")));
    expect(hasError(r, field, "dòng trống")).toBe(true);
    const r2 = run(rel, (d) => (d[field] = " " + d[field]));
    expect(hasError(r2, field, "đầu dòng")).toBe(true);
  });

  it("model_answers[].text bị kiểm (kể cả khoảng trắng kép)", () => {
    const r = run(
      W54,
      (d) => (d.model_answers[0].text = d.model_answers[0].text.replace(". ", ".  ")),
    );
    expect(hasError(r, "model_answers[0].text", "kép")).toBe(true);
  });

  it("trường markdown (explanation_vi, scoring_notes_vi…) được phép có dòng trống", () => {
    const r = run(W54, (d) => {
      d.explanation_vi = "đoạn 1\n\nđoạn 2  có khoảng trắng kép";
      d.scoring_notes_vi = "a\n\nb";
    });
    expect(errors(r)).toEqual([]);
  });
});

// ---------------------------------------------------------------- transcript, trap

describe("v0.3 · nhãn transcript, trap, hội thoại", () => {
  it('nhãn hợp lệ dạng "남자: " / "여자 2: "', () => {
    const r = run(L09, (d) => {
      d.speakers.push({ label: "여자 2", gender: "female" });
      d.transcript_ko += "여자 2: 안녕하세요.\n";
      d.transcript_vi += "Nữ 2: Xin chào.\n";
    });
    expect(errors(r)).toEqual([]);
  });

  it.each(["민수: 안녕하세요.", "남자:안녕하세요.", "남자 : 안녕하세요.", "남자 12: 안녕하세요."])(
    "dòng %s không khớp ^(남자|여자)( [0-9])?: -> lỗi",
    (line) => {
      const r = run(L09, (d) => (d.transcript_ko += line + "\n"));
      expect(errors(r).some((e) => e.path === "transcript_ko")).toBe(true);
    },
  );

  it("hai dòng liền nhau cùng nhãn trong hội thoại -> cảnh báo; bài giảng thì không", () => {
    const split = (d: Doc) => {
      d.transcript_ko = d.transcript_ko.replace("\n여자: ", "\n남자: 추가.\n남자: ");
      d.transcript_vi = d.transcript_vi.replace("\nNữ: ", "\nNam: thêm.\nNam: ");
    };
    const a = run(L09, split);
    expect(hasWarning(a, "transcript_ko", "liền nhau cùng nhãn")).toBe(true);
    const b = run(L09, (d) => {
      split(d);
      d.tags = d.tags.map((t: string) => (t === "genre:conversation" ? "genre:lecture" : t));
    });
    expect(hasWarning(b, "transcript_ko", "liền nhau cùng nhãn")).toBe(false);
  });

  it("ít hơn 2 kiểu trap -> cảnh báo; miễn cho fill_blank_connector", () => {
    const sameTraps = (d: Doc) =>
      d.choices.forEach((c: Doc) => c.correct || (c.trap = "keyword_echo"));
    expect(hasWarning(run(L09, sameTraps), "choices", "ít nhất 2 kiểu")).toBe(true);
    // R19 (fill_blank_connector) cả ba nhiễu đều logic_mismatch mà không bị cảnh báo
    expect(warnings(run(R19)).some((w) => w.path === "choices")).toBe(false);
  });
});

// ---------------------------------------------------------------- bài mẫu: giới hạn mềm, ô 원고지

describe("v0.3 · giới hạn mềm của bài mẫu và ước tính ô 원고지", () => {
  it("công thức §5.7: 153/153/186/177 ký tự -> 8+8+10+9 = 35 dòng = 700 ô", () => {
    const text = [153, 153, 186, 177].map((n) => "가".repeat(n)).join("\n");
    expect(estimateManuscriptLines(text)).toBe(35);
    expect(estimateManuscriptCells(text)).toBe(700);
  });

  it("mỗi đoạn có 1 ô thụt đầu; đoạn 19 ký tự vừa 1 dòng, 20 ký tự cần 2 dòng", () => {
    expect(estimateManuscriptLines("가".repeat(19))).toBe(1);
    expect(estimateManuscriptLines("가".repeat(20))).toBe(2);
    expect(estimateManuscriptCells("")).toBe(0);
  });

  it("bỏ qua dòng trống và khoảng trắng cuối dòng khi ước tính", () => {
    expect(estimateManuscriptLines("가나  \n\n다라")).toBe(2);
  });

  it("fixture W53/W54 nằm trong giới hạn mềm: không có cảnh báo vượt", () => {
    for (const rel of [W53, W54]) {
      expect(warnings(run(rel)).filter((w) => w.message.includes("giới hạn mềm"))).toEqual([]);
    }
  });

  it("W53 > 290 ký tự -> cảnh báo (vẫn trong giới hạn cứng 300)", () => {
    const r = run(W53, (d) => {
      const base = d.model_answers[1].text.trim();
      d.model_answers[1].text = base + "가".repeat(295 - countChars(base));
      d.model_answers[1].char_count = 295;
    });
    expect(errors(r)).toEqual([]);
    expect(hasWarning(r, "model_answers[1].text", "giới hạn mềm 290 ký tự")).toBe(true);
  });

  it("W53 ≤ 290 ký tự nhưng > 300 ô -> cảnh báo ô 원고지", () => {
    // 6 đoạn ngắn: nhiều dòng thừa do làm tròn nhưng chưa tới 290 ký tự
    const r = run(W53, (d) => {
      const para = "가".repeat(41);
      const text = Array.from({ length: 7 }, () => para).join("\n");
      d.model_answers[0].text = text;
      d.model_answers[0].char_count = countChars(text);
    });
    expect(countChars(load(W53).model_answers[0].text)).toBeLessThan(290);
    expect(hasWarning(r, "model_answers[0].text", "ô 원고지")).toBe(true);
    expect(hasWarning(r, "model_answers[0].text", "ký tự vượt")).toBe(false);
  });

  it("W54 > 680 ký tự và > 700 ô -> cảnh báo; vượt 700 ký tự -> lỗi", () => {
    const longer = (n: number) => (d: Doc) => {
      const m = d.model_answers[1];
      const lines = m.text.trim().split("\n");
      lines[3] += "가".repeat(n - countChars(lines.join("\n")));
      m.text = lines.join("\n");
      m.char_count = countChars(m.text);
    };
    const soft = run(W54, longer(690));
    expect(errors(soft)).toEqual([]);
    expect(hasWarning(soft, "model_answers[1].text", "giới hạn mềm 680 ký tự")).toBe(true);
    expect(hasWarning(soft, "model_answers[1].text", "ô 원고지")).toBe(true);
    const hard = run(W54, longer(705));
    expect(hasError(hard, "model_answers[1].text", "ngoài char_limit")).toBe(true);
  });

  it("giới hạn mềm là dữ liệu cấu hình", () => {
    expect(topikII.writing_sample_limits).toEqual({
      W53: { max_chars: 290, max_cells: 300 },
      W54: { max_chars: 680, max_cells: 700 },
    });
    expect(topikII.manuscript).toEqual({ cells_per_line: 20, indent_cells: 1 });
  });
});

// ---------------------------------------------------------------- nhãn đúng của lô

describe("v0.3 · nhãn đúng của lô (khuyến nghị cho lô soạn)", () => {
  it("không quá 3 câu liền nhau cùng nhãn", () => {
    expect(analyzeAnswerLabels([0, 1, 1, 1, 2]).maxRun).toBe(3);
    const a = analyzeAnswerLabels([0, 1, 1, 1, 1, 2]);
    expect(a.maxRun).toBe(4);
    expect(a.runEnd).toBe(4);
  });

  it("phát hiện chu kỳ lặp liền nhau dài từ 4 (②④①③ │ ②④①③)", () => {
    expect(analyzeAnswerLabels([1, 3, 0, 2, 1, 3, 0, 2]).cycle).toEqual({ length: 4, start: 0 });
    expect(analyzeAnswerLabels([0, 0, 1, 3, 0, 2, 1, 3, 0, 2]).cycle).toEqual({
      length: 4,
      start: 2,
    });
    expect(analyzeAnswerLabels([1, 3, 0, 2, 2, 0, 3, 1]).cycle).toBeUndefined();
    expect(analyzeAnswerLabels([0, 1, 0, 1, 0, 1]).cycle).toBeUndefined(); // chu kỳ ngắn hơn 4
  });

  function batch(correct: number[]): ContentFileInput[] {
    return correct.map((c, i) => {
      const doc = load(R19);
      const serial = String(i + 1).padStart(4, "0");
      doc.id = `r19-${serial}`;
      doc.group_key = `r19-20-${serial}`;
      doc.pair_with = [`r20-${serial}`];
      doc.choices.forEach((x: Doc, k: number) => {
        if (k === c) x.correct = true;
        else delete x.correct;
        if (k === c) delete x.trap;
      });
      return toInput(`topik-ii/practice/R19/${doc.id}.yaml`, doc);
    });
  }

  it("lô ≥ 8 câu có chu kỳ hoặc dãy dài -> cảnh báo, không lỗi", () => {
    const cyc = validateContent(batch([1, 3, 0, 2, 1, 3, 0, 2]));
    expect(errors(cyc)).toEqual([]);
    expect(warnings(cyc).some((w) => w.message.includes("chu kỳ lặp nhãn"))).toBe(true);
    const run4 = validateContent(batch([0, 1, 2, 2, 2, 2, 3, 0]));
    expect(warnings(run4).some((w) => w.message.includes("4 câu liền nhau cùng nhãn đúng"))).toBe(
      true,
    );
  });

  it("lô nhỏ (< 8 câu) không bị kiểm; lô tốt không cảnh báo", () => {
    expect(
      warnings(validateContent(batch([0, 0, 0, 0]))).some((w) => w.message.includes("liền nhau")),
    ).toBe(false);
    const ok = validateContent(batch([0, 2, 1, 3, 3, 0, 1, 2, 0]));
    expect(warnings(ok).some((w) => w.path === "choices" && w.message.includes("nhãn"))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------- "chỉ định dạng" (§8.2)

describe("v0.3 · xác nhận 'chỉ định dạng' (§8.2)", () => {
  it("bỏ dòng trống, khoảng trắng thừa trong passage -> chỉ định dạng", () => {
    const before = load(R19);
    const after = structuredClone(before);
    before.passage = before.passage.replace(". ", ".\n\n");
    after.passage = after.passage.replace(".", " .").replace(" .", ".") + "  ";
    const r = verifyFormatOnly(before, after);
    expect(r.formatOnly).toBe(true);
    expect(r.formatChanges).toEqual(["passage"]);
  });

  it("đổi một chữ hoặc dấu câu -> thay đổi nội dung", () => {
    const before = load(R19);
    const after = structuredClone(before);
    after.passage = after.passage.replace("산책", "걷기");
    expect(verifyFormatOnly(before, after)).toMatchObject({
      formatOnly: false,
      contentChanges: ["passage"],
    });
    const after2 = structuredClone(before);
    after2.stem = after2.stem.replace(".", "!");
    expect(verifyFormatOnly(before, after2).contentChanges).toEqual(["stem"]);
  });

  it("tách đơn thoại thành nhiều dòng cùng nhãn (cả ko và vi) -> chỉ định dạng", () => {
    const before = load(L09);
    const after = structuredClone(before);
    after.transcript_ko = after.transcript_ko.replace(
      "남자: 네, 발표 자료는 어제 다 만들었어요. 그런데",
      "남자: 네, 발표 자료는 어제 다 만들었어요.\n남자: 그런데",
    );
    after.transcript_vi = after.transcript_vi.replace(
      "Nam: Vâng, tài liệu thuyết trình tôi làm xong hết hôm qua rồi. Nhưng",
      "Nam: Vâng, tài liệu thuyết trình tôi làm xong hết hôm qua rồi.\nNam: Nhưng",
    );
    const r = verifyFormatOnly(before, after);
    expect(r.formatOnly).toBe(true);
    expect(r.formatChanges.sort()).toEqual(["transcript_ko", "transcript_vi"]);
  });

  it("đổi thứ tự nhãn người nói hoặc đổi nhãn -> nội dung", () => {
    const before = load(L09);
    const after = structuredClone(before);
    after.transcript_ko = after.transcript_ko.replace("여자: 민수 씨", "남자: 민수 씨");
    expect(verifyFormatOnly(before, after).contentChanges).toEqual(["transcript_ko"]);
  });

  it("bỏ nhãn người nói khỏi transcript thì phần lời vẫn phải trùng", () => {
    const before = load(L09);
    const after = structuredClone(before);
    after.transcript_ko = after.transcript_ko.replace("잘되고", "잘 되고");
    expect(verifyFormatOnly(before, after).formatOnly).toBe(false);
  });

  it("chỉ đổi metadata (tags, trap, difficulty, notes_internal, reviewed_by) -> không tính là nội dung", () => {
    const before = load(R19);
    const after = structuredClone(before);
    after.tags = ["topic:health", "genre:news"];
    after.choices[1].trap = "keyword_echo";
    after.difficulty = 4;
    after.notes_internal = "chỉ định dạng";
    after.reviewed_by = "nguyen-van-a";
    const r = verifyFormatOnly(before, after);
    expect(r.formatOnly).toBe(true);
    expect(r.formatChanges).toEqual([]);
  });

  it("thay đổi nội dung ở lựa chọn, đáp án đúng, số phương án, trường Viết", () => {
    const before = load(R19);
    const a = structuredClone(before);
    a.choices[0].text = "그러나";
    expect(verifyFormatOnly(before, a).contentChanges).toEqual(["choices[0].text"]);
    const b = structuredClone(before);
    b.choices[0].correct = false;
    b.choices[1].correct = true;
    expect(verifyFormatOnly(before, b).formatOnly).toBe(false);
    const c = structuredClone(before);
    c.choices.pop();
    expect(verifyFormatOnly(before, c).contentChanges).toEqual(["choices"]);
    const w = load(W53);
    const w2 = structuredClone(w);
    w2.model_answers[0].text = w2.model_answers[0].text.replace("조사하였다", "분석하였다");
    expect(verifyFormatOnly(w, w2).contentChanges).toEqual(["model_answers[0].text"]);
  });

  it("thêm hoặc bỏ một trường nội dung -> nội dung", () => {
    const before = load(R19);
    const after = structuredClone(before);
    after.insert_sentence = "문장";
    expect(verifyFormatOnly(before, after).contentChanges).toEqual(["insert_sentence"]);
  });
});
