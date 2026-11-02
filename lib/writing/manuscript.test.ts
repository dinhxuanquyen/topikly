import { describe, expect, it } from "vitest";
import { estimateManuscriptCells } from "@/lib/db/manuscript";
import { listWritingPrompts, getWritingReveal } from "@/lib/practice/writing-source";
import {
  caretAt,
  frameRows,
  layoutManuscript,
  offsetAt,
  type ManuscriptLayout,
} from "./manuscript";

const CONFIG = { cells_per_line: 20, indent_cells: 1 };
const SMALL = { cells_per_line: 5, indent_cells: 1 };

/** Mỗi dòng của lưới thành chuỗi: ô trống là "_". */
function rowsOf(layout: ManuscriptLayout): string[] {
  return layout.rows.map((row) => row.cells.map((c) => c.text || "_").join("|"));
}

describe("layoutManuscript", () => {
  it("thụt một ô đầu đoạn, mỗi âm tiết và khoảng trắng một ô", () => {
    const layout = layoutManuscript("나는 학생", SMALL);
    expect(rowsOf(layout)).toEqual(["_|나|는|_|학", "생"]);
    expect(layout.usedCells).toBe(6);
    expect(layout.usedRows).toBe(2);
  });

  it("mỗi đoạn bắt đầu dòng mới; khoảng trắng đầu đoạn bị bỏ", () => {
    const layout = layoutManuscript("가나\n  다라", SMALL);
    expect(rowsOf(layout)).toEqual(["_|가|나", "_|다|라"]);
    expect(layout.paragraphs.map((p) => [p.firstRow, p.lastRow])).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it("không viết khoảng trắng ở ô đầu dòng", () => {
    // "가나다라" lấp đầy dòng 1 (1 ô thụt + 4), khoảng trắng tiếp theo rơi vào đầu dòng 2.
    expect(rowsOf(layoutManuscript("가나다라 마바", SMALL))).toEqual(["_|가|나|다|라", "마|바"]);
  });

  it("dấu chấm/phẩy rơi vào đầu dòng thì viết chung ô cuối dòng trước", () => {
    const layout = layoutManuscript("가나다라. 마", SMALL);
    expect(rowsOf(layout)).toEqual(["_|가|나|다|라.", "마"]);
    const shared = layout.rows[0]!.cells[4]!;
    expect([shared.start, shared.end]).toEqual([3, 5]);
  });

  it("sau dấu chấm, dấu phẩy không để ô trống; sau dấu hỏi thì có", () => {
    expect(rowsOf(layoutManuscript("가. 나, 다? 라", CONFIG))).toEqual(["_|가|.|나|,|다|?|_|라"]);
  });

  it("chữ số và chữ Latin thường hai ký tự một ô", () => {
    expect(rowsOf(layoutManuscript("2016년 abc 30%", CONFIG))).toEqual([
      "_|20|16|년|_|ab|c|_|30|%",
    ]);
  });

  it("mỗi ô giữ đúng vị trí trên văn bản gốc", () => {
    const text = "현대 사회는 빠르다.\n그러나 2024년에는";
    const layout = layoutManuscript(text, CONFIG);
    for (const row of layout.rows) {
      for (const cell of row.cells) {
        if (cell.kind === "char") expect(text.slice(cell.start, cell.end)).toBe(cell.text);
        if (cell.kind === "space") expect(text.slice(cell.start, cell.end)).toBe(" ");
      }
    }
  });

  it("bài rỗng chỉ có ô thụt của đoạn đầu", () => {
    const layout = layoutManuscript("", CONFIG);
    expect(layout.usedCells).toBe(0);
    expect(layout.rows).toHaveLength(1);
  });

  it("khung giấy: 300 ô = 15 dòng, 700 ô = 35 dòng", () => {
    expect(frameRows(300, CONFIG)).toBe(15);
    expect(frameRows(700, CONFIG)).toBe(35);
  });

  it("bài mẫu thật vừa khung và không vượt ước tính thô của validator", () => {
    for (const code of ["W53", "W54"] as const) {
      for (const prompt of listWritingPrompts("topik-ii", code)) {
        const reveal = getWritingReveal("topik-ii", prompt.id)!;
        for (const model of reveal.model_answers ?? []) {
          const layout = layoutManuscript(model.text.trimEnd(), CONFIG);
          expect(layout.usedCells, `${prompt.id} cấp ${model.level}`).toBeLessThanOrEqual(
            prompt.char_limit!.max,
          );
          expect(layout.usedRows * 20).toBeLessThanOrEqual(estimateManuscriptCells(model.text));
        }
      }
    }
  });
});

describe("con trỏ trên lưới", () => {
  const text = "가나다라. 마바\n사";
  const layout = layoutManuscript(text, SMALL);
  // Lưới: [_|가|나|다|라.] [마|바] [_|사]

  it("đặt con trỏ trước ô có chữ, sau chữ cuối, và ở đầu đoạn mới", () => {
    expect(caretAt(layout, 0)).toEqual({ row: 0, col: 1 });
    expect(caretAt(layout, 3)).toEqual({ row: 0, col: 4 });
    // Sau dấu chấm treo: mép phải dòng 1.
    expect(caretAt(layout, 5)).toEqual({ row: 0, col: 5 });
    // Sau khoảng trắng không viết (offset 5..6) → trước "마".
    expect(caretAt(layout, 6)).toEqual({ row: 1, col: 0 });
    expect(caretAt(layout, 7)).toEqual({ row: 1, col: 1 });
    expect(caretAt(layout, 8)).toEqual({ row: 1, col: 2 });
    expect(caretAt(layout, 9)).toEqual({ row: 2, col: 1 });
    expect(caretAt(layout, 10)).toEqual({ row: 2, col: 2 });
  });

  it("đoạn rỗng vừa xuống dòng: con trỏ sau ô thụt", () => {
    const fresh = layoutManuscript("가\n", SMALL);
    expect(caretAt(fresh, 2)).toEqual({ row: 1, col: 1 });
  });

  it("bấm vào ô trả về vị trí văn bản tương ứng", () => {
    expect(offsetAt(layout, 0, 2, text.length)).toBe(1);
    expect(offsetAt(layout, 0, 0, text.length)).toBe(0);
    // Chỗ trống sau chữ cuối của đoạn → cuối đoạn.
    expect(offsetAt(layout, 1, 4, text.length)).toBe(8);
    expect(offsetAt(layout, 1, 0, text.length)).toBe(6);
    // Dòng ngoài bài → cuối bài.
    expect(offsetAt(layout, 9, 0, text.length)).toBe(text.length);
  });

  it("đi qua lại giữa con trỏ và vị trí văn bản không lệch", () => {
    for (const offset of [0, 1, 2, 3, 5, 6, 7, 8, 9, 10]) {
      const caret = caretAt(layout, offset);
      expect(offsetAt(layout, caret.row, caret.col, text.length), `offset ${offset}`).toBe(offset);
    }
  });
});
