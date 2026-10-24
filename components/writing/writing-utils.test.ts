import { describe, expect, it } from "vitest";
import { BLANKS_REVEAL } from "./writing-test-fixtures";
import { matchBlank, normalizeAnswer, splitPassageLine } from "./writing-utils";

describe("normalizeAnswer", () => {
  it("gộp khoảng trắng, bỏ dấu chấm cuối và khoảng trắng hai đầu", () => {
    expect(normalizeAnswer("  갈  수 없습니다. ")).toBe("갈 수 없습니다");
  });
});

describe("matchBlank", () => {
  const blank = BLANKS_REVEAL.blanks![0]!;

  it("trống -> empty", () => {
    expect(matchBlank("   ", blank)).toBe("empty");
  });
  it("trùng đáp án đạt điểm tối đa (bỏ qua dấu chấm cuối và khoảng trắng thừa)", () => {
    expect(matchBlank("참석할  수 없습니다", blank)).toBe("accepted");
    expect(matchBlank("갈 수 없습니다.", blank)).toBe("accepted");
  });
  it("trùng đáp án một phần hoặc đáp án sai đã biết", () => {
    expect(matchBlank("못 갑니다", blank)).toBe("partial");
    expect(matchBlank("안 갑니다", blank)).toBe("rejected");
  });
  it("không trùng đáp án nào -> unknown (không kết luận sai)", () => {
    expect(matchBlank("다른 문장입니다", blank)).toBe("unknown");
  });
});

describe("splitPassageLine", () => {
  it("tách chữ và chỗ trống ( ㉠ )", () => {
    expect(splitPassageLine("모임에 ( ㉠ ). 그래서 (㉡)")).toEqual([
      { kind: "text", text: "모임에 " },
      { kind: "blank", label: "㉠" },
      { kind: "text", text: ". 그래서 " },
      { kind: "blank", label: "㉡" },
    ]);
  });
  it("dòng không có chỗ trống giữ nguyên", () => {
    expect(splitPassageLine("안녕하세요.")).toEqual([{ kind: "text", text: "안녕하세요." }]);
  });
});
