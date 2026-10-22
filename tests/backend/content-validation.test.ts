import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import {
  formatReport,
  validateContent,
  type ContentFileInput,
  type ValidationOptions,
  type ValidationResult,
} from "@/lib/db/content-validation";
import { countChars } from "@/lib/db/char-count";
import { topikII, type ProgramConfig } from "@/lib/db/programs";

// ---------------------------------------------------------------- tiện ích

const VALID_ROOT = path.resolve(__dirname, "../fixtures/content/valid");

const R19 = "topik-ii/practice/R19/r19-0001.yaml";
const R10 = "topik-ii/practice/R10/r10-0001.yaml";
const L09 = "topik-ii/practice/L09/l09-0001.yaml";
const W52 = "topik-ii/practice/W52/w52-0001.yaml";
const W53 = "topik-ii/practice/W53/w53-0001.yaml";
const W54 = "topik-ii/practice/W54/w54-0001.yaml";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function readFixture(rel: string): string {
  return readFileSync(path.join(VALID_ROOT, rel), "utf8");
}

function load(rel: string): Doc {
  return parse(readFixture(rel)) as Doc;
}

function toInput(rel: string, doc: unknown): ContentFileInput {
  return { file: rel, text: stringify(doc, { lineWidth: 0 }) };
}

/** Validate một fixture sau khi chỉnh sửa (mutate). */
function run(
  rel: string,
  mutate?: (doc: Doc) => void,
  options?: ValidationOptions,
  extra: ContentFileInput[] = [],
): ValidationResult {
  const doc = load(rel);
  mutate?.(doc);
  return validateContent([toInput(rel, doc), ...extra], options);
}

function errors(r: ValidationResult) {
  return r.issues.filter((i) => i.severity === "error");
}
function warnings(r: ValidationResult) {
  return r.issues.filter((i) => i.severity === "warning");
}

/** Có lỗi (hoặc cảnh báo) tại path, thông báo chứa `text`. */
function hasError(r: ValidationResult, pathStr: string, text?: string): boolean {
  return errors(r).some((i) => i.path === pathStr && (!text || i.message.includes(text)));
}
function hasWarning(r: ValidationResult, pathStr: string, text?: string): boolean {
  return warnings(r).some((i) => i.path === pathStr && (!text || i.message.includes(text)));
}

/** Tạo câu R20 đi cùng r19-0001 (cùng group_key, cùng passage). */
function r20Doc(): Doc {
  const d = load(R19);
  d.id = "r20-0001";
  d.type_code = "R20";
  d.subskill = "main_idea";
  d.difficulty = 4;
  d.pair_with = ["r19-0001"];
  d.stem = "윗글의 주제로 가장 알맞은 것을 고르십시오.";
  return d;
}
const R20 = "topik-ii/practice/R20/r20-0001.yaml";

// ---------------------------------------------------------------- hợp lệ

