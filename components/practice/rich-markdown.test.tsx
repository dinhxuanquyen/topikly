import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseMarkdownBlocks, RichMarkdown } from "./rich-markdown";
import { renderInline } from "./rich-text";

describe("parseMarkdownBlocks", () => {
  it("gom dòng liên tiếp thành danh sách; dòng thường là đoạn; bỏ dòng trống và thụt đầu dòng", () => {
    expect(
      parseMarkdownBlocks(
        "**Đáng chú ý:**\n\n  - mục một\n  - mục hai\n1. bước một\n2. bước hai\nKết luận.",
      ),
    ).toEqual([
      { kind: "p", text: "**Đáng chú ý:**" },
      { kind: "ul", items: ["mục một", "mục hai"] },
      { kind: "ol", items: ["bước một", "bước hai"] },
      { kind: "p", text: "Kết luận." },
    ]);
  });

  it("dòng bắt đầu bằng -(으)ㄹ수록 không phải mục danh sách", () => {
    expect(parseMarkdownBlocks("-(으)ㄹ수록 – càng")).toEqual([
      { kind: "p", text: "-(으)ㄹ수록 – càng" },
    ]);
  });
});

describe("RichMarkdown", () => {
  it("dựng <ul>/<ol>/<p>, **đậm** và *nghiêng*, không diễn giải HTML thô", () => {
    const { container } = render(
      <RichMarkdown text={"**Ý cốt lõi:** *Ơ, chắc là*\n- một <b>x</b>\n1. hai"} />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("Ý cốt lõi:");
    expect(container.querySelector("em")?.textContent).toBe("Ơ, chắc là");
    expect(container.querySelectorAll("ul li")).toHaveLength(1);
    expect(container.querySelectorAll("ol li")).toHaveLength(1);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>x</b>");
  });
});

describe("renderInline italic", () => {
  it("mặc định dấu * đơn là chữ thường (đề thi có dấu * thật)", () => {
    const { container } = render(<p>{renderInline("câu sai *바쁘나 보다 và *khác*")}</p>);
    expect(container.querySelector("em")).toBeNull();
    expect(container.textContent).toBe("câu sai *바쁘나 보다 và *khác*");
  });
  it("italic: true thì *nghiêng* thành <em>, dấu * lẻ vẫn là chữ thường", () => {
    const { container } = render(
      <p>{renderInline("(*바쁘나 보다) và *khác*", { italic: true })}</p>,
    );
    expect(container.querySelector("em")?.textContent).toBe("khác");
    expect(container.textContent).toBe("(*바쁘나 보다) và khác");
  });
});
