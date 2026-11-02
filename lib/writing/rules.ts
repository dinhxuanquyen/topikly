/**
 * Kiểm tra quy tắc Viết tức thì (Giai đoạn 2B, bước 1 của pipeline Viết): chạy ngay trên máy
 * người học, không gọi AI, không chấm điểm. Chỉ bắt các lỗi HÌNH THỨC mà đề TOPIK trừ điểm nặng
 * và máy phát hiện được chắc chắn (docs/01 mục 2.3, content-spec mục 4.6):
 *  - số ký tự ngoài khung (W53 200–300, W54 600–700);
 *  - đuôi câu -요 / -습니다 trong bài văn viết -ㄴ다/-다 (W52–W54);
 *  - chép lại câu dẫn / câu hỏi gợi ý / dữ liệu của đề;
 *  - tiêu đề, gạch đầu dòng; khẩu ngữ; xưng 저/제; ý kiến cá nhân ở W53; rào đón ở W54;
 *  - W54 không chia đoạn; W51–W52 viết nhiều hơn một câu.
 *
 * Không kiểm tra nội dung, ngữ pháp hay việc trả lời đủ câu hỏi gợi ý: những phần đó cần chấm AI
 * hoặc tự đối chiếu với bài mẫu. Mỗi phát hiện có vị trí `start`/`end` trên văn bản gốc (đã NFC)
 * để giao diện tô sáng sau này.
 *
 * File này AN TOÀN CHO CLIENT: chỉ có kiểu và hàm thuần, không import node.
 */
import { countChars } from "@/lib/db/char-count";
import type { WritingCharLimit, WritingTypeCode } from "@/lib/practice/writing-types";

export type WritingRuleId =
  | "length"
  | "register"
  | "copied_prompt"
  | "title"
  | "list_marker"
  | "first_person"
  | "personal_opinion"
  | "colloquial"
  | "hedging"
  | "paragraphs"
  | "one_sentence";

/** `error`: đề trừ điểm nặng hoặc không chấm phần đó. `warning`: nên sửa, có thể bị hạ điểm. */
export type WritingRuleSeverity = "error" | "warning";

export interface WritingRuleMatch {
  /** Vị trí trên văn bản đã chuẩn hoá NFC (đầu vào của bạn là chuỗi gõ từ IME, vốn đã NFC). */
  start: number;
  end: number;
  text: string;
}

export interface WritingRuleFinding {
  id: WritingRuleId;
  severity: WritingRuleSeverity;
  matches: WritingRuleMatch[];
  /** Chỉ có ở `length`. */
  length?: { count: number; min: number; max: number; status: "below" | "above" };
  /** Chỉ có ở `register`: loại đuôi câu tìm thấy. */
  registers?: ("polite" | "formal")[];
}

export interface WritingRuleReport {
  /** Các quy tắc đã chạy với bài này, theo thứ tự hiển thị. */
  checked: WritingRuleId[];
  /** Các quy tắc vi phạm, theo thứ tự của `checked`. */
  findings: WritingRuleFinding[];
}

/** Đoạn liên tiếp trùng với đề, tính cả khoảng trắng (đã gộp), từ bao nhiêu ký tự thì coi là chép. */
export const COPY_MIN_CHARS = 20;
/** W54: số lần "-는 것 같다" từ bao nhiêu thì coi là lạm dụng rào đón. */
export const HEDGING_MIN_COUNT = 2;
/** W54: bài từ bao nhiêu ký tự mà vẫn một đoạn thì nhắc chia đoạn. */
export const PARAGRAPH_MIN_CHARS = 300;

// ------------------------------------------------------------------ Hangul

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** Chỉ số phụ âm cuối ㅂ trong bảng 28 patchim của Unicode. */
const JONG_BIEUP = 17;

function hasBieupBatchim(syllable: string | undefined): boolean {
  if (!syllable) return false;
  const code = syllable.codePointAt(0)!;
  if (code < HANGUL_BASE || code > HANGUL_LAST) return false;
  return (code - HANGUL_BASE) % 28 === JONG_BIEUP;
}

const HANGUL_RUN = /[가-힣]+$/u;

