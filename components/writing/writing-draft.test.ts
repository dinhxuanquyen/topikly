// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDraft,
  draftKey,
  isDraftEmpty,
  loadDraft,
  parseDraft,
  saveDraft,
} from "./writing-draft";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("parseDraft", () => {
  it("bỏ qua trường sai kiểu và cắt chuỗi quá dài", () => {
    const draft = parseDraft({
      essay: "가".repeat(6000),
      blanks: { "㉠": "답", "㉡": 5 },
      checked: ["p1", 2],
      savedAt: "x",
    });
    expect(draft?.essay.length).toBe(5000);
    expect(draft?.blanks).toEqual({ "㉠": "답" });
    expect(draft?.checked).toEqual(["p1"]);
    expect(draft?.savedAt).toBe(0);
  });
  it("không phải object -> null", () => {
    expect(parseDraft("abc")).toBeNull();
    expect(parseDraft(null)).toBeNull();
  });
});

describe("saveDraft / loadDraft / clearDraft", () => {
  it("ghi rồi đọc lại đúng nội dung", async () => {
    expect(
      await saveDraft("topik-ii", "w53-0002", { essay: "안녕", blanks: {}, checked: ["p1"] }),
    ).toBe(true);
    const draft = await loadDraft("topik-ii", "w53-0002");
    expect(draft?.essay).toBe("안녕");
    expect(draft?.checked).toEqual(["p1"]);
    expect(draft?.savedAt).toBeGreaterThan(0);
  });

  it("nháp rỗng thì xoá khoá thay vì lưu", async () => {
    await saveDraft("topik-ii", "w53-0002", { essay: "a", blanks: {}, checked: [] });
    await saveDraft("topik-ii", "w53-0002", { essay: "  ", blanks: {}, checked: [] });
    expect(localStorage.getItem(draftKey("topik-ii", "w53-0002"))).toBeNull();
  });

  it("clearDraft xoá nháp", async () => {
    await saveDraft("topik-ii", "w53-0002", { essay: "a", blanks: {}, checked: [] });
    expect(await clearDraft("topik-ii", "w53-0002")).toBe(true);
    expect(await loadDraft("topik-ii", "w53-0002")).toBeNull();
  });

  it("JSON hỏng -> null, không ném lỗi", async () => {
    localStorage.setItem(draftKey("topik-ii", "w53-0002"), "{không phải json");
    expect(await loadDraft("topik-ii", "w53-0002")).toBeNull();
  });

  it("localStorage ném lỗi (chế độ riêng tư / đầy bộ nhớ) -> false / null, không ném", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(await saveDraft("topik-ii", "w53-0002", { essay: "a", blanks: {}, checked: [] })).toBe(
      false,
    );
    expect(await loadDraft("topik-ii", "w53-0002")).toBeNull();
  });
});

describe("isDraftEmpty", () => {
  it("coi ý đã đánh dấu là nội dung", () => {
    expect(isDraftEmpty({ essay: "", blanks: { "㉠": " " }, checked: [] })).toBe(true);
    expect(isDraftEmpty({ essay: "", blanks: {}, checked: ["p1"] })).toBe(false);
  });
});
