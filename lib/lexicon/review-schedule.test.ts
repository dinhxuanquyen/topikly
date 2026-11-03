import { describe, expect, it } from "vitest";
import { dueWords, parseReviewCards, scheduleReview } from "./review-schedule";

describe("lịch ôn từ", () => {
  it("từ chưa nhớ được nhắc sau 10 phút; các mức khác có lịch tăng dần và giới hạn", () => {
    const now = 1000;
    expect(scheduleReview("v1", undefined, "again", now).dueAt).toBe(now + 600000);
    const good = scheduleReview("v1", undefined, "good", now);
    expect(good.intervalDays).toBe(3);
    expect(scheduleReview("v1", good, "good", now).intervalDays).toBe(6);
    expect(scheduleReview("v1", { ...good, intervalDays: 300 }, "easy", now).intervalDays).toBe(
      365,
    );
    expect(scheduleReview("v1", good, "again", now).intervalDays).toBe(0);
  });
  it("ưu tiên đến hạn, giữ từ đã thuộc đã có lịch, loại từ mới đã thuộc và thẻ chưa đến hạn", () => {
    const card = scheduleReview("due", undefined, "again", 0);
    const words = ["new", "known", "due", "future"].map((id) => ({ id }));
    expect(
      dueWords(
        words,
        { due: card, future: { ...card, wordId: "future", dueAt: 900000 } },
        new Set(["known", "due"]),
        600000,
      ).map((w) => w.id),
    ).toEqual(["due", "new"]);
  });
  it("bỏ dữ liệu hỏng mà giữ thẻ hợp lệ", () => {
    const card = scheduleReview("v-00001", undefined, "good", 0);
    expect(
      parseReviewCards([
        card,
        { ...card, wordId: "bad", dueAt: -1 },
        { ...card, wordId: "__proto__" },
      ]),
    ).toEqual({ "v-00001": card });
    expect(parseReviewCards({})).toEqual({});
  });
});
