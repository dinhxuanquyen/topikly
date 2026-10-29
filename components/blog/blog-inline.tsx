import type { ReactNode } from "react";
import { renderInline } from "@/components/practice/rich-text";

/**
 * Chữ trong thân bài Blog: **đậm**, *nghiêng*, [chữ](href), tự gắn lang="ko" cho cụm chữ Hàn.
 * Dùng chung bộ render của trụ Luyện tập (không dangerouslySetInnerHTML).
 */
export function renderBlogInline(text: string): ReactNode[] {
  return renderInline(text, { tagKorean: true, italic: true, links: true });
}

/** Chữ thuần (tiêu đề h2/h3, mục lục): chỉ gắn lang="ko", không diễn giải dấu đánh dấu. */
export function renderBlogPlain(text: string): ReactNode[] {
  return renderInline(text, { tagKorean: true });
}
