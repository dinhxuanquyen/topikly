import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VocabFacets, VocabWordSummary } from "@/lib/lexicon/types";
import { resetKnownCache } from "./known-store";
import { VOCAB_PAGE_SIZE, VocabBrowser } from "./vocab-browser";

function word(i: number, partial: Partial<VocabWordSummary> = {}): VocabWordSummary {
  return {
    id: `v-${String(i).padStart(5, "0")}`,
    hangul: `단어${i}`,
    hanja: null,
    han_viet: null,
    meaning_vi: `nghĩa số ${i}`,
    pos: "noun",
    pos_name_vi: "Danh từ",
    level: 3,
    topics: [{ code: "society", name_vi: "Xã hội" }],
    false_friend_kind: null,
    reviewed: false,
    ...partial,
  };
}

const WORDS: VocabWordSummary[] = [
  word(1, { hangul: "경제", hanja: "經濟", han_viet: "kinh tế", meaning_vi: "nền kinh tế" }),
  word(2, { hangul: "대처", level: 4, false_friend_kind: "full", han_viet: "đối xử" }),
  word(3, { level: 4, pos: "verb", pos_name_vi: "Động từ" }),
];

const FACETS: VocabFacets = {
  total: 3,
  levels: [
    { level: 3, label: "3급", count: 2 },
    { level: 4, label: "4급", count: 1 },
  ],
  topics: [{ code: "society", name_vi: "Xã hội", count: 3 }],
  pos: [
    { code: "noun", name_vi: "Danh từ", count: 2 },
    { code: "verb", name_vi: "Động từ", count: 1 },
  ],
  false_friend_count: 1,
};

beforeEach(() => {
  localStorage.clear();
  resetKnownCache();
  window.history.replaceState(null, "", "/topik-ii/ly-thuyet/tu-vung");
});
afterEach(() => window.history.replaceState(null, "", "/"));

function list() {
  return screen.getByRole("list", { name: "Danh sách từ vựng" });
}

describe("VocabBrowser", () => {
  it("hiện đủ từ, tiến độ đã thuộc và ghi chú chờ duyệt", () => {
    render(<VocabBrowser program="topik-ii" words={WORDS} facets={FACETS} />);
    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Đã thuộc 0/3 từ")).toBeInTheDocument();
    expect(screen.getByText(/3 mục trong danh sách này đang chờ duyệt/)).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 3/3 từ")).toBeInTheDocument();
    // liên kết tới trang chi tiết
    expect(screen.getByRole("link", { name: /경제/ })).toHaveAttribute(
      "href",
      "/topik-ii/ly-thuyet/tu-vung/v-00001",
    );
  });

  it("lọc theo cấp, ghi lên URL, và xoá bộ lọc", () => {
    render(<VocabBrowser program="topik-ii" words={WORDS} facets={FACETS} />);
    fireEvent.click(screen.getByRole("button", { name: "4급 (1)" }));
    expect(screen.getByText("Hiển thị 2/3 từ")).toBeInTheDocument();
    expect(window.location.search).toBe("?cap=4");

    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByText("Hiển thị 3/3 từ")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("đọc bộ lọc từ URL khi mở trang (?ban-gia=1)", () => {
    window.history.replaceState(null, "", "/topik-ii/ly-thuyet/tu-vung?ban-gia=1");
    render(<VocabBrowser program="topik-ii" words={WORDS} facets={FACETS} />);
    expect(screen.getByText("Hiển thị 1/3 từ")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Chỉ bạn giả Hán-Việt \(1\)/ })).toBeChecked();
  });

  it("tìm chữ không phân biệt dấu", () => {
    render(<VocabBrowser program="topik-ii" words={WORDS} facets={FACETS} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm trong danh sách" }), {
      target: { value: "kinh te" },
    });
    expect(screen.getByText("Hiển thị 1/3 từ")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm trong danh sách" }), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("Không có từ nào khớp bộ lọc.")).toBeInTheDocument();
  });

  it("đánh dấu đã thuộc cập nhật bộ đếm tiến độ và lọc theo trạng thái", () => {
    render(<VocabBrowser program="topik-ii" words={WORDS} facets={FACETS} />);
    fireEvent.click(screen.getByRole("button", { name: "Đánh dấu đã thuộc: 경제" }));
    expect(screen.getByText("Đã thuộc 1/3 từ")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tiến độ đã thuộc" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );

    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "da-thuoc" } });
    expect(screen.getByText("Hiển thị 1/3 từ")).toBeInTheDocument();
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("danh sách dài: hiện từng đợt và có nút hiện thêm", () => {
    const many = Array.from({ length: VOCAB_PAGE_SIZE + 5 }, (_, i) => word(i + 1));
    render(
      <VocabBrowser program="topik-ii" words={many} facets={{ ...FACETS, total: many.length }} />,
    );
    expect(within(list()).getAllByRole("listitem")).toHaveLength(VOCAB_PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: "Hiện thêm 5 từ" }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(VOCAB_PAGE_SIZE + 5);
    expect(screen.queryByRole("button", { name: /Hiện thêm/ })).not.toBeInTheDocument();
  });
});