/** Danh từ kết thúc bằng 요 hay đứng cuối câu rút gọn; không phải đuôi lịch sự. */
const YO_NOUNS = new Set(["필요", "중요", "수요", "주요", "강요", "소요", "동요", "개요", "요요"]);

/** Phân loại đuôi của một từ cuối câu: -요 (lịch sự thân mật), -습니다 (trang trọng) hoặc null. */
export function classifyEnding(word: string): "polite" | "formal" | null {
  const run = HANGUL_RUN.exec(word)?.[0];
  if (!run) return null;
  if (run.endsWith("요") || run.endsWith("죠")) {
    return YO_NOUNS.has(run) ? null : "polite";
  }
  if (run.endsWith("니다") || run.endsWith("니까")) {
    const before = run.at(-3);
    if (before === "습" || hasBieupBatchim(before)) return "formal";
    return null;
  }
  // -(으)십시오 và -ㅂ시다 cũng là đuôi trang trọng.
  if (run.endsWith("십시오")) return "formal";
  if (run.endsWith("시다") && hasBieupBatchim(run.at(-3))) return "formal";
  return null;
}

// ------------------------------------------------------------------ tách câu, tách từ

interface Span {
  start: number;
  end: number;
  text: string;
}

/** Tách câu theo dấu kết câu hoặc xuống dòng; giữ vị trí. Câu rỗng bị bỏ. */
export function splitSentences(text: string): Span[] {
  const spans: Span[] = [];
  for (const match of text.matchAll(/[^.?!。\n]+[.?!。]*["'”’)\]]*/gu)) {
    const raw = match[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (!/[가-힣A-Za-z0-9]/u.test(trimmed)) continue;
    const start = (match.index ?? 0) + lead;
    spans.push({ start, end: start + trimmed.length, text: trimmed });
  }
  return spans;
}

/** Tách từ theo khoảng trắng; `word` đã bỏ dấu câu hai đầu, vị trí là của `word`. */
function tokens(text: string): Span[] {
  const out: Span[] = [];
  for (const match of text.matchAll(/\S+/gu)) {
    const raw = match[0];
    const lead = /^[^가-힣A-Za-z0-9]*/u.exec(raw)![0].length;
    const tail = /[^가-힣A-Za-z0-9]*$/u.exec(raw)![0].length;
    if (lead + tail >= raw.length) continue;
    const start = (match.index ?? 0) + lead;
    out.push({
      start,
      end: start + raw.length - lead - tail,
      text: raw.slice(lead, raw.length - tail),
    });
  }
  return out;
}

function lastToken(sentence: Span): Span | undefined {
  const list = tokens(sentence.text);
  const last = list.at(-1);
  if (!last) return undefined;
  return { start: sentence.start + last.start, end: sentence.start + last.end, text: last.text };
}

// ------------------------------------------------------------------ từng quy tắc

function registerFinding(text: string, severity: WritingRuleSeverity): WritingRuleFinding | null {
  const matches: WritingRuleMatch[] = [];
  const registers = new Set<"polite" | "formal">();
  for (const sentence of splitSentences(text)) {
    const word = lastToken(sentence);
    if (!word) continue;
    const kind = classifyEnding(word.text);
    if (!kind) continue;
    registers.add(kind);
    matches.push(word);
  }
  if (matches.length === 0) return null;
  return {
    id: "register",
    severity,
    matches,
    registers: (["polite", "formal"] as const).filter((r) => registers.has(r)),
  };
}

/** Gộp khoảng trắng thành một dấu cách, giữ bản đồ vị trí về văn bản gốc. */
function compact(text: string): { value: string; map: number[] } {
  let value = "";
  const map: number[] = [];
  let pendingSpace = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (/\s/u.test(ch)) {
      if (value !== "" && pendingSpace < 0) pendingSpace = i;
      continue;
    }
    if (pendingSpace >= 0) {
      value += " ";
      map.push(pendingSpace);
      pendingSpace = -1;
    }
    value += ch;
    map.push(i);
  }
  return { value, map };
}

/** Các đoạn liên tiếp ≥ `COPY_MIN_CHARS` ký tự của bài trùng nguyên văn với một nguồn của đề. */
export function findCopiedSpans(text: string, sources: readonly string[]): WritingRuleMatch[] {
  const essay = compact(text);
  const pool = sources.map((s) => compact(s.normalize("NFC")).value).filter((s) => s !== "");
  if (pool.length === 0 || essay.value.length < COPY_MIN_CHARS) return [];
  const inSource = (piece: string) => pool.some((source) => source.includes(piece));

  const matches: WritingRuleMatch[] = [];
  let i = 0;
  while (i + COPY_MIN_CHARS <= essay.value.length) {
    if (!inSource(essay.value.slice(i, i + COPY_MIN_CHARS))) {
      i++;
      continue;
    }
    let j = i + COPY_MIN_CHARS;
    while (j < essay.value.length && inSource(essay.value.slice(i, j + 1))) j++;
    let end = j;
    while (end > i && essay.value[end - 1] === " ") end--;
    const start = essay.map[i]!;
    const stop = essay.map[end - 1]! + 1;
    matches.push({ start, end: stop, text: text.slice(start, stop) });
    i = j;
  }
  return matches;
}

const LIST_MARKER = /^[ \t]*(?:[-•·*▪○●◦]|\d{1,2}[.)]|[①-⑳]|[가-하][.)])[ \t]*/u;