describe("ví dụ hợp lệ (content-spec 5.10)", () => {
  it.each([
    ["A · Đọc R19", R19],
    ["B · Nghe L09", L09],
    ["C1 · Viết W52", W52],
    ["C2 · Viết W53", W53],
    ["C2 · Viết W54", W54],
  ])("%s không có lỗi", (_name, rel) => {
    const r = validateContent([{ file: rel, text: readFixture(rel) }]);
    expect(errors(r)).toEqual([]);
    expect(r.questionsChecked).toBe(1);
  });

  it("cặp R19 + R20 hợp lệ, không còn cảnh báo pair_with", () => {
    const r = validateContent([{ file: R19, text: readFixture(R19) }, toInput(R20, r20Doc())]);
    expect(errors(r)).toEqual([]);
    expect(warnings(r).filter((w) => w.path === "pair_with")).toEqual([]);
  });

  it("khi soạn: reviewed_by null chỉ là cảnh báo; pair_with trỏ id chưa có cũng chỉ là cảnh báo", () => {
    const r = validateContent([{ file: R19, text: readFixture(R19) }]);
    expect(r.errorCount).toBe(0);
    expect(hasWarning(r, "reviewed_by", "chưa duyệt")).toBe(true);
    expect(hasWarning(r, "pair_with", "r20-0001")).toBe(true);
  });

  it("file ngoài practice/ và exams/ (vocab, strategies…) được bỏ qua", () => {
    const r = validateContent([
      {
        file: "topik-ii/vocab/vocab-sample.yaml",
        text: readFixture("topik-ii/vocab/vocab-sample.yaml"),
      },
      { file: "topik-ii/strategies/ghi-chu.yaml", text: "id: chien-luoc-01" },
    ]);
    expect(r.filesSkipped).toBe(2);
    expect(r.filesChecked).toBe(0);
    expect(r.examsChecked).toBe(0);
    expect(r.issues).toEqual([]);
  });

  it("file đề thi (exams/) được kiểm riêng, không tính là file câu hỏi", () => {
    const r = validateContent([
      { file: R10, text: readFixture(R10) },
      {
        file: "topik-ii/exams/mini/doc-sample.yaml",
        text: readFixture("topik-ii/exams/mini/doc-sample.yaml"),
      },
    ]);
    expect(r.errorCount).toBe(0);
    expect(r.filesChecked).toBe(1);
    expect(r.examsChecked).toBe(1);
  });

  it("bài mẫu W53 trong fixture khớp cách đếm 5.7 (240 và 272, theo spec v0.3)", () => {
    const d = load(W53);
    expect(d.model_answers.map((m: Doc) => countChars(m.text))).toEqual([240, 272]);
  });
});

// ---------------------------------------------------------------- luật 1: thiếu trường / sai kiểu

