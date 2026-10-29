import { describe, expect, it } from "vitest";
import {
  countWordsOf,
  isAllowedHref,
  parseBlogMarkdown,
  readingMinutes,
  slugifyHeading,
  stripInline,
  uniqueId,
} from "@/lib/blog/markdown";

const codes = (body: string, lineOffset = 0) =>
  parseBlogMarkdown(body, { lineOffset }).errors.map((e) => `${e.line}:${e.code}`);

describe("blog/markdown: tiện ích chữ", () => {
  it("slugifyHeading: bỏ dấu, đ -> d, chữ thường, giữ chữ Hàn và chữ Hán", () => {
    expect(slugifyHeading("Cấu trúc đề TOPIK II")).toBe("cau-truc-de-topik-ii");
    expect(slugifyHeading("Đổi điểm: Nghe – Đọc!")).toBe("doi-diem-nghe-doc");
    expect(slugifyHeading("Từ 학교 (學校)")).toBe("tu-학교-學校");
    expect(slugifyHeading("한자어")).toBe("한자어");
    expect(slugifyHeading("???")).toBe("muc");
  });

  it("uniqueId: thêm -2, -3 và tránh đụng id có sẵn", () => {
    const used = new Set<string>();
    expect(uniqueId("a", used)).toBe("a");
    expect(uniqueId("a", used)).toBe("a-2");
    expect(uniqueId("a", used)).toBe("a-3");
    expect(uniqueId("a-2", used)).toBe("a-2-2");
  });

  it("stripInline, countWordsOf, readingMinutes", () => {
    expect(stripInline("**đậm** và *nghiêng* [chữ](/x)")).toBe("đậm và nghiêng chữ");
    expect(countWordsOf("Xin chào 한국어 và — 2024 !")).toBe(5);
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(1000)).toBe(5);
  });

  it("isAllowedHref: nội bộ (kể cả chữ Hán, percent-encode) và https; cấm phần còn lại", () => {
    for (const ok of [
      "/",
      "/topik-ii/luyen-tap",
      "/topik-ii/ly-thuyet/tu-vung/han-tu/經",
      "/topik-ii/ly-thuyet/tu-vung/han-tu/%E7%B6%93",
      "/blog/x#muc-1",
      "https://www.topik.go.kr/a?b=1",
    ]) {
      expect(isAllowedHref(ok), ok).toBe(true);
    }
    for (const bad of [
      "http://a.com",
      "javascript:alert(1)",
      "//evil.com",
      "/a b",
      "/a/../b",
      "/a/%2e%2e/b",
      "/a/%E0%A4%A",
      "de-thi",
      "mailto:a@b.c",
      "https://",
      "",
    ]) {
      expect(isAllowedHref(bad), bad).toBe(false);
    }
  });
});

describe("blog/markdown: khối", () => {
  const body = [
    "Đoạn một dòng đầu",
    "dòng hai cùng đoạn.",
    "",
    "## Mục một",
    "",
    "### Mục con",
    "",
    "- a",
    "* b",
    "  nối tiếp b",
    "",
    "1. x",
    "2. y",
    "",
    "> mẹo dòng 1",
    "> mẹo dòng 2",
    ">",
    "> khung mới",
    "",
    "| A | B |",
    "|---|:--:|",
    "| 1 | 2 |",
    "| 3 | 4 |",
    "",
    "## Mục hai",
    "Đoạn ngay sau tiêu đề.",
  ].join("\n");

  it("parse đầy đủ các loại khối, đoạn gộp dòng, mục lục chỉ gồm H2", () => {
    const r = parseBlogMarkdown(body);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toEqual([
      { kind: "p", text: "Đoạn một dòng đầu dòng hai cùng đoạn." },
      { kind: "h2", id: "muc-mot", text: "Mục một" },
      { kind: "h3", id: "muc-con", text: "Mục con" },
      { kind: "ul", items: ["a", "b nối tiếp b"] },
      { kind: "ol", items: ["x", "y"] },
      { kind: "quote", text: "mẹo dòng 1 mẹo dòng 2" },
      { kind: "quote", text: "khung mới" },
      {
        kind: "table",
        header: ["A", "B"],
        rows: [
          ["1", "2"],
          ["3", "4"],
        ],
      },
      { kind: "h2", id: "muc-hai", text: "Mục hai" },
      { kind: "p", text: "Đoạn ngay sau tiêu đề." },
    ]);
    expect(r.toc).toEqual([
      { id: "muc-mot", text: "Mục một" },
      { id: "muc-hai", text: "Mục hai" },
    ]);
    expect(r.wordCount).toBeGreaterThan(20);
  });

  it("id neo duy nhất giữa H2 và H3; văn bản tiêu đề là chữ thuần", () => {
    const r = parseBlogMarkdown("## Hán **tự**\n\n### Hán tự\n\n## Hán tự\n");
    expect(r.errors).toEqual([]);
    expect(r.blocks).toEqual([
      { kind: "h2", id: "han-tu", text: "Hán tự" },
      { kind: "h3", id: "han-tu-2", text: "Hán tự" },
      { kind: "h2", id: "han-tu-3", text: "Hán tự" },
    ]);
  });

  it("giữ dấu trong dòng ở đoạn, mục, ô bảng; ghi liên kết nội bộ kèm dòng", () => {
    const r = parseBlogMarkdown(
      "**đậm** [a](/x/y)\n\n- *n* [b](https://a.vn)\n\n| h |\n|---|\n| [c](/z/經) |",
      { lineOffset: 10 },
    );
    expect(r.errors).toEqual([]);
    expect(r.blocks[0]).toEqual({ kind: "p", text: "**đậm** [a](/x/y)" });
    expect(r.blocks[1]).toEqual({ kind: "ul", items: ["*n* [b](https://a.vn)"] });
    expect(r.internalLinks).toEqual([
      { line: 11, href: "/x/y" },
      { line: 17, href: "/z/經" },
    ]);
  });

  it("CRLF và BOM được chấp nhận; số dòng cộng lineOffset", () => {
    const r = parseBlogMarkdown("﻿## A\r\n\r\ntext\r\n#### B\r\n", { lineOffset: 5 });
    expect(r.errors).toEqual([{ line: 9, message: expect.any(String), code: "heading-depth" }]);
  });
});

