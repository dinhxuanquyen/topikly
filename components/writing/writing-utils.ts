import type { WritingBlankReveal } from "@/lib/practice/writing-types";

/** Chuẩn hoá một câu trả lời để so khớp với đáp án mẫu: NFC, gộp khoảng trắng, bỏ dấu chấm cuối. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[.。]+$/u, "")
    .trim();
}

export type BlankMatch = "empty" | "accepted" | "partial" | "rejected" | "unknown";

/**
 * So khớp CHÍNH XÁC (sau chuẩn hoá) với danh sách đáp án của một chỗ trống. Đây không phải chấm
 * điểm: "unknown" nghĩa là không trùng đáp án nào trong danh sách, câu của bạn vẫn có thể đúng.
 */
export function matchBlank(answer: string, blank: WritingBlankReveal): BlankMatch {
  const value = normalizeAnswer(answer);
  if (value === "") return "empty";
  const same = (candidate: string) => normalizeAnswer(candidate) === value;
  if (blank.accepted_answers.some(same)) return "accepted";
  if (blank.partial_answers.some(same)) return "partial";
  if (blank.rejected_answers.some((r) => same(r.text))) return "rejected";
  return "unknown";
}

/** Tách passage thành các đoạn chữ và chỗ trống ( ㉠ ). Phần tử `blank` mang nhãn ㉠, ㉡… */
export type PassagePart = { kind: "text"; text: string } | { kind: "blank"; label: string };

const BLANK_MARK = /\(\s*([㉠-㉿])\s*\)/gu;

export function splitPassageLine(line: string): PassagePart[] {
  const parts: PassagePart[] = [];
  let last = 0;
  for (const match of line.matchAll(BLANK_MARK)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", text: line.slice(last, start) });
    parts.push({ kind: "blank", label: match[1]! });
    last = start + match[0].length;
  }
  if (last < line.length) parts.push({ kind: "text", text: line.slice(last) });
  return parts;
}
