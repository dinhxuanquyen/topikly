import { describe, expect, it } from "vitest";
import {
  invalidateStatsCache,
  loadProgressForType,
  loadStatsByType,
  recordAnswer,
  setMarked,
  subscribeGuestChanges,
} from "./guest-store";

// Môi trường node không có indexedDB, giống SSR hoặc chế độ riêng tư: mọi hàm phải rơi về
// "không lưu" mà không ném lỗi.
describe("guest-store khi không có IndexedDB", () => {
  it("ghi trả về false, không ném lỗi", async () => {
    expect(typeof indexedDB).toBe("undefined");
    await expect(
      recordAnswer({
        program: "topik-ii",
        questionId: "r10-0001",
        type_code: "R10",
        skill: "reading",
        selectedLabel: "③",
        correct: true,
        timeSpentMs: 1000,
        answeredAt: Date.now(),
      }),
    ).resolves.toBe(false);
    await expect(
      setMarked(
        { program: "topik-ii", questionId: "r10-0001", type_code: "R10", skill: "reading" },
        true,
      ),
    ).resolves.toBe(false);
  });

  it("đọc trả về rỗng", async () => {
    await expect(loadProgressForType("topik-ii", "R10")).resolves.toEqual([]);
    await expect(loadStatsByType("topik-ii")).resolves.toEqual({});
  });

  it("đăng ký / huỷ lắng nghe và xoá cache không lỗi", () => {
    const unsubscribe = subscribeGuestChanges(() => undefined);
    expect(() => {
      invalidateStatsCache();
      unsubscribe();
    }).not.toThrow();
  });
});
