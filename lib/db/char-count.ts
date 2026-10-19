/**
 * Đếm ký tự theo content-spec mục 5.7 (cách đếm "ô gõ" của IBT):
 *  1. Chuẩn hoá NFC.
 *  2. Bỏ ký tự xuống dòng (\n, \r) và khoảng trắng ở cuối mỗi dòng.
 *  3. Đếm theo code point Unicode: mỗi âm tiết Hangul, chữ số, dấu câu, ký hiệu và
 *     mỗi khoảng trắng (không nằm cuối dòng) tính là 1.
 *
 * Cách đếm theo 원고지 (ô thụt đầu đoạn, quy tắc dấu câu) thuộc lib/writing, không ở đây.
 */
export function countChars(text: string): number {
  const normalized = text.normalize("NFC");
  const joined = normalized
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/[ \t 　]+$/u, ""))
    .join("");
  return Array.from(joined).length;
}
