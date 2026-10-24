import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { renderInline } from "./rich-text";

/**
 * Markdown nhẹ cho lời giải / ghi chú dài, KHÔNG dùng dangerouslySetInnerHTML:
 *   - dòng bắt đầu bằng "- " hoặc "* "   -> mục của danh sách không thứ tự
 *   - dòng bắt đầu bằng "1. "            -> mục của danh sách có thứ tự
 *   - dòng còn lại                       -> một đoạn
 *   - **đậm**, <u>gạch chân</u>          -> như renderInline
 * Dòng trống chỉ ngăn cách khối. Thụt đầu dòng được bỏ qua (không lồng danh sách).
 */

export type MarkdownBlock =
  { kind: "p"; text: string } | { kind: "ul"; items: string[] } | { kind: "ol"; items: string[] };

const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === "") continue;
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]!);
      else blocks.push({ kind: "ul", items: [bullet[1]!] });
    } else if (ordered) {
      if (last?.kind === "ol") last.items.push(ordered[1]!);
      else blocks.push({ kind: "ol", items: [ordered[1]!] });
    } else {
      blocks.push({ kind: "p", text: line.trim() });
    }
  }
  return blocks;
}

interface RichMarkdownProps {
  text: string;
  className?: string;
  /** Văn bản Việt có xen chữ Hàn: bọc cụm Hangul bằng lang="ko". Mặc định true. */
  tagKorean?: boolean;
}

function renderItems(items: string[], tagKorean: boolean): ReactNode {
  return items.map((item, index) => (
    <li key={index} className="leading-relaxed">
      {renderInline(item, { tagKorean, italic: true })}
    </li>
  ));
}

export function RichMarkdown({ text, className, tagKorean = true }: RichMarkdownProps) {
  const blocks = parseMarkdownBlocks(text);
  return (
    <div className={cn("space-y-2.5", className)}>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {block.kind === "p" ? (
            <p className="leading-relaxed">
              {renderInline(block.text, { tagKorean, italic: true })}
            </p>
          ) : block.kind === "ul" ? (
            <ul className="list-disc space-y-1 pl-5">{renderItems(block.items, tagKorean)}</ul>
          ) : (
            <ol className="list-decimal space-y-1 pl-5">{renderItems(block.items, tagKorean)}</ol>
          )}
        </Fragment>
      ))}
    </div>
  );
}