describe("blog/markdown: cú pháp bị cấm (lỗi kèm số dòng)", () => {
  it("H1, ####, tiêu đề rỗng", () => {
    expect(codes("# Một\n\n#### Bốn\n\n##\n\n#hashtag không phải tiêu đề")).toEqual([
      "1:h1",
      "3:heading-depth",
      "5:heading-empty",
    ]);
  });

  it("H3 trước H2 -> lỗi; sau H2 thì được", () => {
    expect(codes("### Sớm\n\n## Đủ\n\n### Muộn")).toEqual(["1:h3-before-h2"]);
  });

  it("HTML thô, ảnh, mã trong dòng; <보기> và 'a < b' thì không phải HTML", () => {
    expect(
      codes(
        "Có <b>đậm</b> ở đây\n\n![alt](/a.png)\n\n`mã`\n\nnhãn <보기> và 3 < 5 > 2\n\n<!-- ghi chú -->",
      ),
    ).toEqual(["1:html", "3:image", "5:inline-code", "9:html"]);
  });

  it("khối code rào: một lỗi, nội dung trong rào không sinh thêm lỗi", () => {
    expect(codes("Trước\n\n```ts\n# không phải H1\n<div>\n```\n\nSau")).toEqual(["3:code-fence"]);
    expect(codes("```\nchưa đóng")).toEqual(["1:code-fence", "2:code-fence"]);
  });

  it("khối code thụt lề, đường kẻ ngang", () => {
    expect(codes("Đoạn\n\n    code\n\n---\n\nSau")).toEqual(["3:indented-code", "5:rule"]);
  });

  it("danh sách lồng, mục rỗng, dòng sát sau danh sách", () => {
    expect(codes("- a\n  - con\n")).toEqual(["2:nested-list"]);
    expect(codes("- a\n- \n")).toEqual(["2:list-empty"]);
    expect(codes("- a\nđoạn dính liền\n")).toEqual(["2:list-continuation"]);
  });

  it("khung > lồng nhau, dòng sát sau khung", () => {
    expect(codes("> a\n> > b\n")).toEqual(["2:nested-quote"]);
    expect(codes("> a\nlười\n")).toEqual(["2:quote-continuation"]);
  });

  it("bảng: thiếu dòng phân cách, lệch cột, không có hàng dữ liệu", () => {
    expect(codes("| a | b |\n| 1 | 2 |\n")).toEqual(["1:table-separator"]);
    expect(codes("| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |\n")).toEqual([
      "3:table-columns",
      "4:table-columns",
    ]);
    expect(codes("| a | b |\n|---|\n| 1 | 2 |\n")).toEqual(["2:table-columns"]);
    expect(codes("| a |\n|---|\n")).toEqual(["1:table-empty"]);
  });

  it("liên kết sai giao thức / tương đối / thiếu chữ / bị ngắt dòng", () => {
    expect(
      codes(
        "[a](http://x.com) và [b](javascript:alert(1)) và [c](de-thi) và [](/ok) và [d](/ok)\n\n[e](/a\nb)",
      ),
    ).toEqual([
      "1:link-protocol",
      "1:link-protocol",
      "1:link-protocol",
      "1:link-label",
      "3:link-syntax",
    ]);
  });

  it("dấu ** và * không khép đôi", () => {
    expect(codes("Có **đậm dở\n")).toEqual(["1:emphasis"]);
    expect(codes("Có *nghiêng dở\n")).toEqual(["1:emphasis"]);
    expect(codes("**a** *b* ***c***\n")).toEqual([]);
    expect(codes("- **a\n")).toEqual(["1:emphasis"]);
  });
});
