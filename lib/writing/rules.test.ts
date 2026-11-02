import { describe, expect, it } from "vitest";
import { getFullExam, listExams } from "@/lib/exam/source";
import {
  getWritingPrompt,
  getWritingReveal,
  listWritingPrompts,
  listWritingTypes,
} from "@/lib/practice/writing-source";
import type { WritingPrompt, WritingReveal } from "@/lib/practice/writing-types";
import {
  checkBlank,
  checkEssay,
  classifyEnding,
  COPY_MIN_CHARS,
  findCopiedSpans,
  splitSentences,
  type WritingRuleId,
} from "./rules";

const ids = (report: { findings: { id: WritingRuleId }[] }) => report.findings.map((f) => f.id);

const W54_TASK =
  "요즘은 기다리는 시간을 줄여 주는 서비스가 빠르게 늘고 있다.\n· 현대 사회가 속도를 중시하게 된 이유는 무엇인가?";

describe("classifyEnding", () => {
  it("nhận ra đuôi -요 và -습니다/-ㅂ니다", () => {
    expect(classifyEnding("좋아요")).toBe("polite");
    expect(classifyEnding("필요하죠")).toBe("polite");
    expect(classifyEnding("있습니다")).toBe("formal");
    expect(classifyEnding("합니다")).toBe("formal");
    expect(classifyEnding("입니까")).toBe("formal");
    expect(classifyEnding("하십시오")).toBe("formal");
    expect(classifyEnding("갑시다")).toBe("formal");
  });

  it("không nhầm văn viết -다 và danh từ tận cùng bằng 요", () => {
    expect(classifyEnding("증가하였다")).toBeNull();
    expect(classifyEnding("아니다")).toBeNull();
    expect(classifyEnding("때문이니까")).toBeNull();
    expect(classifyEnding("필요")).toBeNull();
    expect(classifyEnding("중요")).toBeNull();
    expect(classifyEnding("하시다")).toBeNull();
    expect(classifyEnding("2024")).toBeNull();
  });
});

describe("splitSentences", () => {
  it("tách theo dấu kết câu và xuống dòng, giữ vị trí gốc", () => {
    const text = "첫 문장이다. 둘째 문장이다!\n셋째";
    const spans = splitSentences(text);
    expect(spans.map((s) => s.text)).toEqual(["첫 문장이다.", "둘째 문장이다!", "셋째"]);
    for (const span of spans) expect(text.slice(span.start, span.end)).toBe(span.text);
  });
});

describe("checkEssay", () => {
  it("bài rỗng không có báo cáo", () => {
    expect(checkEssay({ type_code: "W54", text: "  \n " })).toEqual({ checked: [], findings: [] });
  });

  it("bắt số ký tự ngoài khung", () => {
    const report = checkEssay({
      type_code: "W53",
      text: "조사 결과 이용자가 늘었다.",
      char_limit: { min: 200, max: 300 },
    });
    const length = report.findings.find((f) => f.id === "length");
    expect(length?.severity).toBe("error");
    expect(length?.length).toMatchObject({ min: 200, max: 300, status: "below" });
  });

  it("bắt đuôi -요/-습니다 và trả vị trí của từ cuối câu", () => {
    const text = "기술이 발달했어요. 그래서 편리해졌습니다. 그러나 문제도 있다.";
    const report = checkEssay({ type_code: "W54", text });
    const register = report.findings.find((f) => f.id === "register")!;
    expect(register.severity).toBe("error");
    expect(register.registers).toEqual(["polite", "formal"]);
    expect(register.matches.map((m) => m.text)).toEqual(["발달했어요", "편리해졌습니다"]);
    for (const m of register.matches) expect(text.slice(m.start, m.end)).toBe(m.text);
  });

  it("bắt đoạn chép nguyên văn từ đề nhưng cho dùng lại cụm từ khoá ngắn", () => {
    const copied = checkEssay({
      type_code: "W54",
      text: "요즘은 기다리는 시간을 줄여 주는 서비스가 빠르게 늘고 있다. 나는 이것이 좋다고 본다.",
      sources: [W54_TASK],
    });
    const finding = copied.findings.find((f) => f.id === "copied_prompt")!;
    expect(finding.matches[0]!.text).toContain("기다리는 시간을 줄여 주는 서비스가");

    const reused = checkEssay({
      type_code: "W54",
      text: "현대 사회가 속도를 중시하게 된 데에는 몇 가지 원인이 있다.",
      sources: [W54_TASK],
    });
    expect(ids(reused)).not.toContain("copied_prompt");
  });

  it("so khớp chép đề không phụ thuộc số khoảng trắng hay xuống dòng", () => {
    const text = "현대 사회가   속도를\n중시하게 된 이유는 무엇인가";
    const spans = findCopiedSpans(text, [W54_TASK]);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.end - spans[0]!.start).toBeGreaterThanOrEqual(COPY_MIN_CHARS);
    expect(text.slice(spans[0]!.start, spans[0]!.end)).toBe(spans[0]!.text);
  });

  it("W53 cấm tiêu đề (lỗi), W54 chỉ nhắc; bắt gạch đầu dòng", () => {
    const text = "도서 대출 현황\n- 종이책 대출은 줄었다.\n전자책 대출은 늘었다.";
    const w53 = checkEssay({ type_code: "W53", text });
    expect(w53.findings.find((f) => f.id === "title")?.severity).toBe("error");
    expect(w53.findings.find((f) => f.id === "list_marker")?.matches[0]?.text).toBe("-");
    const w54 = checkEssay({ type_code: "W54", text });
    expect(w54.findings.find((f) => f.id === "title")?.severity).toBe("warning");
  });

  it("W53 nhắc ý kiến cá nhân; W54 nhắc xưng 저/제, khẩu ngữ và rào đón", () => {
    const w53 = checkEssay({ type_code: "W53", text: "나는 전자책이 더 좋다고 생각한다." });
    expect(ids(w53)).toContain("personal_opinion");

    const w54 = checkEssay({
      type_code: "W54",
      text: "제가 보기에는 진짜 문제인 것 같다. 해결도 어려운 것 같다.",
    });
    expect(ids(w54)).toEqual(expect.arrayContaining(["first_person", "colloquial", "hedging"]));
    expect(w54.findings.find((f) => f.id === "colloquial")!.matches[0]!.text).toBe("진짜");
  });

  it("W54 dài mà một đoạn thì nhắc chia đoạn", () => {
    const long = "기술이 발달하면서 생활이 편리해졌다. ".repeat(20);
    expect(ids(checkEssay({ type_code: "W54", text: long }))).toContain("paragraphs");
    expect(ids(checkEssay({ type_code: "W54", text: `${long}\n${long}` }))).not.toContain(
      "paragraphs",
    );
  });
});

