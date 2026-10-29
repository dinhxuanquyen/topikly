import { Lightbulb } from "lucide-react";
import { t } from "@/components/i18n";
import type { BlogBlock } from "@/lib/blog/types";
import { renderBlogInline, renderBlogPlain } from "./blog-inline";

/** Chừa chỗ cho thanh điều hướng dính khi nhảy tới neo mục lục. */
const HEADING_SCROLL = "scroll-mt-[calc(var(--header-height)+1rem)]";

function Block({ block, tableIndex }: { block: BlogBlock; tableIndex: number }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2
          id={block.id}
          className={`${HEADING_SCROLL} mt-10 mb-3 text-xl leading-snug font-bold text-balance md:text-2xl`}
        >
          {renderBlogPlain(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3
          id={block.id}
          className={`${HEADING_SCROLL} mt-6 mb-2 text-lg leading-snug font-semibold text-balance`}
        >
          {renderBlogPlain(block.text)}
        </h3>
      );
    case "p":
      return <p className="my-4 leading-relaxed">{renderBlogInline(block.text)}</p>;
    case "ul":
      return (
        <ul className="my-4 list-disc space-y-1.5 pl-6 marker:text-muted-foreground">
          {block.items.map((item, index) => (
            <li key={index} className="leading-relaxed">
              {renderBlogInline(item)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="my-4 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-muted-foreground">
          {block.items.map((item, index) => (
            <li key={index} className="leading-relaxed">
              {renderBlogInline(item)}
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <div
          role="note"
          aria-label={t.blog.tipLabel}
          className="my-5 flex gap-3 rounded-3xl bg-sky-50 p-4 text-ink-900 md:p-5"
        >
          <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p className="min-w-0 leading-relaxed">{renderBlogInline(block.text)}</p>
        </div>
      );
    case "table":
      return (
        // Khung cuộn ngang: bảng rộng chỉ cuộn trong khung, trang không bị cuộn ngang.
        // tabIndex để người dùng bàn phím cuộn được.
        <div
          role="region"
          tabIndex={0}
          aria-label={t.blog.tableLabel(tableIndex, plainHeader(block.header[0] ?? ""))}
          className="my-5 max-w-full overflow-x-auto rounded-2xl border-2 border-line focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="bg-sky-50">
              <tr>
                {block.header.map((cell, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="border-b border-border px-3 py-2 font-semibold whitespace-nowrap"
                  >
                    {renderBlogInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="min-w-28 px-3 py-2 align-top">
                      {renderBlogInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Chữ tiêu đề cột cho nhãn trợ năng: bỏ dấu đậm/nghiêng và liên kết. */
function plainHeader(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*+/g, "")
    .trim();
}

/** Thân bài: nhận các khối đã được server parse, chỉ render, không tự parse Markdown. */
export function BlogBody({ blocks }: { blocks: BlogBlock[] }) {
  // Số thứ tự bảng (1, 2, ...) cho nhãn trợ năng; 0 với khối không phải bảng.
  const tableNumbers = blocks.map((block, index) =>
    block.kind === "table"
      ? blocks.slice(0, index + 1).filter((b) => b.kind === "table").length
      : 0,
  );
  return (
    <div className="text-base text-pretty md:text-[1.0625rem]">
      {blocks.map((block, index) => (
        <Block key={index} block={block} tableIndex={tableNumbers[index]} />
      ))}
    </div>
  );
}
