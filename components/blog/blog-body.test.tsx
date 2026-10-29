import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogBlock } from "@/lib/blog/types";
import { BlogBody } from "./blog-body";

function renderBlocks(blocks: BlogBlock[]) {
  return render(<BlogBody blocks={blocks} />);
}

describe("BlogBody", () => {
  it("h2/h3 có id neo và đúng cấp tiêu đề", () => {
    renderBlocks([
      { kind: "h2", id: "phan-nghe", text: "Phần Nghe" },
      { kind: "h3", id: "cau-1", text: "Câu 1" },
    ]);
    expect(screen.getByRole("heading", { level: 2, name: "Phần Nghe" })).toHaveAttribute(
      "id",
      "phan-nghe",
    );
    expect(screen.getByRole("heading", { level: 3, name: "Câu 1" })).toHaveAttribute("id", "cau-1");
  });

  it("đoạn văn: **đậm**, *nghiêng* và gắn lang=ko cho chữ Hàn", () => {
    const { container } = renderBlocks([
      { kind: "p", text: "Từ **정보** nghĩa là *thông tin*, không phải tình báo." },
    ]);
    const strong = container.querySelector("strong");
    expect(strong).toHaveTextContent("정보");
    expect(strong?.querySelector('[lang="ko"]')).toHaveTextContent("정보");
    expect(container.querySelector("em")).toHaveTextContent("thông tin");
  });

  it("liên kết nội bộ không mở tab mới", () => {
    renderBlocks([{ kind: "p", text: "Xem [Mini test](/topik-ii/de-thi/mini) ngay." }]);
    const link = screen.getByRole("link", { name: "Mini test" });
    expect(link).toHaveAttribute("href", "/topik-ii/de-thi/mini");
    expect(link).not.toHaveAttribute("target");
  });

  it("liên kết ngoài mở tab mới với rel noopener noreferrer", () => {
    renderBlocks([{ kind: "p", text: "Nguồn: [TOPIK](https://www.topik.go.kr/)." }]);
    const link = screen.getByRole("link", { name: /TOPIK/ });
    expect(link).toHaveAttribute("href", "https://www.topik.go.kr/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("mở trong tab mới");
  });

  it("không biến href nguy hiểm thành liên kết", () => {
    const { container } = renderBlocks([
      {
        kind: "p",
        text: "[a](javascript:alert) [b](http://x.test) [c](//evil.test) [d](data:text/html,x)",
      },
    ]);
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container).toHaveTextContent("[a](javascript:alert)");
  });

  it("không dựng HTML từ chuỗi: thẻ trong văn bản hiện thành chữ", () => {
    const { container } = renderBlocks([
      { kind: "p", text: "<img src=x onerror=alert(1)> **ok**" },
    ]);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
  });

  it("đậm có thể chứa liên kết, liên kết có thể chứa đậm", () => {
    const { container } = renderBlocks([
      { kind: "p", text: "**xem [đây](/blog/a)** và [**đó**](/blog/b)" },
    ]);
    expect(container.querySelector('strong a[href="/blog/a"]')).not.toBeNull();
    expect(container.querySelector('a[href="/blog/b"] strong')).toHaveTextContent("đó");
  });

  it("danh sách ul và ol có đúng số mục", () => {
    renderBlocks([
      { kind: "ul", items: ["một", "hai"] },
      { kind: "ol", items: ["bước 1", "bước 2", "bước 3"] },
    ]);
    const [ul, ol] = screen.getAllByRole("list");
    expect(ul.tagName).toBe("UL");
    expect(within(ul).getAllByRole("listitem")).toHaveLength(2);
    expect(ol.tagName).toBe("OL");
    expect(within(ol).getAllByRole("listitem")).toHaveLength(3);
  });

  it("quote là khung ghi chú có nhãn Mẹo / lưu ý", () => {
    renderBlocks([{ kind: "quote", text: "Đọc **câu hỏi** trước." }]);
    const note = screen.getByRole("note", { name: "Mẹo / lưu ý" });
    expect(note).toHaveTextContent("Đọc câu hỏi trước.");
  });

  it("bảng nằm trong khung cuộn ngang focus được, có th scope=col và ô render inline", () => {
    renderBlocks([
      {
        kind: "table",
        header: ["Từ", "Nghĩa"],
        rows: [
          ["**정보**", "thông tin"],
          ["실수", "lỗi"],
        ],
      },
    ]);
    const region = screen.getByRole("region", { name: /Bảng/ });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toContain("overflow-x-auto");
    const table = within(region).getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual(["Từ", "Nghĩa"]);
    expect(headers[0]).toHaveAttribute("scope", "col");
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(table.querySelector("td strong")).toHaveTextContent("정보");
    expect(table.querySelector('td [lang="ko"]')).not.toBeNull();
  });
});
