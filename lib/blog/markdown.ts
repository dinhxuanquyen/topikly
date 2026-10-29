/**
 * Parser Markdown rút gọn của Blog (docs/blog-spec.md mục 4). THUẦN: không fs, không zod, chạy được
 * ở mọi môi trường. Nhận thân bài (đã tách frontmatter) và trả về `BlogBlock[]` + mục lục + số từ
 * + danh sách lỗi có SỐ DÒNG cho mọi cú pháp ngoài tập con được hỗ trợ (không đoán ý).
 *
 * Tập con được hỗ trợ: `##`, `###`, đoạn văn, danh sách `-`/`*`/`1.` (không lồng), khung `>`,
 * bảng `| a | b |` + dòng `|---|---|`, và trong dòng: `**đậm**`, `*nghiêng*`, `[chữ](/nội-bộ)`,
 * `[chữ](https://...)`.
 *
 * Bị cấm (lỗi): `# H1`, `####` trở xuống, HTML thô, ảnh, code (khối rào, thụt lề, `` ` `` trong
 * dòng), danh sách lồng, đường kẻ ngang, H3 khi chưa có H2, bảng lệch cột, liên kết khác `/...` và
 * `https://...`, dấu `**`/`*` không khép.
 *
 * Quy ước đầu ra:
 *  - Văn bản trong khối `p`, `quote`, mục danh sách, ô bảng GIỮ NGUYÊN dấu trong dòng (`**`, `*`,
 *    `[chữ](href)`); các dòng liền nhau của một đoạn/khung/mục được nối bằng 1 dấu cách.
 *  - Văn bản của `h2`/`h3` và mục lục là chữ THUẦN (đã bỏ dấu trong dòng).
 *  - Khung `>`: dòng `>` trống tách thành khung mới.
 *  - Danh sách có thứ tự: chỉ giữ thứ tự mục (số đầu dòng bị bỏ); `ul` và `ol` liền nhau là hai danh sách.
 */
import type { BlogBlock, BlogTocEntry } from "./types";

export interface BlogMarkdownIssue {
  /** Số dòng (1-based) trong file; = `lineOffset` + số dòng trong thân bài. */
  line: number;
  message: string;
  /** Mã nhóm lỗi, ví dụ "h1", "html", "table-columns". */
  code: string;
}

export interface ParsedBlogMarkdown {
  blocks: BlogBlock[];
  /** Các H2 theo thứ tự. */
  toc: BlogTocEntry[];
  /** Số từ của chữ hiển thị (tiêu đề, đoạn, mục, khung, ô bảng; đã bỏ dấu trong dòng). */
  wordCount: number;
  errors: BlogMarkdownIssue[];
  /** Liên kết nội bộ ("/...") trong thân bài, kèm dòng, để validator đối chiếu trang có thật. */
  internalLinks: Array<{ line: number; href: string }>;
}

export interface ParseBlogMarkdownOptions {
  /** Số dòng đứng trước thân bài trong file (frontmatter), để báo số dòng đúng. Mặc định 0. */
  lineOffset?: number;
}

// ------------------------------------------------------------------ tiện ích chữ

/**
 * Bỏ dấu trong dòng, chỉ giữ chữ: `**a**` -> a, `*a*` -> a, `[chữ](href)` -> chữ.
 * Không kiểm lỗi (việc đó của parser).
 */
