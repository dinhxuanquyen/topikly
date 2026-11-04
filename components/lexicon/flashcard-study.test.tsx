import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlashcardStudy } from "./flashcard-study";
import { readReviewCards, rateWord, subscribeReviews } from "./review-store";
import type { VocabWord } from "@/lib/lexicon/types";

const word: VocabWord = {
  id: "v1",
  program: "test",
  hangul: "경제",
  hanja: "經濟",
  han_viet: "kinh tế",
  meaning_vi: "nền kinh tế",
  pos: "noun",
  pos_name_vi: "Danh từ",
  level: 3,
  topics: [],
  false_friend_kind: null,
  reviewed: true,
  syllables: [],
  example_ko: "경제가 발전한다.",
  example_vi: "Kinh tế phát triển.",
  false_friend: null,
  collocations: [],
};
afterEach(() => vi.restoreAllMocks());
describe("Flashcard", () => {
  it("ôn trực tiếp từ được giao dù chưa đến hạn và quay về lộ trình", async () => {
    const program = "flash-plan-target";
    rateWord(program, word.id, "easy");
    render(<FlashcardStudy program={program} words={[word]} targeted />);
    expect(screen.queryByText(word.meaning_vi)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Hiện nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ 10 phút" }));
    expect(readReviewCards(program).cards[word.id]?.reviews).toBe(2);
    expect(screen.getByRole("link", { name: "Về lộ trình" })).toHaveAttribute(
      "href",
      `/${program}/lo-trinh`,
    );
  });
  it("ẩn nghĩa trước khi lật, ghi một lượt, khôi phục lịch sau khi mở lại", async () => {
    const view = render(<FlashcardStudy program="flash-flow" words={[word]} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu ôn 1 thẻ" }));
    expect(screen.queryByText("nền kinh tế")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hiện nghĩa" }));
    expect(screen.getByText("nền kinh tế")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ 3 ngày" }));
    expect(readReviewCards("flash-flow").cards.v1?.reviews).toBe(1);
    expect(screen.getByText(/Đã ôn 1 thẻ/)).toBeVisible();
    view.unmount();
    render(<FlashcardStudy program="flash-flow" words={[word]} />);
    expect(await screen.findByRole("button", { name: "Bắt đầu ôn" })).toBeDisabled();
  });
  it("ghi bị chặn vẫn cập nhật trong phiên và báo rõ", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    render(<FlashcardStudy program="flash-blocked" words={[word]} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu ôn 1 thẻ" }));
    fireEvent.click(screen.getByRole("button", { name: "Hiện nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ 10 phút" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Không lưu được lịch ôn");
    expect(readReviewCards("flash-blocked").cards.v1?.rating).toBe("again");
  });
  it("đọc thay đổi của tab khác và giữ các thẻ khi ghi tiếp", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeReviews(listener);
    rateWord("flash-tabs", "v1", "good", 1000);
    const key = "topikly:vocab-review:v1:flash-tabs";
    const saved = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify([...saved, { ...saved[0], wordId: "v2" }]));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key })));
    rateWord("flash-tabs", "v3", "easy", 2000);
    expect(Object.keys(readReviewCards("flash-tabs").cards)).toEqual(["v1", "v2", "v3"]);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
