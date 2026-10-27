import { describe, expect, it } from "vitest";
import {
  clearDraft,
  loadDraft,
  loadExamStatuses,
  loadLatestAttempt,
  loadLatestResult,
  saveDraft,
  saveResult,
  saveSelfPoints,
} from "./exam-store";
import { buildDraft, EMPTY_SESSION } from "./exam-state";
import { EXAM, RESULT, WRITING_RESULT } from "./test-fixtures";

// Môi trường node không có indexedDB, giống SSR hoặc chế độ riêng tư: mọi hàm phải rơi về
// "không lưu" mà không ném lỗi và không treo.
describe("exam-store khi không có IndexedDB", () => {
  it("ghi trả về false, không ném lỗi", async () => {
    expect(typeof indexedDB).toBe("undefined");
    await expect(saveDraft(buildDraft(EXAM, EMPTY_SESSION, 1, 0, 2))).resolves.toBe(false);
    await expect(clearDraft("topik-ii", "mini", "doc-01")).resolves.toBe(false);
    await expect(saveResult(RESULT)).resolves.toBe(false);
    await expect(saveResult(WRITING_RESULT, { "w51-0001": 5 })).resolves.toBe(false);
    await expect(saveSelfPoints(WRITING_RESULT, { "w51-0001": 5 })).resolves.toBe(false);
  });

  it("đọc trả về rỗng", async () => {
    await expect(loadDraft("topik-ii", "mini", "doc-01")).resolves.toBeNull();
    await expect(loadLatestResult("topik-ii", "mini", "doc-01")).resolves.toBeNull();
    await expect(loadLatestAttempt("topik-ii", "mini", "viet-01")).resolves.toBeNull();
    await expect(loadExamStatuses("topik-ii", "mini")).resolves.toEqual({});
  });
});
