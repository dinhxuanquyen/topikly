import { describe, expect, it } from "vitest";
import { getProgram, isProgramOpen } from "./programs";
import { getExamKind, getSkill, isValidExamId, parseTypeCode } from "./taxonomy";

describe("programs", () => {
  it("topik-ii đang mở, topik-i và eps sắp ra mắt, slug lạ không tồn tại", () => {
    expect(isProgramOpen(getProgram("topik-ii")!)).toBe(true);
    expect(isProgramOpen(getProgram("topik-i")!)).toBe(false);
    expect(isProgramOpen(getProgram("eps")!)).toBe(false);
    expect(getProgram("khong-ton-tai")).toBeUndefined();
  });
});

describe("taxonomy", () => {
  it("map slug kỹ năng sang mã kỹ năng phía dữ liệu", () => {
    expect(getSkill("nghe")?.code).toBe("listening");
    expect(getSkill("doc")?.code).toBe("reading");
    expect(getSkill("viet")?.code).toBe("writing");
    expect(getSkill("noi")).toBeUndefined();
  });

  it("nhận 4 loại đề", () => {
    for (const kind of ["full", "mini", "hard", "ibt"]) expect(getExamKind(kind)).toBeDefined();
    expect(getExamKind("practice")).toBeUndefined();
  });

  it("mã dạng câu phải đúng tiền tố kỹ năng", () => {
    const doc = getSkill("doc")!;
    expect(parseTypeCode(doc, "R39")).toBe("R39");
    expect(parseTypeCode(doc, "r39")).toBe("R39");
    expect(parseTypeCode(doc, "L39")).toBeNull();
    expect(parseTypeCode(doc, "R3")).toBeNull();
    expect(parseTypeCode(doc, "R390")).toBeNull();
  });

  it("kiểm tra mã đề", () => {
    expect(isValidExamId("01")).toBe(true);
    expect(isValidExamId("2025-04")).toBe(true);
    expect(isValidExamId("../x")).toBe(false);
    expect(isValidExamId("")).toBe(false);
  });
});
