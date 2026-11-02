/** Preview convention: 20 cells per line, one indented cell per nonempty paragraph.
 * Deliberately an estimate: punctuation is one code point per cell, without hanging punctuation.
 * Keep this independent of the editor so Korean IME composition stays native.
 */
export function manuscriptLayout(text: string, columns = 20): string[][] {
  if (!Number.isInteger(columns) || columns < 2) throw new RangeError("Invalid column count");
  const rows: string[][] = [];
  for (const paragraph of text.normalize("NFC").split(/\r\n|\r|\n/)) {
    const trimmed = paragraph.replace(/[ \t\u00a0\u3000]+$/u, "");
    if (!trimmed) continue;
    const cells = ["", ...Array.from(trimmed.replace(/\t/g, " "))];
    for (let i = 0; i < cells.length; i += columns) {
      const row = cells.slice(i, i + columns);
      rows.push([...row, ...Array<string>(columns - row.length).fill("")]);
    }
  }
  return rows;
}
