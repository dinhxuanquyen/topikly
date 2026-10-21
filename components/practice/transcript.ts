import type { PublicSpeaker } from "@/lib/practice/types";

export interface TranscriptLine {
  /** Nhãn người nói ("남자", "여자 2"…); undefined với dòng độc thoại không có nhãn. */
  speaker?: string;
  gender?: "male" | "female";
  text: string;
}

const LABELLED = /^([^:：]{1,10}?)\s*[:：]\s*(.+)$/;
const HANGUL_LABEL = /^[가-힯]+(?:\s?\d)?$/;

/**
 * Tách transcript_ko thành từng dòng. Nhãn "남자: " / "여자: " chỉ được coi là người nói khi
 * khớp danh sách `speakers` (hoặc, khi không có danh sách, trông như nhãn Hangul), để một dòng
 * độc thoại có dấu ":" giữa câu không bị cắt nhầm.
 */
export function parseTranscript(
  text: string,
  speakers: readonly PublicSpeaker[] = [],
): TranscriptLine[] {
  const known = new Map(speakers.map((s) => [s.label, s.gender] as const));
  const out: TranscriptLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = LABELLED.exec(line);
    if (match) {
      const label = match[1]!.trim();
      const isSpeaker = known.size > 0 ? known.has(label) : HANGUL_LABEL.test(label);
      if (isSpeaker) {
        out.push({ speaker: label, gender: known.get(label), text: match[2]!.trim() });
        continue;
      }
    }
    out.push({ text: line });
  }
  return out;
}