type Line = Span;

function nonEmptyLines(text: string): Line[] {
  const lines: Line[] = [];
  let offset = 0;
  for (const raw of text.split("\n")) {
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed !== "")
      lines.push({ start: offset + lead, end: offset + lead + trimmed.length, text: trimmed });
    offset += raw.length + 1;
  }
  return lines;
}

function titleMatch(lines: readonly Line[]): WritingRuleMatch | null {
  const first = lines[0];
  if (!first || lines.length < 2) return null;
  if (countChars(first.text) > 30) return null;
  if (/[.?!。]["'”’)\]]*$/u.test(first.text)) return null;
  if (LIST_MARKER.test(first.text)) return null;
  // Câu chưa chấm nhưng đã có đuôi vị ngữ (-다, -요…) thì không phải tiêu đề.
  if (/(?:다|요|까)$/u.test(first.text)) return null;
  return first;
}

function listMatches(lines: readonly Line[]): WritingRuleMatch[] {
  return lines
    .filter((line) => LIST_MARKER.test(line.text))
    .map((line) => {
      const marker = LIST_MARKER.exec(line.text)![0].trimEnd();
      return { start: line.start, end: line.start + marker.length, text: marker.trim() };
    });
}

const FIRST_PERSON_HUMBLE = new Set([
  "저",
  "저는",
  "저도",
  "저의",
  "저를",
  "저에게",
  "저한테",
  "제가",
  "제",
  "저희",
  "저희는",
  "저희가",
  "저희의",
  "저희도",
]);

/** Khẩu ngữ hay gặp trong bài của người học; không hợp văn viết của đề. */
const COLLOQUIAL = new Set([
  "너무",
  "진짜",
  "진짜로",
  "되게",
  "엄청",
  "근데",
  "그치만",
  "완전",
  "걍",
  "암튼",
  "좀",
  "젤",
]);

const W53_FIRST_PERSON = new Set(["나는", "내가", "나의", "필자는", "제", "저는", "제가"]);
const W53_OPINION =
  /생각(?:한다|된다|합니다|됩니다|해요|돼요)|(?:아|어|해)야\s?(?:한다|합니다|해요)|바람직하다/gu;
const HEDGING = /것\s?같(?:다|은|아|습니다|아요|았다)/gu;

function tokenMatches(text: string, words: ReadonlySet<string>): WritingRuleMatch[] {
  return tokens(text).filter((token) => words.has(token.text));
}

function regexMatches(text: string, pattern: RegExp): WritingRuleMatch[] {
  return [...text.matchAll(pattern)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    text: m[0],
  }));
}

function byStart(a: WritingRuleMatch, b: WritingRuleMatch) {
  return a.start - b.start;
}

// ------------------------------------------------------------------ đầu vào công khai

