import { beforeEach, describe, expect, it } from "vitest";
import { buildDraft, EMPTY_SESSION, pickNewerDraft, type ExamDraft } from "./exam-state";
import { clearDraft, loadDraft, saveDraft, stashDraft } from "./exam-store";
import { WRITING_EXAM } from "./test-fixtures";

// jsdom có localStorage nhưng không có IndexedDB: mô phỏng đúng tình huống IndexedDB chưa kịp ghi
// (hoặc không dùng được) và bản sao đồng bộ là nơi duy nhất giữ bài Viết.
function draftWith(text: string, updatedAt: number, startedAt = 1_000): ExamDraft {
  const session = { ...EMPTY_SESSION, writing: { "w53-0002": { text } } };
  return buildDraft(WRITING_EXAM, session, startedAt, 2, updatedAt);
}

beforeEach(() => {
  localStorage.clear();
});

describe("bản sao đồng bộ của bản nháp (localStorage)", () => {
  it("stashDraft ghi ngay, loadDraft lấy lại được khi IndexedDB không có", async () => {
    expect(typeof indexedDB).toBe("undefined");
    expect(stashDraft(draftWith("chữ vừa gõ", 5_000))).toBe(true);
    const loaded = await loadDraft("topik-ii", "mini", "viet-01");
    expect(loaded?.writing).toEqual({ "w53-0002": { text: "chữ vừa gõ" } });
    expect(loaded?.blockIndex).toBe(2);
  });

  it("saveDraft không ghi được IndexedDB thì giữ bản sao cho đề có phần Viết", async () => {
    await expect(saveDraft(draftWith("nháp", 6_000))).resolves.toBe(false);
    expect((await loadDraft("topik-ii", "mini", "viet-01"))?.writing).toEqual({
      "w53-0002": { text: "nháp" },
    });
  });

  it("đề trắc nghiệm không để lại bản sao", async () => {
    await saveDraft(buildDraft({ ...WRITING_EXAM, id: "doc-01" }, EMPTY_SESSION, 1, 0, 2));
    expect(localStorage.length).toBe(0);
  });

  it("clearDraft xoá bản sao (nộp bài xong không khôi phục lại bài cũ)", async () => {
    stashDraft(draftWith("x", 5_000));
    await clearDraft("topik-ii", "mini", "viet-01");
    expect(await loadDraft("topik-ii", "mini", "viet-01")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("bản sao hỏng hoặc sai khoá bị bỏ qua, không ném lỗi", async () => {
    localStorage.setItem("topikly:exam-draft-stash:v1:topik-ii:mini:viet-01", "{không phải json");
    expect(await loadDraft("topik-ii", "mini", "viet-01")).toBeNull();
    localStorage.setItem(
      "topikly:exam-draft-stash:v1:topik-ii:mini:viet-01",
      JSON.stringify({ key: "khác", startedAt: 1, updatedAt: 2 }),
    );
    expect(await loadDraft("topik-ii", "mini", "viet-01")).toBeNull();
  });
});

describe("pickNewerDraft: gộp bản mới hơn", () => {
  const idb = draftWith("bản IndexedDB", 5_000);

  it("bản sao mới hơn cùng lần làm thì thắng", () => {
    const stash = draftWith("bản sao mới", 5_400);
    expect(pickNewerDraft(idb, stash)).toBe(stash);
  });

  it("bản sao cũ hơn hoặc hoà thì giữ IndexedDB", () => {
    expect(pickNewerDraft(idb, draftWith("cũ", 4_000))).toBe(idb);
    expect(pickNewerDraft(idb, draftWith("hoà", 5_000))).toBe(idb);
  });

  it("bản sao của lần làm khác (startedAt khác) bị bỏ", () => {
    expect(pickNewerDraft(idb, draftWith("lần khác", 9_000, 2_000))).toBe(idb);
  });

  it("thiếu một bên thì lấy bên còn lại", () => {
    expect(pickNewerDraft(null, idb)).toBe(idb);
    expect(pickNewerDraft(idb, null)).toBe(idb);
    expect(pickNewerDraft(null, null)).toBeNull();
  });
});