describe("checkBlank", () => {
  it("mỗi chỗ trống đúng một câu", () => {
    expect(ids(checkBlank({ type_code: "W51", text: "참석할 수 있습니다. 감사합니다." }))).toEqual([
      "one_sentence",
    ]);
    expect(ids(checkBlank({ type_code: "W51", text: "참석할 수 있습니다." }))).toEqual([]);
  });

  it("W52 phải là văn viết -다; W51 không kiểm tra văn phong", () => {
    expect(ids(checkBlank({ type_code: "W52", text: "더 피곤해질 수 있어요" }))).toEqual([
      "register",
    ]);
    expect(ids(checkBlank({ type_code: "W52", text: "더 피곤해질 수 있다" }))).toEqual([]);
    expect(checkBlank({ type_code: "W51", text: "참석할 수 있어요" }).checked).toEqual([
      "one_sentence",
    ]);
  });
});

// ------------------------------------------------------------------ nội dung thật

/** Bài mẫu đã qua kiểm duyệt nội dung không được bị báo lỗi nào (tránh báo nhầm cho người học). */
function expectModelAnswersClean(prompt: WritingPrompt, reveal: WritingReveal) {
  if (prompt.format === "essay") {
    expect(reveal.model_answers?.length ?? 0).toBeGreaterThan(0);
    for (const model of reveal.model_answers ?? []) {
      const report = checkEssay({
        type_code: prompt.type_code,
        text: model.text,
        char_limit: prompt.char_limit,
        sources: [prompt.stem, prompt.task, prompt.passage],
      });
      expect(report.findings, `${prompt.id} cấp ${model.level}`).toEqual([]);
    }
    return;
  }
  for (const blank of reveal.blanks ?? []) {
    for (const answer of blank.accepted_answers) {
      const report = checkBlank({ type_code: prompt.type_code, text: answer });
      expect(report.findings, `${prompt.id} ${blank.label}: ${answer}`).toEqual([]);
    }
  }
}

describe("bài mẫu và đáp án trong kho nội dung", () => {
  it("luyện tập Viết: không báo lỗi nào", () => {
    let checkedPrompts = 0;
    for (const type of listWritingTypes("topik-ii")) {
      for (const prompt of listWritingPrompts("topik-ii", type.type_code)) {
        expectModelAnswersClean(
          getWritingPrompt("topik-ii", prompt.id)!,
          getWritingReveal("topik-ii", prompt.id)!,
        );
        checkedPrompts++;
      }
    }
    expect(checkedPrompts).toBeGreaterThanOrEqual(4);
  });

  it("đề thi có phần Viết: không báo lỗi nào", () => {
    let checkedItems = 0;
    for (const summary of listExams("topik-ii")) {
      const exam = getFullExam("topik-ii", summary.kind, summary.id);
      for (const section of exam?.sections ?? []) {
        for (const item of section.writing_items ?? []) {
          expectModelAnswersClean(item.prompt, item.reveal);
          checkedItems++;
        }
      }
    }
    expect(checkedItems).toBeGreaterThanOrEqual(4);
  });

  it("bài sai văn phong ghi trong partial_answers của W52 bị bắt", () => {
    const prompt = listWritingPrompts("topik-ii", "W52")[0]!;
    const reveal = getWritingReveal("topik-ii", prompt.id)!;
    const politeAnswers = reveal.blanks!.flatMap((b) =>
      b.partial_answers.filter((a) => /요\.?$/u.test(a.trim())),
    );
    expect(politeAnswers.length).toBeGreaterThan(0);
    for (const answer of politeAnswers) {
      expect(ids(checkBlank({ type_code: "W52", text: answer }))).toContain("register");
    }
  });
});
