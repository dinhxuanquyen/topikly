import { describe, expect, it } from "vitest";
import { parseTranscript } from "./transcript";

const speakers = [
  { label: "여자", gender: "female" as const },
  { label: "남자", gender: "male" as const },
];

describe("parseTranscript", () => {
  it("tách nhãn người nói và giới tính theo danh sách speakers", () => {
    const lines = parseTranscript("여자: 안녕하세요.\n남자: 네, 안녕하세요.\n", speakers);
    expect(lines).toEqual([
      { speaker: "여자", gender: "female", text: "안녕하세요." },
      { speaker: "남자", gender: "male", text: "네, 안녕하세요." },
    ]);
  });

  it("dòng có dấu hai chấm giữa câu mà nhãn không thuộc speakers thì giữ nguyên", () => {
    const lines = parseTranscript("안내: 오늘은 휴관입니다.", speakers);
    expect(lines).toEqual([{ text: "안내: 오늘은 휴관입니다." }]);
  });

  it("độc thoại không nhãn: mỗi dòng là một đoạn, bỏ dòng trống", () => {
    const lines = parseTranscript("첫째 줄입니다.\n\n둘째 줄입니다.");
    expect(lines.map((l) => l.text)).toEqual(["첫째 줄입니다.", "둘째 줄입니다."]);
    expect(lines.every((l) => l.speaker === undefined)).toBe(true);
  });

  it("hỗ trợ nhãn có số (남자 1) khi được khai báo", () => {
    const lines = parseTranscript("남자 1: 안녕.", [{ label: "남자 1", gender: "male" }]);
    expect(lines[0]).toMatchObject({ speaker: "남자 1", gender: "male", text: "안녕." });
  });
});
