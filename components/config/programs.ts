/**
 * Danh sách chương trình thi hiển thị trên giao diện.
 * Đây là cấu hình UI; cấu trúc đề (số câu, thời gian, ngưỡng cấp) nằm ở bảng
 * `programs` phía CSDL — không lặp lại ở đây.
 */

export type ProgramStatus = "open" | "soon";

export interface Program {
  /** Segment URL: /topik-ii/... */
  slug: string;
  /** Tên hiển thị (tên riêng, không dịch). */
  name: string;
  status: ProgramStatus;
}

export const PROGRAMS = [
  { slug: "topik-ii", name: "TOPIK II", status: "open" },
  { slug: "topik-i", name: "TOPIK I", status: "soon" },
  { slug: "eps", name: "EPS-TOPIK", status: "soon" },
] as const satisfies readonly Program[];

export type ProgramSlug = (typeof PROGRAMS)[number]["slug"];

/** Chương trình mặc định khi chưa biết người dùng đang ở chương trình nào. */
export const DEFAULT_PROGRAM: Program = PROGRAMS[0];

export function getProgram(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

export function isProgramOpen(program: Program): boolean {
  return program.status === "open";
}