export function stripInline(text: string): string {
  return text
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Số từ của một đoạn chữ thuần: token tách bởi khoảng trắng và có ít nhất một chữ/số. */
export function countWordsOf(plain: string): number {
  let n = 0;
  for (const token of plain.split(/\s+/)) {
    if (/[\p{L}\p{N}]/u.test(token)) n += 1;
  }
  return n;
}

/** Thời gian đọc ước lượng: số từ / 200, làm tròn lên, tối thiểu 1 phút. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Id neo từ chữ tiêu đề: bỏ dấu tiếng Việt, đ -> d, chữ thường, mọi chuỗi ký tự khác chữ/số thành
 * một "-". Giữ nguyên chữ Hàn (Hangul) và chữ Hán để tiêu đề tiếng Hàn vẫn có neo riêng.
 * Rỗng thì trả "muc". Tính duy nhất do `uniqueId` đảm nhiệm.
 */
export function slugifyHeading(text: string): string {
  const folded = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .normalize("NFC")
    .toLowerCase();
  const slug = folded
    .replace(/[^a-z0-9\p{Script=Hangul}\p{Script=Han}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "muc" : slug;
}

/** Thêm hậu tố -2, -3… cho đến khi chưa dùng; ghi nhận id vào `used`. */
export function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
  used.add(id);
  return id;
}

// ------------------------------------------------------------------ kiểm tra trong dòng

const INTERNAL_HREF = /^\/(?!\/)[^\s]*$/;
const HTTPS_HREF = /^https:\/\/[^\s/][^\s]*$/;

/**
 * Hợp lệ khi là đường dẫn nội bộ "/..." hoặc "https://...". Chấp nhận ký tự Unicode (chữ Hán trong
 * /han-tu/經) và dạng percent-encode; không nhận khoảng trắng, "//" đầu, đoạn ".." (kể cả "%2e%2e").
 */
export function isAllowedHref(href: string): boolean {
  if (HTTPS_HREF.test(href)) return true;
  if (!INTERNAL_HREF.test(href)) return false;
  let decoded = href;
  try {
    decoded = decodeURIComponent(href);
  } catch {
    return false; // percent-encode hỏng
  }
  const path = decoded.split(/[?#]/)[0]!;
  return !path.split("/").includes("..") && !/[\\\s\u0000-\u001f]/.test(decoded);
}

type Report = (message: string, code: string) => void;

/**
 * Kiểm cú pháp trong dòng của MỘT dòng nguồn: ảnh, HTML thô, `code`, liên kết. Trả các liên kết
 * nội bộ tìm thấy. (Cân bằng `**`/`*` kiểm theo cả khối, xem `checkEmphasis`.)
 */
function checkInlineLine(
  text: string,
  report: Report,
  onInternalLink: (href: string) => void,
): void {
  if (/!\[/.test(text)) report("ảnh `![...](...)` chưa được hỗ trợ", "image");
  if (/<\/?[A-Za-z][^>\n]*>|<!--/.test(text)) {
    report("HTML thô (`<...>`) không được phép trong thân bài", "html");
  }
  if (text.includes("`")) report("dấu ` (mã trong dòng) chưa được hỗ trợ", "inline-code");

  let rest = text;
  for (const m of text.matchAll(/\[([^\]\n]*)\]\(([^)\n]*)\)/g)) {
    rest = rest.replace(m[0], m[1] ?? "");
    const label = m[1] ?? "";
    const href = (m[2] ?? "").trim();
    if (label.trim() === "") report(`liên kết "${m[0]}" thiếu chữ hiển thị`, "link-label");
    if (!isAllowedHref(href)) {
      report(
        `liên kết "${href}" không hợp lệ: chỉ nhận đường dẫn nội bộ bắt đầu bằng "/" hoặc địa chỉ "https://" (không dùng http://, javascript:, đường dẫn tương đối)`,
        "link-protocol",
      );
    } else if (href.startsWith("/")) {
      onInternalLink(href);
    }
  }
  if (/\]\(/.test(rest)) {
    report(
      "liên kết [chữ](địa chỉ) bị thiếu hoặc bị ngắt dòng, phải nằm trọn trên một dòng",
      "link-syntax",
    );
  }
}

/** `**` và `*` phải khép đôi trong một khối (đoạn, mục, khung, ô bảng). */
function checkEmphasis(text: string, report: Report): void {
  const noLinks = text.replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, "$1");
  const bold = noLinks.match(/\*\*/g)?.length ?? 0;
  if (bold % 2 !== 0) {
    report("dấu ** không khép đôi (in đậm bị bỏ dở)", "emphasis");
    return;
  }
  const single = noLinks.replace(/\*\*/g, "").match(/\*/g)?.length ?? 0;
  if (single % 2 !== 0) report("dấu * không khép đôi (in nghiêng bị bỏ dở)", "emphasis");
}

// ------------------------------------------------------------------ bảng

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

const isSeparatorRow = (cells: readonly string[]) => cells.every((c) => /^:?-+:?$/.test(c));

// ------------------------------------------------------------------ parser

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})(?:\s+(.*?))?\s*$/;
const RULE = /^(-{3,}|\*{3,}|_{3,}|={3,})$/;
const UL_ITEM = /^[-*]\s+(.*)$/;
const UL_EMPTY = /^[-*]\s*$/;
const OL_ITEM = /^(\d{1,3})\.\s+(.*)$/;

function indentOf(raw: string): number {
  let n = 0;
  for (const ch of raw) {
    if (ch === " ") n += 1;
    else if (ch === "\t") n += 4;
    else break;
  }
  return n;
}

