import { describe, expect, it } from "vitest";
import { manuscriptLayout } from "./manuscript-layout";

describe("manuscript preview", () => {
  it("indents paragraphs and wraps at 20 without an extra row on exact fit", () => {
    expect(manuscriptLayout("가".repeat(19))).toHaveLength(1);
    const rows = manuscriptLayout("가".repeat(20) + "\r\n나");
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.length === 20)).toBe(true);
    expect(rows[0][0]).toBe("");
    expect(rows[1][0]).toBe("가");
    expect(rows[2].slice(0, 2)).toEqual(["", "나"]);
  });
  it("normalizes composed Korean, counts code points and preserves inner spaces", () => {
    expect(manuscriptLayout("가 😀.  ")[0].slice(0, 5)).toEqual(["", "가", " ", "😀", "."]);
    expect(manuscriptLayout("\n  \r\n")).toEqual([]);
  });
});
