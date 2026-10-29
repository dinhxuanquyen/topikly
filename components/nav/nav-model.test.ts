import { describe, expect, it } from "vitest";
import { getPillarLinks, isFocusPath, isPathActive, resolveProgram } from "./nav-model";

describe("resolveProgram", () => {
  it("lấy chương trình từ segment đầu của URL", () => {
    expect(resolveProgram("/topik-ii/luyen-tap/doc/R39").slug).toBe("topik-ii");
    expect(resolveProgram("/topik-i").slug).toBe("topik-i");
    expect(resolveProgram("/eps/de-thi").slug).toBe("eps");
  });

  it("dùng chương trình mặc định khi ngoài chương trình hoặc segment lạ", () => {
    expect(resolveProgram("/").slug).toBe("topik-ii");
    expect(resolveProgram("/nang-cap").slug).toBe("topik-ii");
    expect(resolveProgram("/khong-ton-tai/luyen-tap").slug).toBe("topik-ii");
    expect(resolveProgram(null).slug).toBe("topik-ii");
  });
});

describe("isPathActive", () => {
  it("khớp đúng đường dẫn và trang con", () => {
    expect(isPathActive("/topik-ii/luyen-tap", "/topik-ii/luyen-tap")).toBe(true);
    expect(isPathActive("/topik-ii/luyen-tap/", "/topik-ii/luyen-tap")).toBe(true);
    expect(isPathActive("/topik-ii/luyen-tap/doc/R39", "/topik-ii/luyen-tap")).toBe(true);
  });

  it("không khớp tiền tố chuỗi hay chương trình khác", () => {
    expect(isPathActive("/topik-ii/luyen-tapx", "/topik-ii/luyen-tap")).toBe(false);
    expect(isPathActive("/topik-i/luyen-tap", "/topik-ii/luyen-tap")).toBe(false);
    expect(isPathActive("/topik-ii", "/topik-ii/luyen-tap")).toBe(false);
  });

  it("trang chủ chỉ khớp chính nó", () => {
    expect(isPathActive("/", "/")).toBe(true);
    expect(isPathActive("/blog", "/")).toBe(false);
  });
});

describe("getPillarLinks", () => {
  it("trả 5 trụ, trụ Nâng cấp dùng chung toàn site", () => {
    const links = getPillarLinks("topik-ii");
    expect(links.map((l) => l.key)).toEqual(["theory", "roadmap", "practice", "exams", "upgrade"]);
    expect(links.at(-1)?.href).toBe("/nang-cap");
  });
});

describe("isFocusPath", () => {
  it("chỉ trang làm bài một dạng là chế độ tập trung", () => {
    expect(isFocusPath("/topik-ii/luyen-tap/doc/R26")).toBe(true);
    expect(isFocusPath("/topik-ii/luyen-tap/viet/W53/")).toBe(true);
    expect(isFocusPath("/topik-ii/luyen-tap/doc")).toBe(false);
    expect(isFocusPath("/topik-ii/luyen-tap")).toBe(false);
    expect(isFocusPath("/topik-ii/de-thi/mini/doc-01")).toBe(false);
    expect(isFocusPath("/")).toBe(false);
  });
});