export function parseBlogMarkdown(
  body: string,
  options: ParseBlogMarkdownOptions = {},
): ParsedBlogMarkdown {
  const offset = options.lineOffset ?? 0;
  const lines = body.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");

  const blocks: BlogBlock[] = [];
  const toc: BlogTocEntry[] = [];
  const errors: BlogMarkdownIssue[] = [];
  const internalLinks: Array<{ line: number; href: string }> = [];
  const usedIds = new Set<string>();
  const plainTexts: string[] = [];
  let seenH2 = false;

  const lineNo = (idx: number) => offset + idx + 1;
  const fail = (idx: number, message: string, code: string) =>
    errors.push({ line: lineNo(idx), message, code });

  /** Kiểm cú pháp trong dòng cho một dòng nguồn. */
  const inline = (text: string, idx: number) =>
    checkInlineLine(
      text,
      (message, code) => fail(idx, message, code),
      (href) => internalLinks.push({ line: lineNo(idx), href }),
    );

  // ---- khối đang mở
  type Open =
    | { type: "p"; start: number; parts: string[] }
    | { type: "list"; kind: "ul" | "ol"; start: number; items: string[]; itemStart: number[] }
    | { type: "quote"; start: number; parts: string[] };
  let open: Open | null = null;

  const flush = () => {
    const cur = open;
    if (!cur) return;
    open = null;
    if (cur.type === "p") {
      const text = cur.parts.join(" ");
      checkEmphasis(text, (m, c) => fail(cur.start, m, c));
      blocks.push({ kind: "p", text });
      plainTexts.push(stripInline(text));
    } else if (cur.type === "quote") {
      const text = cur.parts.join(" ");
      checkEmphasis(text, (m, c) => fail(cur.start, m, c));
      blocks.push({ kind: "quote", text });
      plainTexts.push(stripInline(text));
    } else {
      cur.items.forEach((item, i) => {
        checkEmphasis(item, (m, c) => fail(cur.itemStart[i]!, m, c));
        plainTexts.push(stripInline(item));
      });
      blocks.push({ kind: cur.kind, items: cur.items });
    }
  };

  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    const indent = indentOf(raw);

    // ---- rào code: báo một lần rồi bỏ qua đến dòng đóng
    if (inFence) {
      if (FENCE.test(raw)) inFence = false;
      i += 1;
      continue;
    }

    if (trimmed === "") {
      flush();
      i += 1;
      continue;
    }

    if (FENCE.test(raw)) {
      flush();
      fail(i, "khối code (``` hoặc ~~~) chưa được hỗ trợ", "code-fence");
      inFence = true;
      i += 1;
      continue;
    }

    // ---- danh sách đang mở: dòng thụt vào là nối tiếp mục (hoặc danh sách lồng = lỗi)
    if (open?.type === "list" && indent >= 2) {
      if (UL_ITEM.test(trimmed) || OL_ITEM.test(trimmed)) {
        fail(i, "danh sách lồng nhau chưa được hỗ trợ (chỉ một cấp)", "nested-list");
      } else {
        inline(trimmed, i);
        open.items[open.items.length - 1] += ` ${trimmed}`;
      }
      i += 1;
      continue;
    }

    // ---- tiêu đề
    const heading = HEADING.exec(trimmed);
    if (heading) {
      flush();
      const level = heading[1]!.length;
      const rawText = (heading[2] ?? "").replace(/\s+#+\s*$/, "").trim();
      if (level === 1) {
        fail(
          i,
          "`# H1` không được dùng: tiêu đề bài lấy từ `title` trong frontmatter, bắt đầu từ `##`",
          "h1",
        );
      } else if (level >= 4) {
        fail(
          i,
          `\`${"#".repeat(level)}\` không được hỗ trợ: chỉ dùng \`##\` và \`###\``,
          "heading-depth",
        );
      } else if (rawText === "") {
        fail(i, "tiêu đề để trống", "heading-empty");
      } else {
        inline(rawText, i);
        checkEmphasis(rawText, (m, c) => fail(i, m, c));
        const text = stripInline(rawText);
        if (level === 3 && !seenH2) {
          fail(i, "`###` phải nằm dưới một `##` (chưa có `##` nào phía trên)", "h3-before-h2");
        }
        const id = uniqueId(slugifyHeading(text), usedIds);
        if (level === 2) {
          seenH2 = true;
          toc.push({ id, text });
        }
        blocks.push({ kind: level === 2 ? "h2" : "h3", id, text });
        plainTexts.push(text);
      }
      i += 1;
      continue;
    }

    // ---- đường kẻ ngang / gạch chân tiêu đề
    if (RULE.test(trimmed)) {
      flush();
      fail(i, "đường kẻ ngang (---, ***, ___) và gạch chân tiêu đề (===) chưa được hỗ trợ", "rule");
      i += 1;
      continue;
    }

    // ---- khối code thụt lề (không nối tiếp đoạn văn)
    if (indent >= 4 && open?.type !== "p") {
      flush();
      fail(
        i,
        "dòng thụt lề 4 dấu cách trở lên bị coi là khối code, chưa được hỗ trợ",
        "indented-code",
      );
      i += 1;
      continue;
    }

    // ---- bảng
    if (trimmed.startsWith("|")) {
      flush();
      const start = i;
      const rows: Array<{ idx: number; cells: string[] }> = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        rows.push({ idx: i, cells: splitRow(lines[i]!) });
        i += 1;
      }
      const header = rows[0]!;
      const sep = rows[1];
      if (!sep || !isSeparatorRow(sep.cells)) {
        fail(
          start,
          "bảng phải có dòng phân cách `|---|---|` ngay sau hàng tiêu đề",
          "table-separator",
        );
        continue;
      }
      const cols = header.cells.length;
      if (sep.cells.length !== cols) {
        fail(
          sep.idx,
          `dòng phân cách có ${sep.cells.length} cột, hàng tiêu đề có ${cols} cột`,
          "table-columns",
        );
      }
      const dataRows = rows.slice(2);
      if (dataRows.length === 0) fail(start, "bảng chưa có hàng dữ liệu nào", "table-empty");
      for (const row of dataRows) {
        if (row.cells.length !== cols) {
          fail(
            row.idx,
            `hàng bảng có ${row.cells.length} cột, hàng tiêu đề có ${cols} cột`,
            "table-columns",
          );
        }
      }
      for (const row of [header, ...dataRows]) {
        for (const cell of row.cells) {
          inline(cell, row.idx);
          checkEmphasis(cell, (m, c) => fail(row.idx, m, c));
          plainTexts.push(stripInline(cell));
        }
      }
      blocks.push({
        kind: "table",
        header: header.cells,
        rows: dataRows.map((r) => r.cells),
      });
      continue;
    }

    // ---- khung mẹo / lưu ý
    if (trimmed.startsWith(">")) {
      const inner = trimmed.replace(/^>\s?/, "").trim();
      if (inner === "") {
        // dòng ">" trống: kết thúc khung hiện tại (nếu có)
        flush();
        i += 1;
        continue;
      }
      if (open?.type !== "quote") {
        flush();
        open = { type: "quote", start: i, parts: [] };
      }
      if (inner.startsWith(">")) {
        fail(i, "khung > lồng nhau chưa được hỗ trợ", "nested-quote");
      } else {
        inline(inner, i);
        (open as Extract<Open, { type: "quote" }>).parts.push(inner);
      }
      i += 1;
      continue;
    }

    // ---- danh sách
    if (UL_EMPTY.test(trimmed)) {
      flush();
      fail(i, "mục danh sách để trống", "list-empty");
      i += 1;
      continue;
    }
    const ul = UL_ITEM.exec(trimmed);
    const ol = OL_ITEM.exec(trimmed);
    const olStartsList = ol !== null && (open?.type !== "p" || ol[1] === "1");
    if (ul || (ol && olStartsList)) {
      const kind = ul ? "ul" : "ol";
      const text = (ul ? ul[1]! : ol![2]!).trim();
      if (open?.type !== "list" || open.kind !== kind) {
        flush();
        open = { type: "list", kind, start: i, items: [], itemStart: [] };
      }
      inline(text, i);
      (open as Extract<Open, { type: "list" }>).items.push(text);
      (open as Extract<Open, { type: "list" }>).itemStart.push(i);
      i += 1;
      continue;
    }

    // ---- đoạn văn
    if (open?.type === "list") {
      fail(
        i,
        "dòng ngay sau mục danh sách phải thụt vào 2 dấu cách (nối tiếp mục) hoặc cách một dòng trống (đoạn mới)",
        "list-continuation",
      );
      flush();
    } else if (open?.type === "quote") {
      fail(
        i,
        "dòng ngay sau khung > phải bắt đầu bằng > hoặc cách một dòng trống",
        "quote-continuation",
      );
      flush();
    }
    if (open?.type !== "p") {
      flush();
      open = { type: "p", start: i, parts: [] };
    }
    inline(trimmed, i);
    (open as Extract<Open, { type: "p" }>).parts.push(trimmed);
    i += 1;
  }

  if (inFence) fail(lines.length - 1, "khối code ``` không có dòng đóng", "code-fence");
  flush();

  const wordCount = plainTexts.reduce((sum, t) => sum + countWordsOf(t), 0);
  errors.sort((a, b) => a.line - b.line);
  return { blocks, toc, wordCount, errors, internalLinks };
}