describe("luật 1 · thiếu trường bắt buộc, sai kiểu dữ liệu", () => {
  it.each([
    [R19, "explanation_vi"],
    [R19, "passage"],
    [R19, "choices"],
    [R19, "tags"],
    [R19, "authored_by"],
    [R19, "source"],
    [R19, "reviewed_by"],
    [L09, "transcript_ko"],
    [L09, "transcript_vi"],
    [L09, "speakers"],
    [L09, "tts_notes"],
    [L09, "audio_url"],
    [W52, "blanks"],
    [W52, "register"],
    [W52, "scoring_notes_vi"],
    [W52, "common_mistakes_vi"],
    [W53, "task"],
    [W53, "required_points"],
    [W53, "char_limit"],
    [W53, "model_answers"],
    [W54, "scoring_notes_vi"],
  ])("%s thiếu %s -> lỗi", (rel, field) => {
    const r = run(rel, (d) => delete d[field]);
    expect(hasError(r, field, "thiếu trường bắt buộc")).toBe(true);
    expect(r.errorCount).toBeGreaterThan(0);
  });

  it("sai kiểu: difficulty là chuỗi, correct không phải bool", () => {
    const r = run(R19, (d) => {
      d.difficulty = "4";
      d.choices[0].correct = "yes";
    });
    expect(hasError(r, "difficulty")).toBe(true);
    expect(hasError(r, "choices[0].correct")).toBe(true);
  });

  it("chuỗi rỗng bị coi là thiếu nội dung", () => {
    const r = run(R19, (d) => (d.explanation_vi = "   "));
    expect(hasError(r, "explanation_vi", "không được để trống")).toBe(true);
  });

  it("thiếu note_vi của speaker không phải lỗi, thiếu label thì có", () => {
    const r = run(L09, (d) => delete d.speakers[0].label);
    expect(hasError(r, "speakers[0].label")).toBe(true);
  });

  it("YAML sai cú pháp -> lỗi cho đúng file đó", () => {
    const r = validateContent([{ file: R19, text: "id: [chưa đóng" }]);
    expect(errors(r)[0]?.message).toMatch(/cú pháp YAML/);
  });

  it("file rỗng -> lỗi", () => {
    const r = validateContent([{ file: R19, text: "" }]);
    expect(hasError(r, "", "file rỗng")).toBe(true);
  });

  it("mỗi file chỉ một câu: questions: [...] và danh sách đều bị từ chối", () => {
    const a = validateContent([{ file: R19, text: "questions:\n  - id: r19-0001\n" }]);
    expect(hasError(a, "questions", "MỘT câu hỏi")).toBe(true);
    const b = validateContent([{ file: R19, text: "- id: r19-0001\n" }]);
    expect(hasError(b, "", "MỘT câu hỏi")).toBe(true);
  });

  it("trường lạ chỉ bị cảnh báo", () => {
    const r = run(R19, (d) => (d.choises = []));
    expect(errors(r)).toEqual([]);
    expect(hasWarning(r, "choises")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 2: id

describe("luật 2 · id", () => {
  it("id sai regex", () => {
    const r = run(R19, (d) => (d.id = "R19-1"));
    expect(hasError(r, "id", "sai định dạng")).toBe(true);
  });

  it("id không khớp tên file", () => {
    const r = run(R19, (d) => (d.id = "r19-0002"));
    expect(hasError(r, "id", "không khớp tên file")).toBe(true);
  });

  it("tiền tố id không khớp type_code", () => {
    const rel = "topik-ii/practice/R19/r20-0001.yaml";
    const doc = load(R19);
    doc.id = "r20-0001";
    const r = validateContent([toInput(rel, doc)]);
    expect(hasError(r, "id", "tiền tố")).toBe(true);
  });

  it("id trùng giữa hai file -> lỗi ở file thứ hai", () => {
    const programs: ProgramConfig[] = [topikII, { ...topikII, code: "topik-i" }];
    const b = toInput("topik-i/practice/R19/r19-0001.yaml", load(R19));
    const r = run(R19, undefined, { programs }, [b]);
    expect(errors(r).some((i) => i.message.includes('id "r19-0001" trùng'))).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 3: type_code

describe("luật 3 · type_code", () => {
  it("không khớp thư mục", () => {
    const r = run(R19, (d) => {
      d.type_code = "R20";
      d.subskill = "main_idea";
    });
    expect(hasError(r, "type_code", "không khớp thư mục")).toBe(true);
  });

  it("practice/R40/ mà type_code R39 -> lỗi", () => {
    const rel = "topik-ii/practice/R40/r39-0001.yaml";
    const doc = load(R19);
    doc.id = "r39-0001";
    doc.type_code = "R39";
    const r = validateContent([toInput(rel, doc)]);
    expect(hasError(r, "type_code", 'thư mục "R40"')).toBe(true);
  });

  it.each(["R51", "L00", "W50", "X10", "r19"])("type_code %s sai regex", (code) => {
    const r = run(R19, (d) => (d.type_code = code));
    expect(hasError(r, "type_code")).toBe(true);
  });

  it("type_code hợp lệ theo regex nhưng chương trình không khai báo -> lỗi", () => {
    const small: ProgramConfig = {
      ...topikII,
      question_types: topikII.question_types.filter((t) => t.code !== "R19"),
    };
    const r = run(R19, undefined, { programs: [small] });
    expect(hasError(r, "type_code", "không có trong question_types")).toBe(true);
  });

  it("program khai báo trong file phải khớp đường dẫn", () => {
    const ok = run(R19, (d) => (d.program = "topik-ii"));
    expect(errors(ok)).toEqual([]);
    const bad = run(R19, (d) => (d.program = "topik-i"));
    expect(hasError(bad, "program", "không khớp")).toBe(true);
  });

  it("thư mục chương trình chưa cấu hình / đường dẫn sai bố cục", () => {
    const a = validateContent([{ file: "eps/practice/R19/r19-0001.yaml", text: readFixture(R19) }]);
    expect(hasError(a, "", "chưa được cấu hình")).toBe(true);
    const b = validateContent([
      { file: "topik-ii/practice/r19-0001.yaml", text: readFixture(R19) },
    ]);
    expect(hasError(b, "", "đường dẫn phải có dạng")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 4, 5

describe("luật 4 · subskill", () => {
  it("subskill ngoài tập cho phép của type_code", () => {
    const r = run(R19, (d) => (d.subskill = "insert_sentence"));
    expect(hasError(r, "subskill", "ngoài tập cho phép")).toBe(true);
  });

  it("subskill không có trong danh mục", () => {
    const r = run(R19, (d) => (d.subskill = "foo_bar"));
    expect(hasError(r, "subskill", "không có trong danh mục")).toBe(true);
  });

  it("subskill phụ được phép dùng (R20: central_thought)", () => {
    const doc = r20Doc();
    doc.subskill = "central_thought";
    const r = validateContent([toInput(R20, doc), { file: R19, text: readFixture(R19) }]);
    expect(errors(r)).toEqual([]);
  });
});

describe("luật 5 · difficulty 3–6", () => {
  it.each([2, 7, 0, 3.5])("difficulty %s -> lỗi", (v) => {
    const r = run(R19, (d) => (d.difficulty = v));
    expect(hasError(r, "difficulty")).toBe(true);
  });

  it.each([3, 4, 5, 6])("difficulty %s hợp lệ về miền giá trị", (v) => {
    const r = run(R19, (d) => (d.difficulty = v));
    expect(errors(r)).toEqual([]);
  });

  it("lệch mức điển hình 1 bậc mà không có notes_internal -> cảnh báo", () => {
    const r = run(R19, (d) => {
      d.difficulty = 5;
      delete d.notes_internal;
    });
    expect(hasWarning(r, "difficulty", "notes_internal")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 6: trắc nghiệm

describe("luật 6 · trắc nghiệm", () => {
  it("số phương án khác 4", () => {
    const r = run(R19, (d) => d.choices.pop());
    expect(hasError(r, "choices", "đúng 4 phương án")).toBe(true);
  });

  it("nhãn sai thứ tự", () => {
    const r = run(R19, (d) => {
      [d.choices[0].label, d.choices[1].label] = [d.choices[1].label, d.choices[0].label];
    });
    expect(hasError(r, "choices[0].label", "đúng thứ tự")).toBe(true);
    expect(hasError(r, "choices[1].label")).toBe(true);
  });

  it("có 2 đáp án đúng", () => {
    const r = run(R19, (d) => (d.choices[1].correct = true));
    expect(hasError(r, "choices", "đúng 1 đáp án đúng")).toBe(true);
  });

  it("không có đáp án đúng", () => {
    const r = run(R19, (d) => delete d.choices[0].correct);
    expect(hasError(r, "choices", "hiện có 0")).toBe(true);
  });

  it("correct: false được coi như không đúng", () => {
    const r = run(R19, (d) => (d.choices[1].correct = false));
    expect(errors(r)).toEqual([]);
  });

  it("phương án sai thiếu note_vi", () => {
    const r = run(R19, (d) => delete d.choices[2].note_vi);
    expect(hasError(r, "choices[2].note_vi", "thiếu note_vi")).toBe(true);
  });

  it("phương án sai có note_vi rỗng", () => {
    const r = run(R19, (d) => (d.choices[3].note_vi = "  "));
    expect(hasError(r, "choices[3].note_vi", "thiếu note_vi")).toBe(true);
  });

  it("đáp án đúng không cần note_vi", () => {
    const r = run(R19, (d) => delete d.choices[0].note_vi);
    expect(errors(r)).toEqual([]);
  });

  it("note_vi chỉ là chỗ giữ chỗ -> cảnh báo", () => {
    const r = run(R19, (d) => (d.choices[1].note_vi = "…"));
    expect(errors(r)).toEqual([]);
    expect(hasWarning(r, "choices[1].note_vi", "chỗ giữ chỗ")).toBe(true);
  });

  it("phương án sai thiếu trap -> chỉ cảnh báo; trap sai mã -> lỗi", () => {
    const a = run(R19, (d) => delete d.choices[1].trap);
    expect(errors(a)).toEqual([]);
    expect(hasWarning(a, "choices[1].trap")).toBe(true);
    const b = run(R19, (d) => (d.choices[1].trap = "khong_co"));
    expect(hasError(b, "choices[1].trap")).toBe(true);
  });

  it("text rỗng chỉ cho phép ở L01–L03", () => {
    const r = run(R19, (d) => (d.choices[2].text = ""));
    expect(hasError(r, "choices[2].text", "text rỗng")).toBe(true);
  });

  it("R39–R41 bắt buộc có insert_sentence", () => {
    const doc = load(R19);
    doc.id = "r40-0001";
    doc.type_code = "R40";
    doc.subskill = "insert_sentence";
    doc.difficulty = 5;
    delete doc.group_key;
    delete doc.pair_with;
    const rel = "topik-ii/practice/R40/r40-0001.yaml";
    expect(hasError(validateContent([toInput(rel, doc)]), "insert_sentence")).toBe(true);
    doc.insert_sentence = "그 결과 꿀벌의 개체 수가 빠르게 회복되었다.";
    expect(errors(validateContent([toInput(rel, doc)]))).toEqual([]);
  });

  it("R10 bắt buộc image_desc và chart_data", () => {
    const doc = load(R19);
    doc.id = "r10-0001";
    doc.type_code = "R10";
    doc.subskill = "chart_reading";
    delete doc.group_key;
    delete doc.pair_with;
    const r = validateContent([toInput("topik-ii/practice/R10/r10-0001.yaml", doc)]);
    expect(hasError(r, "image_desc")).toBe(true);
    expect(hasError(r, "chart_data")).toBe(true);
  });

  it("L01–L03: phương án là hình cần image_desc/chart_data, text được để rỗng", () => {
    const doc = load(L09);
    doc.id = "l01-0001";
    doc.type_code = "L01";
    doc.subskill = "picture_match";
    doc.image_desc = "Bối cảnh: thư viện.";
    for (const c of doc.choices) c.text = "";
    const rel = "topik-ii/practice/L01/l01-0001.yaml";
    const bad = validateContent([toInput(rel, doc)]);
    expect(hasError(bad, "choices[0]", "image_desc hoặc chart_data")).toBe(true);
    expect(errors(bad).some((e) => e.path.endsWith(".text"))).toBe(false);
    doc.choices.forEach((c: Doc, i: number) => (c.image_desc = `Tranh ${i + 1}`));
    expect(errors(validateContent([toInput(rel, doc)]))).toEqual([]);
  });
});

// ---------------------------------------------------------------- luật 7: Nghe

describe("luật 7 · Nghe", () => {
  it("số dòng transcript_vi lệch transcript_ko", () => {
    const r = run(
      L09,
      (d) => (d.transcript_vi = d.transcript_vi.split("\n").slice(0, 2).join("\n")),
    );
    expect(hasError(r, "transcript_vi", "số dòng")).toBe(true);
  });

  it("nhãn người nói không có trong speakers", () => {
    const r = run(L09, (d) => d.speakers.pop());
    expect(errors(r).some((e) => e.path === "transcript_ko" && e.message.includes("남자"))).toBe(
      true,
    );
  });

  it("dòng transcript không có nhãn người nói", () => {
    const r = run(L09, (d) => (d.transcript_ko = d.transcript_ko + "không có nhãn\n"));
    expect(
      errors(r).some((e) => e.path === "transcript_ko" && e.message.includes("nhãn hợp lệ")),
    ).toBe(true);
  });

  it("đề Nghe không có passage", () => {
    const r = run(L09, (d) => (d.passage = "ngữ liệu"));
    expect(hasError(r, "passage", "không in ngữ liệu")).toBe(true);
  });

  it("speaker.gender / age_range sai enum", () => {
    const r = run(L09, (d) => {
      d.speakers[0].gender = "nữ";
      d.speakers[1].age_range = "50s+";
    });
    expect(hasError(r, "speakers[0].gender")).toBe(true);
    expect(hasError(r, "speakers[1].age_range")).toBe(true);
  });

  it("audio_url có thể là null hoặc chuỗi", () => {
    expect(errors(run(L09, (d) => (d.audio_url = "https://cdn.example/l09.mp3")))).toEqual([]);
    expect(
      hasError(
        run(L09, (d) => (d.audio_url = 5)),
        "audio_url",
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 8: chart

describe("luật 8 · chart_data cần data_is_fictional: true", () => {
  it("W53 có chart_data mà data_is_fictional false", () => {
    const r = run(W53, (d) => (d.data_is_fictional = false));
    expect(hasError(r, "data_is_fictional")).toBe(true);
  });

  it("W53 thiếu data_is_fictional", () => {
    const r = run(W53, (d) => delete d.data_is_fictional);
    expect(hasError(r, "data_is_fictional")).toBe(true);
  });

  it("câu trắc nghiệm có chart_data mà không đánh dấu giả định", () => {
    const r = run(R19, (d) => {
      d.chart_data = {
        chart_type: "bar",
        title: "x",
        series: [{ name: "a", points: [{ x: "k", y: 1 }] }],
      };
    });
    expect(hasError(r, "data_is_fictional", "true")).toBe(true);
  });

  it("chart_type sai enum", () => {
    const r = run(W53, (d) => (d.chart_data[0].chart_type = "radar"));
    expect(hasError(r, "chart_data[0].chart_type")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 9: W53–W54

describe("luật 9 · W53–W54", () => {
  it.each([W53, W54])("%s: số bài mẫu khác 2", (rel) => {
    const r = run(rel, (d) => d.model_answers.pop());
    expect(hasError(r, "model_answers", "đúng 2 bài mẫu")).toBe(true);
  });

  it("char_count khai báo lệch so với đếm lại", () => {
    const r = run(W53, (d) => (d.model_answers[0].char_count = 250));
    expect(hasError(r, "model_answers[0].char_count", "đếm lại được 240")).toBe(true);
  });

  it("bài mẫu ngắn hơn char_limit.min (dù char_count khớp)", () => {
    const r = run(W53, (d) => {
      d.model_answers[0].text = "○○연구소에서 조사하였다.";
      d.model_answers[0].char_count = countChars(d.model_answers[0].text);
    });
    expect(hasError(r, "model_answers[0].text", "ngoài char_limit 200–300")).toBe(true);
  });

  it("bài mẫu dài hơn char_limit.max", () => {
    const r = run(W53, (d) => {
      d.model_answers[1].text = d.model_answers[1].text.repeat(2);
      d.model_answers[1].char_count = countChars(d.model_answers[1].text);
    });
    expect(hasError(r, "model_answers[1].text", "ngoài char_limit")).toBe(true);
  });

  it("bài mẫu sát biên dưới (<10 ký tự so với min) -> cảnh báo, không lỗi", () => {
    const r = run(W53, (d) => {
      const base = d.model_answers[1].text.trim();
      const text = base.slice(0, 205);
      d.model_answers[1].text = text;
      d.model_answers[1].char_count = countChars(text);
    });
    expect(errors(r)).toEqual([]);
    expect(hasWarning(r, "model_answers[1].text", "sát biên dưới")).toBe(true);
  });

  it("bài mẫu dùng đuôi -습니다. / -요.", () => {
    const a = run(W53, (d) => {
      d.model_answers[0].text = d.model_answers[0].text.replace("보인다.", "보입니다.");
      d.model_answers[0].char_count = countChars(d.model_answers[0].text);
    });
    expect(hasError(a, "model_answers[0].text", "문어체")).toBe(true);
    const b = run(W53, (d) => {
      d.model_answers[1].text = d.model_answers[1].text.replace("전망된다.", "전망돼요.");
      d.model_answers[1].char_count = countChars(d.model_answers[1].text);
    });
    expect(hasError(b, "model_answers[1].text", "문어체")).toBe(true);
  });

  it("covers không phủ đủ required_points", () => {
    const r = run(W53, (d) => (d.model_answers[0].covers = ["p1", "p2"]));
    expect(hasError(r, "model_answers[0].covers", "thiếu: p3")).toBe(true);
  });

  it("covers chứa id không tồn tại", () => {
    const r = run(W54, (d) => d.model_answers[1].covers.push("p9"));
    expect(hasError(r, "model_answers[1].covers", "p9")).toBe(true);
  });

  it("char_limit không khớp cấu hình chương trình", () => {
    const r = run(W53, (d) => (d.char_limit = { min: 200, max: 350 }));
    expect(hasError(r, "char_limit", "không khớp cấu hình")).toBe(true);
  });

  it("W53 bắt buộc image_desc và chart_data", () => {
    const r = run(W53, (d) => {
      delete d.image_desc;
      delete d.chart_data;
    });
    expect(hasError(r, "image_desc")).toBe(true);
    expect(hasError(r, "chart_data")).toBe(true);
  });

  it("rubric_notes_vi thiếu tiêu chí", () => {
    const r = run(W54, (d) => delete d.model_answers[0].rubric_notes_vi.organization);
    expect(hasError(r, "model_answers[0].rubric_notes_vi.organization")).toBe(true);
  });

  it("câu Viết có choices -> lỗi", () => {
    const r = run(W54, (d) => (d.choices = []));
    expect(hasError(r, "choices", "không có choices")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 10: W51–W52

describe("luật 10 · W51–W52", () => {
  it("chỗ trống có ít hơn 3 accepted_answers", () => {
    const r = run(W52, (d) => d.blanks[1].accepted_answers.pop());
    expect(hasError(r, "blanks[1].accepted_answers", "ít nhất 3")).toBe(true);
  });

  it("W52 có register khác written_plain", () => {
    const r = run(W52, (d) => (d.register = "polite"));
    expect(hasError(r, "register", "written_plain")).toBe(true);
  });

  it("W51 được dùng register khác", () => {
    const doc = load(W52);
    doc.id = "w51-0001";
    doc.type_code = "W51";
    doc.subskill = "practical_completion";
    doc.difficulty = 3;
    doc.register = "formal_polite";
    const r = validateContent([toInput("topik-ii/practice/W51/w51-0001.yaml", doc)]);
    expect(errors(r)).toEqual([]);
  });

  it("register ngoài enum", () => {
    const r = run(W52, (d) => (d.register = "casual"));
    expect(hasError(r, "register")).toBe(true);
  });

  it("số chỗ trống khác 2 / nhãn sai", () => {
    const a = run(W52, (d) => d.blanks.pop());
    expect(hasError(a, "blanks", "đúng 2 chỗ trống")).toBe(true);
    const b = run(W52, (d) => (d.blanks[0].label = "①"));
    expect(hasError(b, "blanks[0].label")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 11: group_key

describe("luật 11 · ngữ liệu chung của bộ câu", () => {
  it("passage khác nhau giữa hai file cùng group_key -> lỗi", () => {
    const doc = r20Doc();
    doc.passage = doc.passage.replace("산책", "걷기");
    const r = validateContent([{ file: R19, text: readFixture(R19) }, toInput(R20, doc)]);
    expect(
      errors(r).some(
        (e) => e.file === R20 && e.path === "passage" && e.message.includes("giống hệt"),
      ),
    ).toBe(true);
  });

  it("khác nhau chỉ một ký tự (khoảng trắng cuối) vẫn là lỗi", () => {
    const doc = r20Doc();
    doc.passage = doc.passage.trimEnd() + " ";
    const r = validateContent([{ file: R19, text: readFixture(R19) }, toInput(R20, doc)]);
    expect(errors(r).some((e) => e.path === "passage")).toBe(true);
  });

  it("Nghe: transcript_ko / transcript_vi / audio_url khác nhau", () => {
    const a = load(L09);
    a.id = "l21-0007";
    a.type_code = "L21";
    a.subskill = "central_thought";
    a.difficulty = 4;
    a.group_key = "l21-22-0007";
    a.pair_with = ["l22-0007"];
    const b = structuredClone(a);
    b.id = "l22-0007";
    b.type_code = "L22";
    b.subskill = "detail_match";
    b.pair_with = ["l21-0007"];
    const fa = "topik-ii/practice/L21/l21-0007.yaml";
    const fb = "topik-ii/practice/L22/l22-0007.yaml";
    expect(errors(validateContent([toInput(fa, a), toInput(fb, b)]))).toEqual([]);

    b.transcript_ko = b.transcript_ko.replace("민수", "지수");
    b.transcript_vi = b.transcript_vi + "Nam: thêm\n";
    b.audio_url = "https://cdn.example/x.mp3";
    const r = validateContent([toInput(fa, a), toInput(fb, b)]);
    const paths = errors(r)
      .filter((e) => e.message.includes("giống hệt"))
      .map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["transcript_ko", "transcript_vi", "audio_url"]));
  });

  it("dạng thuộc bộ mà thiếu group_key -> lỗi", () => {
    const r = run(R19, (d) => delete d.group_key);
    expect(hasError(r, "group_key", "thiếu group_key")).toBe(true);
  });

  it("group_key sai nhóm hoặc sai serial", () => {
    const a = run(R19, (d) => (d.group_key = "r21-22-0001"));
    expect(hasError(a, "group_key", "không khớp nhóm R19-20")).toBe(true);
    const b = run(R19, (d) => (d.group_key = "r19-20-0009"));
    expect(hasError(b, "group_key", "serial")).toBe(true);
    const c = run(R19, (d) => (d.group_key = "bat-ky"));
    expect(hasError(c, "group_key", "sai định dạng")).toBe(true);
  });

  it("câu đơn mà có group_key -> cảnh báo", () => {
    const r = run(L09, (d) => (d.group_key = "l09-09-0001"));
    expect(hasWarning(r, "group_key")).toBe(true);
  });
});

// ---------------------------------------------------------------- luật 12: --for-import

describe("luật 12 · import cần reviewed_by và source", () => {
  it("mặc định reviewed_by null là cảnh báo, không lỗi", () => {
    const r = run(R19);
    expect(errors(r)).toEqual([]);
    expect(warnings(r).some((w) => w.code === "not-reviewed")).toBe(true);
  });

  it("--for-import: reviewed_by null -> lỗi", () => {
    const r = run(R19, undefined, { forImport: true });
    expect(hasError(r, "reviewed_by", "không được import")).toBe(true);
  });

  it("--for-import: đã có reviewed_by thì qua", () => {
    const r = run(
      R19,
      (d) => {
        d.reviewed_by = "nguyen-van-a";
        d.reviewed_at = "2026-10-20";
      },
      { forImport: true },
    );
    expect(errors(r).filter((e) => e.path === "reviewed_by")).toEqual([]);
  });

  it("source khác original: cảnh báo khi soạn, lỗi khi import", () => {
    const soan = run(R19, (d) => (d.source = "niied"));
    expect(hasWarning(soan, "source", "original")).toBe(true);
    expect(errors(soan)).toEqual([]);
    const imp = run(R19, (d) => (d.source = "niied"), { forImport: true });
    expect(hasError(imp, "source", "original")).toBe(true);
  });
});

// ---------------------------------------------------------------- khác

describe("tags, NFC, pair_with, báo cáo", () => {
  it("thiếu topic: hoặc genre: -> lỗi", () => {
    const a = run(R19, (d) => (d.tags = ["genre:expository"]));
    expect(hasError(a, "tags", "topic:")).toBe(true);
    const b = run(R19, (d) => (d.tags = ["topic:health"]));
    expect(hasError(b, "tags", "genre:")).toBe(true);
  });

  it("nhiều genre hoặc tag sai dạng -> lỗi (v0.3)", () => {
    const r = run(R19, (d) => d.tags.push("genre:news", "Sai Dạng"));
    expect(hasError(r, "tags", "đúng 1 tag genre:")).toBe(true);
    expect(
      errors(r).some((e) => e.path.startsWith("tags[") && e.message.includes("sai định dạng")),
    ).toBe(true);
  });

  it("văn bản ở dạng NFD -> cảnh báo NFC", () => {
    const r = run(R19, (d) => (d.stem = d.stem.normalize("NFD")));
    expect(errors(r)).toEqual([]);
    expect(hasWarning(r, "stem", "NFC")).toBe(true);
  });

  it("formatReport: liệt kê theo file + đường dẫn trường, gộp cảnh báo chưa duyệt", () => {
    const r = run(R19, (d) => delete d.explanation_vi);
    const text = formatReport(r);
    expect(text).toContain(R19);
    expect(text).toContain("[LỖI] explanation_vi:");
    expect(text).toContain("chưa duyệt (reviewed_by: null)");
    expect(text).toMatch(/Không hợp lệ: 1 lỗi/);
    expect(formatReport(run(L09))).toMatch(/Hợp lệ\./);
  });
});
