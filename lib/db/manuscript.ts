import type { ManuscriptConfig } from "./programs";

/**
 * Ước tính số ô 원고지 (content-spec §5.7) — cách đếm thô để tránh bài mẫu tràn khung giấy:
 *  - mỗi đoạn chiếm `ceil((indent + số ký tự của đoạn) / cells_per_line)` dòng
 *    (mặc định: 1 ô thụt đầu đoạn, 20 ô một dòng);
 *  - tổng số ô = tổng số dòng × cells_per_line.
 * Mỗi dòng (`\n`) của văn bản là một đoạn (quy ước ngăn đoạn §5.2). Ký tự đếm theo code point
 * sau NFC, bỏ khoảng trắng cuối dòng. Cách đếm chính xác (quy tắc dấu câu) thuộc lib/writing.
 */
export const DEFAULT_MANUSCRIPT: ManuscriptConfig = { cells_per_line: 20, indent_cells: 1 };

export function manuscriptParagraphs(text: string): string[] {
  return text
    .normalize("NFC")
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/[ \t 　]+$/u, ""))
    .filter((line) => line.length > 0);
}

export function estimateManuscriptLines(
  text: string,
  config: ManuscriptConfig = DEFAULT_MANUSCRIPT,
): number {
  return manuscriptParagraphs(text).reduce(
    (lines, p) =>
      lines + Math.ceil((config.indent_cells + Array.from(p).length) / config.cells_per_line),
    0,
  );
}

export function estimateManuscriptCells(
  text: string,
  config: ManuscriptConfig = DEFAULT_MANUSCRIPT,
): number {
  return estimateManuscriptLines(text, config) * config.cells_per_line;
}
