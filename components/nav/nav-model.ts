import { DEFAULT_PROGRAM, getProgram, type Program } from "@/components/config/programs";
import { PILLAR_KEYS, pillarHref, type PillarKey } from "@/components/config/pillars";

export interface PillarLink {
  key: PillarKey;
  href: string;
}

function normalize(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const path = pathname.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** Chương trình đang xem, suy ra từ segment đầu của URL; ngoài chương trình thì dùng mặc định. */
export function resolveProgram(pathname: string | null | undefined): Program {
  const first = normalize(pathname).split("/")[1] ?? "";
  return getProgram(first) ?? DEFAULT_PROGRAM;
}

export function getPillarLinks(programSlug: string): PillarLink[] {
  return PILLAR_KEYS.map((key) => ({ key, href: pillarHref(key, programSlug) }));
}

/** Đang ở đúng href hoặc ở trang con của href. */
export function isPathActive(pathname: string | null | undefined, href: string): boolean {
  const path = normalize(pathname);
  const target = normalize(href);
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}

/**
 * Trang làm bài luyện một dạng (/<chương trình>/luyen-tap/<kỹ năng>/<dạng>): "chế độ tập trung".
 * Trên điện thoại ẩn header và thanh tab; trang tự có nút thoát (xem PracticePageShell).
 */
export function isFocusPath(pathname: string | null | undefined): boolean {
  return /^\/[^/]+\/luyen-tap\/[^/]+\/[^/]+$/.test(normalize(pathname));
}
