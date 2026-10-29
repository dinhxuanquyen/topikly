import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { t } from "@/components/i18n";

/**
 * Hiển thị văn bản có đánh dấu tối thiểu mà KHÔNG dùng dangerouslySetInnerHTML:
 *   **đậm**        -> <strong>
 *   <u>gạch</u>    -> <u>   (ngữ liệu "밑줄 친 부분")
 *   *nghiêng*      -> <em>  (chỉ khi bật `italic`; mặc định là chữ thường vì đề có dấu * thật)
 *   [chữ](href)    -> <a>   (chỉ khi bật `links`, dùng cho Blog; xem `isSafeHref`)
 * Mọi thứ khác là chữ thường, React tự escape.
 * Mỗi "\n" là một ngắt dòng cứng (quy ước content-spec 5.2): mỗi dòng thành một đoạn.
 */

const TOKEN = /\*\*([^*]+?)\*\*|<u>([^<]+?)<\/u>|\*([^*\s](?:[^*]*?[^*\s])?)\*/g;
// Thêm nhánh liên kết ở đầu: `[chữ](href)` có ưu tiên hơn dấu * bên trong chữ. Nhóm 1-2 là liên kết.
const LINK = String.raw`\[([^\]]+)\]\(([^)\s]+)\)`;
const TOKEN_WITH_LINKS = new RegExp(`${LINK}|${TOKEN.source}`, "g");
const HANGUL_RUN = /([ᄀ-ᇿ㄰-㆏가-힯]+(?:[ ·][ᄀ-ᇿ㄰-㆏가-힯]+)*)/g;

/** Bọc từng cụm chữ Hàn trong văn bản Việt bằng <span lang="ko"> (phát âm đúng, ngắt chữ đúng). */
function tagKorean(text: string, keyPrefix: string): ReactNode[] {
  return text.split(HANGUL_RUN).map((part, index) =>
    index % 2 === 1 ? (
      <span key={`${keyPrefix}-${index}`} lang="ko" className="ko">
        {part}
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>
    ),
  );
}

export interface InlineOptions {
  /** true = văn bản tiếng Việt có xen chữ Hàn: bọc cụm Hangul bằng lang="ko". */
  tagKorean?: boolean;
  /** true = *nghiêng* thành <em> (lời giải dạng markdown). Mặc định false. */
  italic?: boolean;
  /**
   * true = nhận `[chữ](href)`. Chỉ href nội bộ ("/..." không phải "//...") hoặc "https://..." được
   * làm liên kết; href khác (javascript:, http:...) hiện thành chữ thường. Khi bật, chữ trong
   * **đậm**, *nghiêng* và liên kết cũng được xử lý đệ quy (đậm lồng liên kết, v.v.).
   */
  links?: boolean;
}

/** Nội bộ ("/x") hoặc ngoài an toàn ("https://x"); chặn "//host", "javascript:", "http:". */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//") && !href.includes("\\");
  return /^https:\/\/[^\s/]/i.test(href);
}

export function isExternalHref(href: string): boolean {
  return !href.startsWith("/");
}

export function renderInline(text: string, options: InlineOptions = {}): ReactNode[] {
  const plain = (value: string, key: string): ReactNode[] =>
    options.tagKorean ? tagKorean(value, key) : [<Fragment key={key}>{value}</Fragment>];
  // Trong chế độ links, phần ruột của đậm / nghiêng / liên kết được xử lý tiếp (đệ quy).
  const inner = (value: string, key: string): ReactNode[] =>
    options.links ? renderInline(value, options) : plain(value, key);

  const pattern = options.links ? TOKEN_WITH_LINKS : TOKEN;
  const offset = options.links ? 2 : 0;

  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) out.push(...plain(text.slice(last, start), `t${last}`));
    const bold = match[1 + offset];
    const underline = match[2 + offset];
    const italic = match[3 + offset];
    if (options.links && match[1] !== undefined) {
      const label = match[1];
      const href = match[2];
      if (!isSafeHref(href)) {
        out.push(...plain(match[0], `x${start}`));
      } else if (isExternalHref(href)) {
        out.push(
          <a
            key={`a${start}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {inner(label, `a${start}`)}
            <span className="sr-only"> {t.blog.externalLink}</span>
          </a>,
        );
      } else {
        out.push(
          <Link key={`a${start}`} href={href} className="underline underline-offset-2">
            {inner(label, `a${start}`)}
          </Link>,
        );
      }
    } else if (bold !== undefined) {
      out.push(<strong key={`b${start}`}>{inner(bold, `b${start}`)}</strong>);
    } else if (underline !== undefined) {
      out.push(<u key={`u${start}`}>{plain(underline, `u${start}`)}</u>);
    } else if (italic !== undefined) {
      out.push(
        options.italic ? (
          <em key={`i${start}`}>{inner(italic, `i${start}`)}</em>
        ) : (
          <Fragment key={`i${start}`}>{plain(match[0], `i${start}`)}</Fragment>
        ),
      );
    }
    last = start + match[0].length;
  }
  if (last < text.length) out.push(...plain(text.slice(last), `t${last}`));
  return out;
}

/** Tách thành các dòng không rỗng (giữ nguyên thứ tự). */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");
}

interface RichLinesProps extends InlineOptions {
  text: string;
  className?: string;
  /** Lớp cho từng đoạn. */
  lineClassName?: string;
}

/** Mỗi dòng một <p>. */
export function RichLines({ text, className, lineClassName, tagKorean: tag }: RichLinesProps) {
  return (
    <div className={className}>
      {splitLines(text).map((line, index) => (
        <p key={index} className={lineClassName}>
          {renderInline(line, { tagKorean: tag })}
        </p>
      ))}
    </div>
  );
}
