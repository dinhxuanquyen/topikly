/**
 * Xếp bài viết vào khung 원고지 (giấy kẻ ô của bài thi giấy TOPIK), từng ô một. Đây là cách đếm
 * chính xác mà content-spec §5.7 để lại cho lib/writing; `lib/db/manuscript.ts` chỉ ước tính thô
 * để kiểm tra bài mẫu.
 *
 * Quy tắc 원고지 áp dụng (theo cách hướng dẫn phổ biến cho bài 53–54):
 *  1. Mỗi đoạn (một dòng `\n` của văn bản) bắt đầu ở dòng mới, để trống `indent_cells` ô đầu.
 *     Khoảng trắng người học gõ ở đầu đoạn bị bỏ (đã có ô thụt).
 *  2. Mỗi âm tiết Hangul, dấu câu, ký hiệu và mỗi khoảng trắng chiếm một ô.
 *  3. Chữ số Ả Rập và chữ Latin thường viết hai ký tự một ô ("2016" → 20 | 16).
 *  4. Khoảng trắng rơi vào ô đầu dòng thì không viết. Khoảng trắng ngay sau dấu chấm, dấu phẩy
 *     cũng không viết (chữ tiếp theo viết liền ô sau); sau ? và ! vẫn để một ô trống.
 *  5. Dấu câu đóng (. , ? ! : ; ) ” ’) rơi vào ô đầu dòng thì viết chung ô cuối dòng trước.
 *
 * Mỗi ô giữ vị trí [start, end) trên văn bản gốc để giao diện đặt con trỏ, chọn chữ và tô lỗi.
 * File này AN TOÀN CHO CLIENT: chỉ có kiểu và hàm thuần.
 */
import type { ManuscriptConfig } from "@/lib/db/programs/types";

export type { ManuscriptConfig };

export interface ManuscriptCell {
  /** Chữ viết trong ô; "" với ô thụt đầu đoạn và ô khoảng trắng. */
  text: string;
  kind: "indent" | "char" | "space";
  /** Vị trí trên văn bản gốc. Ô thụt đầu đoạn: start = end = đầu đoạn. */
  start: number;
  end: number;
}

export interface ManuscriptRow {
  /** Thứ tự đoạn (từ 0) của dòng này. */
  paragraph: number;
  cells: ManuscriptCell[];
}

export interface ManuscriptParagraph {
  /** Vị trí đầu/cuối đoạn trên văn bản gốc (cuối = vị trí ký tự `\n` hoặc hết văn bản). */
  start: number;
  end: number;
  firstRow: number;
  lastRow: number;
}

export interface ManuscriptLayout {
  cellsPerLine: number;
  indentCells: number;
  rows: ManuscriptRow[];
  paragraphs: ManuscriptParagraph[];
  /** Số ô tính từ đầu khung tới ô cuối cùng có chữ (0 nếu chưa viết gì). */
  usedCells: number;
  /** Số dòng tới dòng cuối cùng có chữ. */
  usedRows: number;
}

/** Vị trí con trỏ trong lưới: con trỏ nằm ở mép trái ô `col` (col = cellsPerLine: mép phải dòng). */
export interface ManuscriptCaret {
  row: number;
  col: number;
}

/** Dấu câu được treo vào ô cuối dòng trước khi rơi vào đầu dòng. */
const HANGING = new Set([".", ",", "?", "!", ":", ";", ")", "]", "”", "’", "。", "、"]);
/** Sau các dấu này, khoảng trắng không được viết thành ô. */
const NO_SPACE_AFTER = new Set([".", ",", "。", "、"]);
const PAIRED = /[0-9a-z]/u;

/** Đoạn văn bản theo `\n`, kèm vị trí. Dòng rỗng vẫn là một đoạn (để đặt con trỏ khi đang gõ). */
function splitParagraphs(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === "\n") {
      out.push({ start, end: i });
      start = i + 1;
    }
  }
  return out;
}

