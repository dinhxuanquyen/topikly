import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { checkEssay } from "@/lib/writing/rules";
import { BLANKS_PROMPT, ESSAY_PROMPT } from "./writing-test-fixtures";
import { RuleCheckPanel } from "./rule-check";
import { WritingPromptPanel } from "./writing-runner";

beforeEach(() => {
  localStorage.clear();
});

function panel() {
  return screen.queryByRole("region", { name: "Kiểm tra quy tắc" });
}

describe("kiểm tra quy tắc trong trình luyện Viết", () => {
  it("chưa viết thì chưa hiện; viết văn phong -다 thì báo không có lỗi", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    expect(panel()).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: /Bài viết của bạn/ }), {
      target: { value: "종이책 대출은 줄었다." },
    });
    expect(panel()).toHaveTextContent("Chưa thấy lỗi hình thức nào.");
    expect(within(panel()!).getByText("Văn phong -ㄴ다/-다")).toBeInTheDocument();
  });

  it("W53: bắt đuôi -요, chép đề và ý kiến cá nhân, kèm đoạn trích tiếng Hàn", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Bài viết của bạn/ }), {
      target: {
        value:
          "다음은 '도서 대출 현황'에 대한 자료이다. 종이책이 줄었어요. 나는 아쉽다고 생각한다.",
      },
    });
    const region = panel()!;
    expect(region).toHaveTextContent("2 lỗi cần sửa · 1 lưu ý");
    const register = region.querySelector("[data-rule='register']") as HTMLElement;
    expect(register.dataset.severity).toBe("error");
    expect(within(register).getByText("줄었어요")).toHaveAttribute("lang", "ko");
    expect(region.querySelector("[data-rule='copied_prompt']")).not.toBeNull();
    expect(region.querySelector("[data-rule='personal_opinion']")).not.toBeNull();
  });

  it("W51: ô điền nhiều câu hiện lời nhắc và được trỏ aria-describedby", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={BLANKS_PROMPT} />);
    const input = screen.getByRole("textbox", { name: "Ô điền ㉠" });
    expect(input).not.toHaveAttribute("aria-describedby");

    fireEvent.change(input, { target: { value: "참석할 수 없습니다. 죄송합니다." } });
    const noteId = input.getAttribute("aria-describedby")!;
    const note = document.getElementById(noteId)!;
    expect(note).toHaveTextContent("Mỗi chỗ trống chỉ viết một câu.");
  });
});

describe("RuleCheckPanel", () => {
  it("bài đã nộp: không có vùng aria-live", () => {
    const report = checkEssay({ type_code: "W54", text: "좋아요." });
    render(<RuleCheckPanel report={report} typeCode="W54" announce={false} />);
    expect(panel()).toHaveTextContent("1 lỗi cần sửa");
    expect(panel()!.querySelector("[aria-live]")).toBeNull();
  });

  it("gộp đoạn trích trùng và rút gọn khi quá nhiều", () => {
    const text = "가요. 나요. 다요. 라요. 마요. 가요.";
    render(<RuleCheckPanel report={checkEssay({ type_code: "W54", text })} typeCode="W54" />);
    const register = panel()!.querySelector("[data-rule='register']") as HTMLElement;
    expect(within(register).getAllByText(/요$/)).toHaveLength(4);
    expect(register).toHaveTextContent("+1");
  });
});
