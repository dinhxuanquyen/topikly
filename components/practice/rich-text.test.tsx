import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichLines, renderInline, splitLines } from "./rich-text";

describe("renderInline", () => {
  it("**đậm** thành <strong>, phần còn lại là chữ thường", () => {
    const { container } = render(<p>{renderInline("**Đáp án ③.** Căn cứ trên biểu đồ")}</p>);
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("Đáp án ③.");
    expect(container.textContent).toBe("Đáp án ③. Căn cứ trên biểu đồ");
  });

  it("<u> gạch chân được hỗ trợ (밑줄 친 부분)", () => {
    const { container } = render(<p lang="ko">{renderInline("비가 <u>올까 봐</u> 갔다")}</p>);
    expect(container.querySelector("u")?.textContent).toBe("올까 봐");
  });

  it("không bao giờ diễn giải HTML thô: thẻ lạ được hiển thị như chữ", () => {
    const { container } = render(
      <p>{renderInline('<img src=x onerror="alert(1)"> và <b>b</b> <보기>')}</p>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
    expect(container.textContent).toContain("<보기>");
  });

  it("tagKorean bọc cụm chữ Hàn trong văn bản Việt bằng lang=ko", () => {
    const { container } = render(
      <p>{renderInline("Chọn 자기 계발 và 운동", { tagKorean: true })}</p>,
    );
    const spans = [...container.querySelectorAll('[lang="ko"]')].map((s) => s.textContent);
    expect(spans).toEqual(["자기 계발", "운동"]);
  });
});

describe("RichLines / splitLines", () => {
  it("mỗi dòng không rỗng là một đoạn", () => {
    expect(splitLines("a\n\n b \r\nc\n")).toEqual(["a", " b", "c"]);
    render(<RichLines text={"(가) 첫째\n(나) 둘째"} />);
    expect(screen.getAllByText(/^\(.\)/)).toHaveLength(2);
  });
});