export interface EssayRuleInput {
  type_code: WritingTypeCode;
  text: string;
  char_limit?: WritingCharLimit;
  /** Nguồn để phát hiện chép đề: lệnh đề, nội dung đề (`task`), đoạn văn (`passage`). */
  sources?: readonly (string | undefined)[];
}

/**
 * Kiểm tra bài W53–W54 (cũng chạy được cho bài không có khung ký tự). Bài rỗng trả về báo cáo
 * rỗng: không nhắc lỗi khi người học chưa viết gì.
 */
export function checkEssay(input: EssayRuleInput): WritingRuleReport {
  const text = input.text.normalize("NFC");
  if (text.trim() === "") return { checked: [], findings: [] };
  const isW53 = input.type_code === "W53";
  const isW54 = input.type_code === "W54";
  const lines = nonEmptyLines(text);
  const checked: WritingRuleId[] = [];
  const findings: WritingRuleFinding[] = [];
  const add = (id: WritingRuleId, finding: WritingRuleFinding | null) => {
    checked.push(id);
    if (finding) findings.push(finding);
  };
  const simple = (
    id: WritingRuleId,
    severity: WritingRuleSeverity,
    matches: WritingRuleMatch[],
  ): WritingRuleFinding | null =>
    matches.length > 0 ? { id, severity, matches: matches.sort(byStart) } : null;

  if (input.char_limit) {
    const count = countChars(text);
    const { min, max } = input.char_limit;
    add(
      "length",
      count < min || count > max
        ? {
            id: "length",
            severity: "error",
            matches: [],
            length: { count, min, max, status: count < min ? "below" : "above" },
          }
        : null,
    );
  }

  add("register", registerFinding(text, "error"));

  const sources = (input.sources ?? []).filter((s): s is string => typeof s === "string");
  if (sources.length > 0)
    add("copied_prompt", simple("copied_prompt", "error", findCopiedSpans(text, sources)));

  const title = titleMatch(lines);
  add(
    "title",
    title ? { id: "title", severity: isW53 ? "error" : "warning", matches: [title] } : null,
  );
  add("list_marker", simple("list_marker", "warning", listMatches(lines)));

  if (isW53) {
    add(
      "personal_opinion",
      simple("personal_opinion", "warning", [
        ...tokenMatches(text, W53_FIRST_PERSON),
        ...regexMatches(text, W53_OPINION),
      ]),
    );
  } else {
    add("first_person", simple("first_person", "warning", tokenMatches(text, FIRST_PERSON_HUMBLE)));
  }

  add("colloquial", simple("colloquial", "warning", tokenMatches(text, COLLOQUIAL)));

  if (isW54) {
    const hedges = regexMatches(text, HEDGING);
    add(
      "hedging",
      hedges.length >= HEDGING_MIN_COUNT ? simple("hedging", "warning", hedges) : null,
    );
    add(
      "paragraphs",
      lines.length < 2 && countChars(text) >= PARAGRAPH_MIN_CHARS
        ? { id: "paragraphs", severity: "warning", matches: [] }
        : null,
    );
  }

  return { checked, findings };
}

export interface BlankRuleInput {
  type_code: WritingTypeCode;
  text: string;
}

/**
 * Kiểm tra một chỗ trống W51–W52: đúng một câu; W52 phải là văn viết -ㄴ다/-다. Văn phong của W51
 * theo văn bản gốc (biết sau khi xem đáp án) nên ở đây không kiểm tra.
 */
export function checkBlank(input: BlankRuleInput): WritingRuleReport {
  const text = input.text.normalize("NFC");
  if (text.trim() === "") return { checked: [], findings: [] };
  const checked: WritingRuleId[] = ["one_sentence"];
  const findings: WritingRuleFinding[] = [];

  const sentences = splitSentences(text);
  if (sentences.length > 1) {
    findings.push({ id: "one_sentence", severity: "error", matches: sentences.slice(1) });
  }
  if (input.type_code === "W52") {
    checked.push("register");
    const register = registerFinding(text, "error");
    if (register) findings.push(register);
  }
  return { checked, findings };
}

/** Có lỗi mức `error` không (để giao diện chọn giọng nhắc). */
export function hasRuleErrors(report: WritingRuleReport): boolean {
  return report.findings.some((f) => f.severity === "error");
}
