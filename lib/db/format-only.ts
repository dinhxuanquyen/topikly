/**
 * Xác nhận "chỉ định dạng" (content-spec §8.2): so một câu hỏi trước/sau khi sửa và kiểm
 * văn bản có GIỐNG HỆT sau khi chuẩn hoá khoảng trắng và ngắt dòng hay không.
 *
 * Quy tắc so (theo spec):
 *  - gộp mọi chuỗi khoảng trắng và `\n` thành 1 khoảng trắng rồi so sánh;
 *  - với transcript: bỏ nhãn người nói đầu dòng trước khi so, và chuỗi nhãn theo thứ tự lời
 *    nói không được đổi (nhãn liền nhau trùng nhau được coi là một lượt — vì tách đơn thoại
 *    thành nhiều dòng cùng nhãn là thay đổi định dạng hợp lệ);
 *  - các trường không phải văn bản (số, bool, null) và cấu trúc (danh sách, khoá) phải y hệt.
 *
 * Trường METADATA (tags, trap, subskill, difficulty, notes_internal, created_at, authored_by,
 * image_url, audio_url — §8.2) được bỏ qua: chúng thuộc nhóm "Chỉ metadata", không ảnh hưởng
 * kết luận "chỉ định dạng" (agent soạn ghi "chỉ định dạng" vào notes_internal).
 * reviewed_by/reviewed_at cũng bỏ qua vì do người dùng quản lý.
 */

const IGNORED_TOP_LEVEL = new Set([
  "tags",
  "subskill",
  "difficulty",
  "notes_internal",
  "created_at",
  "authored_by",
  "image_url",
  "audio_url",
  "reviewed_by",
  "reviewed_at",
]);

/** Khoá bỏ qua ở mọi cấp (choices[].trap). */
const IGNORED_NESTED = new Set(["trap"]);

const TRANSCRIPT_FIELDS = new Set(["transcript_ko", "transcript_vi"]);

const SPEAKER_LABEL = /^(남자|여자|Nam|Nữ)( [0-9])?: ?/u;

export function normalizeWhitespace(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Tách transcript thành chuỗi nhãn (gộp nhãn liền nhau trùng nhau) và phần lời đã chuẩn hoá. */
export function splitTranscript(text: string): { labels: string[]; body: string } {
  const labels: string[] = [];
  const bodies: string[] = [];
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = SPEAKER_LABEL.exec(line);
    if (m) {
      const label = m[0].replace(/: ?$/, "");
      if (labels[labels.length - 1] !== label) labels.push(label);
      bodies.push(line.slice(m[0].length));
    } else {
      bodies.push(line);
    }
  }
  return { labels, body: normalizeWhitespace(bodies.join(" ")) };
}

export interface FormatOnlyResult {
  /** true nếu mọi trường nội dung giống hệt sau chuẩn hoá. */
  formatOnly: boolean;
  /** Trường có chữ/giá trị khác nhau thật sự (thay đổi nội dung). */
  contentChanges: string[];
  /** Trường chỉ khác khoảng trắng/ngắt dòng (thay đổi định dạng). */
  formatChanges: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function compare(
  a: unknown,
  b: unknown,
  path: string,
  field: string,
  out: { content: string[]; format: string[] },
): void {
  if (typeof a === "string" && typeof b === "string") {
    if (a === b) return;
    if (TRANSCRIPT_FIELDS.has(field)) {
      const ta = splitTranscript(a);
      const tb = splitTranscript(b);
      if (ta.body === tb.body && ta.labels.join("|") === tb.labels.join("|")) out.format.push(path);
      else out.content.push(path);
      return;
    }
    if (normalizeWhitespace(a) === normalizeWhitespace(b)) out.format.push(path);
    else out.content.push(path);
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      out.content.push(path);
      return;
    }
    a.forEach((item, i) => compare(item, b[i], `${path}[${i}]`, field, out));
    return;
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (IGNORED_NESTED.has(key)) continue;
      const child = path ? `${path}.${key}` : key;
      if (!(key in a) || !(key in b)) {
        out.content.push(child);
        continue;
      }
      compare(a[key], b[key], child, key, out);
    }
    return;
  }
  if (!Object.is(a, b)) out.content.push(path);
}

export function verifyFormatOnly(oldDoc: unknown, newDoc: unknown): FormatOnlyResult {
  const out = { content: [] as string[], format: [] as string[] };
  if (!isRecord(oldDoc) || !isRecord(newDoc)) {
    return { formatOnly: false, contentChanges: [""], formatChanges: [] };
  }
  const keys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);
  for (const key of keys) {
    if (IGNORED_TOP_LEVEL.has(key)) continue;
    if (!(key in oldDoc) || !(key in newDoc)) {
      out.content.push(key);
      continue;
    }
    compare(oldDoc[key], newDoc[key], key, key, out);
  }
  return {
    formatOnly: out.content.length === 0,
    contentChanges: out.content,
    formatChanges: out.format,
  };
}
