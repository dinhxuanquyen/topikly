import { describe, expect, it } from "vitest";
import { countChars } from "@/lib/db/char-count";

describe("countChars (content-spec 5.7)", () => {
  it("đếm từng âm tiết, chữ số, dấu câu, ký hiệu", () => {
    expect(countChars("안녕하세요")).toBe(5);
    expect(countChars("2025년 67%")).toBe(9);
    expect(countChars("○○연구소.")).toBe(6);
  });

  it("mỗi khoảng trắng giữa chữ tính là 1", () => {
    expect(countChars("가 나")).toBe(3);
    expect(countChars("가  나")).toBe(4);
  });

  it("bỏ ký tự xuống dòng và khoảng trắng cuối dòng", () => {
    expect(countChars("가나다\n라마")).toBe(5);
    expect(countChars("가나다   \r\n라마  \n")).toBe(5);
    expect(countChars("첫 줄 \n둘째 줄")).toBe(7);
  });

  it("giữ khoảng trắng đầu dòng", () => {
    expect(countChars("가\n 나")).toBe(3);
  });

  it("chuẩn hoá NFC: âm tiết ở dạng NFD (jamo rời) vẫn đếm là 1", () => {
    const nfd = "한글".normalize("NFD");
    expect(Array.from(nfd).length).toBeGreaterThan(2);
    expect(countChars(nfd)).toBe(2);
  });

  it("đếm theo code point, không theo UTF-16", () => {
    expect(countChars("😀가")).toBe(2);
  });

  it("chuỗi rỗng hoặc chỉ gồm xuống dòng = 0", () => {
    expect(countChars("")).toBe(0);
    expect(countChars("\n\r\n  \n")).toBe(0);
  });
});
