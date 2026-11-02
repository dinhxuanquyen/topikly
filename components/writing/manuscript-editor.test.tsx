import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ESSAY_PROMPT } from "./writing-test-fixtures";
import { WritingPromptPanel } from "./writing-runner";
import { resetWritingModeMemory, WRITING_MODE_KEY } from "./writing-mode";

beforeEach(() => {
  localStorage.clear();
  resetWritingModeMemory();
});

function essayBox() {
  return screen.getByRole("textbox", { name: /Bài viết của bạn/ }) as HTMLTextAreaElement;
}

function grid() {
  return document.querySelector("[data-testid=manuscript-grid]") as HTMLElement | null;
}

/** Chữ trong các ô của một dòng lưới, ô trống là "_" (bỏ ô trống cuối dòng). */
function rowText(row: number) {
  const cells = grid()!.querySelectorAll(`[data-row="${row}"] > [data-col]`);
  return Array.from(cells, (cell) => cell.textContent || "_")
    .join("|")
    .replace(/(\|_)+$/u, "");
}

function switchToManuscript() {
  fireEvent.click(screen.getByRole("button", { name: "원고지 (giấy thi)" }));
}

describe("trình soạn 원고지 trong Luyện tập Viết", () => {
  it("mặc định là ô gõ; bấm 원고지 thì hiện lưới, lưu lựa chọn và giữ nguyên bài", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    expect(grid()).toBeNull();
    expect(screen.getByRole("button", { name: "Ô gõ (máy, IBT)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(essayBox(), { target: { value: "가나 다" } });

    switchToManuscript();
    expect(grid()).not.toBeNull();
    expect(screen.getByRole("button", { name: "원고지 (giấy thi)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(WRITING_MODE_KEY)).toBe("manuscript");
    expect(essayBox().value).toBe("가나 다");
    expect(rowText(0)).toBe("_|가|나|_|다");
  });

  it("ô nhập vẫn là ô thật có nhãn, trỏ tới bộ đếm, gợi ý và số ô đã dùng", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    switchToManuscript();
    const ids = (essayBox().getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.some((id) => document.getElementById(id)?.dataset.status)).toBe(true);
    expect(ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ")).toContain(
      "Đã dùng 0/20 ô",
    );
    expect(grid()).toHaveAttribute("aria-hidden", "true");
  });

  it("gõ vào ô nhập thì lưới vẽ lại theo quy tắc và đếm số ô", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    switchToManuscript();
    fireEvent.change(essayBox(), { target: { value: "2016년에. 줄었다\n둘째" } });
    expect(rowText(0)).toBe("_|20|16|년|에|.|줄|었|다");
    expect(rowText(1)).toBe("_|둘|째");
    expect(screen.getByText(/Đã dùng 23\/20 ô/)).toHaveTextContent("Tràn khung giấy 3 ô");
    // Khung W53 giả lập 20 ô = 1 dòng: dòng thứ hai nằm ngoài khung.
    expect(screen.getByText("Hết khung 20 ô")).toBeInTheDocument();
  });

  it("bấm vào ô trên giấy đặt con trỏ trước chữ đó", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    switchToManuscript();
    fireEvent.change(essayBox(), { target: { value: "가나다라" } });
    const cell = grid()!.querySelector('[data-row="0"] > [data-col="3"]')!;
    fireEvent.mouseDown(cell);
    expect(document.activeElement).toBe(essayBox());
    expect(essayBox().selectionStart).toBe(2);
    expect(screen.getByTestId("manuscript-caret")).toBeInTheDocument();
  });

  it("phím lên/xuống đi theo dòng của giấy", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    switchToManuscript();
    const text = "가".repeat(19) + "나다라";
    fireEvent.change(essayBox(), { target: { value: text } });
    const box = essayBox();
    box.focus();
    box.setSelectionRange(text.length, text.length);
    fireEvent.select(box);
    // Con trỏ ở dòng 2, cột 3 → lên dòng 1 cột 3 = trước chữ thứ 3 (sau ô thụt).
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(box.selectionStart).toBe(2);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(box.selectionStart).toBe(text.length);
  });

  it("tô các chữ bị kiểm tra quy tắc bắt lỗi", () => {
    render(<WritingPromptPanel program="topik-ii" prompt={ESSAY_PROMPT} />);
    switchToManuscript();
    fireEvent.change(essayBox(), { target: { value: "줄었어요." } });
    const marked = grid()!.querySelectorAll('[data-row="0"] > [data-col].bg-red-100');
    expect(Array.from(marked, (cell) => cell.textContent).join("")).toBe("줄었어요");
  });
});