export function layoutManuscript(text: string, config: ManuscriptConfig): ManuscriptLayout {
  const cpl = Math.max(1, config.cells_per_line);
  const indent = Math.max(0, Math.min(config.indent_cells, cpl - 1));
  const rows: ManuscriptRow[] = [];
  const paragraphs: ManuscriptParagraph[] = [];
  let lastCharIndex = -1;

  splitParagraphs(text).forEach((para, paragraph) => {
    const firstRow = rows.length;
    let row: ManuscriptRow = { paragraph, cells: [] };
    rows.push(row);
    for (let k = 0; k < indent; k++) {
      row.cells.push({ text: "", kind: "indent", start: para.start, end: para.start });
    }

    const place = (cell: ManuscriptCell) => {
      if (row.cells.length >= cpl) {
        row = { paragraph, cells: [] };
        rows.push(row);
      }
      row.cells.push(cell);
      if (cell.kind === "char") lastCharIndex = (rows.length - 1) * cpl + row.cells.length - 1;
    };
    const rowFull = () => row.cells.length >= cpl;
    const lastCell = () => row.cells.at(-1);

    let i = para.start;
    // Khoảng trắng đầu đoạn: bỏ, ô thụt đầu đoạn đã thay cho nó.
    while (i < para.end && /[ \t　\r]/u.test(text[i]!)) i++;
    let previous = "";

    while (i < para.end) {
      const ch = text[i]!;
      if (ch === "\r") {
        i++;
        continue;
      }
      if (/[ \t　]/u.test(ch)) {
        if (!rowFull() && !NO_SPACE_AFTER.has(previous)) {
          place({ text: "", kind: "space", start: i, end: i + 1 });
        }
        previous = " ";
        i++;
        continue;
      }
      // Ký tự ngoài BMP (hiếm) vẫn là một ô.
      const code = text.codePointAt(i)!;
      const glyph = String.fromCodePoint(code);
      const width = glyph.length;

      const last = lastCell();
      if (HANGING.has(glyph) && rowFull() && last && last.kind !== "indent") {
        last.text += glyph;
        last.end = i + width;
        previous = glyph;
        i += width;
        continue;
      }
      if (PAIRED.test(glyph) && i + 1 < para.end && PAIRED.test(text[i + 1]!)) {
        place({ text: text.slice(i, i + 2), kind: "char", start: i, end: i + 2 });
        previous = text[i + 1]!;
        i += 2;
        continue;
      }
      place({ text: glyph, kind: "char", start: i, end: i + width });
      previous = glyph;
      i += width;
    }

    paragraphs.push({ start: para.start, end: para.end, firstRow, lastRow: rows.length - 1 });
  });

  const usedCells = lastCharIndex + 1;
  return {
    cellsPerLine: cpl,
    indentCells: indent,
    rows,
    paragraphs,
    usedCells,
    usedRows: Math.ceil(usedCells / cpl),
  };
}

/** Số dòng của khung giấy có `frameCells` ô. */
export function frameRows(frameCells: number, config: ManuscriptConfig): number {
  return Math.ceil(frameCells / Math.max(1, config.cells_per_line));
}

/** Con trỏ văn bản ở `offset` nằm ở ô nào của lưới. */
export function caretAt(layout: ManuscriptLayout, offset: number): ManuscriptCaret {
  const para =
    layout.paragraphs.find((p) => offset >= p.start && offset <= p.end) ?? layout.paragraphs.at(-1);
  if (!para) return { row: 0, col: layout.indentCells };
  let after: ManuscriptCaret | null = null;
  let afterEnd = -1;
  for (let r = para.firstRow; r <= para.lastRow; r++) {
    const cells = layout.rows[r]!.cells;
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c]!;
      if (cell.kind === "indent") continue;
      if (cell.end > offset) {
        if (offset > cell.start) return { row: r, col: c + 1 };
        // Ngay sau chữ trước, mà giữa hai ô là khoảng trắng không viết: con trỏ bám chữ trước.
        if (after && afterEnd === offset && cell.start > offset) return after;
        return { row: r, col: c };
      }
      after = { row: r, col: c + 1 };
      afterEnd = cell.end;
    }
  }
  return after ?? { row: para.firstRow, col: layout.indentCells };
}

/**
 * Vị trí văn bản ứng với ô (row, col) khi người học bấm vào lưới hoặc di chuyển lên/xuống dòng.
 * Ô có chữ → trước chữ đó; chỗ trống sau chữ cuối của dòng → sau chữ cuối; dòng ngoài bài → cuối bài.
 */
export function offsetAt(
  layout: ManuscriptLayout,
  row: number,
  col: number,
  textLength: number,
): number {
  const target = layout.rows[row];
  if (!target) return row < 0 ? 0 : textLength;
  const cell = target.cells[col];
  if (cell) {
    if (cell.kind !== "indent") return cell.start;
    // Ô thụt: về chữ đầu tiên của dòng (hoặc đầu đoạn nếu đoạn rỗng).
    const first = target.cells.find((c) => c.kind !== "indent");
    return first ? first.start : cell.start;
  }
  const last = target.cells.at(-1);
  if (!last) return textLength;
  if (last.kind === "indent") return last.end;
  // Dòng cuối của đoạn: chỗ trống sau chữ cuối là cuối đoạn (gồm cả khoảng trắng bị bỏ).
  const para = layout.paragraphs.find((p) => p.lastRow === row);
  return para ? para.end : last.end;
}
