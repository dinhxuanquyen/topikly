import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getKnownSnapshot, parseKnownIds, resetKnownCache, setWordKnown } from "./known-store";
import { KnownToggle } from "./known-toggle";

const KEY = "topikly:vocab-known:v1:topik-ii";

beforeEach(() => {
  localStorage.clear();
  resetKnownCache();
});
afterEach(() => vi.restoreAllMocks());

describe("KnownToggle (đã thuộc / chưa thuộc)", () => {
  it("là nút bật tắt có nhãn; bấm đổi trạng thái và lưu vào máy", () => {
    render(<KnownToggle program="topik-ii" wordId="v-00001" hangul="경제" />);
    const button = screen.getByRole("button", { name: "Đánh dấu đã thuộc: 경제" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Chưa thuộc");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("Đã thuộc");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["v-00001"]);

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("đọc lại trạng thái đã lưu khi tải lại trang", () => {
    localStorage.setItem(KEY, JSON.stringify(["v-00002"]));
    resetKnownCache();
    render(<KnownToggle program="topik-ii" wordId="v-00002" hangul="사회" />);
    expect(screen.getByRole("button", { name: /사회/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("nhiều nút cho cùng một từ đồng bộ với nhau, từ khác không bị ảnh hưởng", () => {
    render(
      <>
        <KnownToggle program="topik-ii" wordId="v-00001" hangul="경제" />
        <KnownToggle program="topik-ii" wordId="v-00001" hangul="경제" compact />
        <KnownToggle program="topik-ii" wordId="v-00003" hangul="환경" />
      </>,
    );
    const [a, b, other] = screen.getAllByRole("button");
    fireEvent.click(a!);
    expect(b).toHaveAttribute("aria-pressed", "true");
    expect(other).toHaveAttribute("aria-pressed", "false");
  });

  it("localStorage không ghi được: trạng thái vẫn đúng trong phiên, persisted = false", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(<KnownToggle program="topik-ii" wordId="v-00001" hangul="경제" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(getKnownSnapshot("topik-ii").persisted).toBe(false);
  });

  it("đổi từ ở tab khác (sự kiện storage) cập nhật nút", () => {
    render(<KnownToggle program="topik-ii" wordId="v-00004" hangul="교육" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    act(() => {
      localStorage.setItem(KEY, JSON.stringify(["v-00004"]));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});

describe("known-store", () => {
  it("parseKnownIds bỏ giá trị sai kiểu", () => {
    expect(parseKnownIds(["a", 1, "", null, "b"])).toEqual(["a", "b"]);
    expect(parseKnownIds("x")).toEqual([]);
  });

  it("setWordKnown không đổi gì khi trạng thái đã đúng", () => {
    const before = getKnownSnapshot("topik-ii");
    setWordKnown("topik-ii", "v-1", false);
    expect(getKnownSnapshot("topik-ii")).toBe(before);
  });
});
