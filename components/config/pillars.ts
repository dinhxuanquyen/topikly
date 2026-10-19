import type { ProgramSlug } from "./programs";

/**
 * 5 trụ điều hướng. Bốn trụ đầu nằm trong một chương trình (/{program}/...),
 * trụ "Nâng cấp" dùng chung toàn site.
 */
export const PILLAR_KEYS = ["theory", "roadmap", "practice", "exams", "upgrade"] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];

const PILLAR_SEGMENTS: Record<PillarKey, { scope: "program" | "global"; segment: string }> = {
  theory: { scope: "program", segment: "ly-thuyet" },
  roadmap: { scope: "program", segment: "lo-trinh" },
  practice: { scope: "program", segment: "luyen-tap" },
  exams: { scope: "program", segment: "de-thi" },
  upgrade: { scope: "global", segment: "nang-cap" },
};

export function pillarHref(key: PillarKey, program: ProgramSlug | string): string {
  const { scope, segment } = PILLAR_SEGMENTS[key];
  return scope === "program" ? `/${program}/${segment}` : `/${segment}`;
}

export const SITE_LINKS = {
  home: "/",
  blog: "/blog",
  account: "/tai-khoan",
} as const;
