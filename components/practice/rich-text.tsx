import { Fragment, type ReactNode } from "react";

/**
 * Hiển thị văn bản có đánh dấu tối thiểu mà KHÔNG dùng dangerouslySetInnerHTML:
 *   **đậm**        -> <strong>
 *   <u>gạch</u>    -> <u>   (ngữ liệu "밑줄 친 부분")
 * Mọi thứ khác là chữ thường, React tự escape.
 * Mỗi "\n" là một ngắt dòng cứng (quy ước content-spec 5.2): mỗi dòng thành một đoạn.
 */

const TOKEN = /\*\*([^*]+?)\*\*|<u>([^<]+?)<\/u>/g;
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
}

export function renderInline(text: string, options: InlineOptions = {}): ReactNode[] {
  const plain = (value: string, key: string): ReactNode[] =>
    options.tagKorean ? tagKorean(value, key) : [<Fragment key={key}>{value}</Fragment>];

  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) out.push(...plain(text.slice(last, start), `t${last}`));
    if (match[1] !== undefined) {
      out.push(<strong key={`b${start}`}>{plain(match[1], `b${start}`)}</strong>);
    } else if (match[2] !== undefined) {
      out.push(<u key={`u${start}`}>{plain(match[2], `u${start}`)}</u>);
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
