/**
 * Phân loại dùng cho URL luyện tập và đề thi.
 * `code` là mã kỹ năng phía dữ liệu (cột `skill` của `question_types`).
 */

export const SKILLS = [
  { slug: "nghe", code: "listening", typePrefix: "L", sampleType: "L01" },
  { slug: "doc", code: "reading", typePrefix: "R", sampleType: "R39" },
  { slug: "viet", code: "writing", typePrefix: "W", sampleType: "W51" },
] as const;

export type SkillSlug = (typeof SKILLS)[number]["slug"];
export type SkillCode = (typeof SKILLS)[number]["code"];
export type Skill = (typeof SKILLS)[number];

export const EXAM_KINDS = [
  { slug: "full" },
  { slug: "mini" },
  { slug: "hard" },
  { slug: "ibt" },
] as const;

export type ExamKindSlug = (typeof EXAM_KINDS)[number]["slug"];
export type ExamKind = (typeof EXAM_KINDS)[number];

export function getSkill(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug);
}

export function getExamKind(slug: string): ExamKind | undefined {
  return EXAM_KINDS.find((k) => k.slug === slug);
}

/**
 * Mã dạng câu: tiền tố theo kỹ năng + 2 chữ số (L01, R39, W54…).
 * Danh sách đầy đủ sẽ lấy từ CSDL khi có; hiện chỉ kiểm tra định dạng.
 */
export function parseTypeCode(skill: Skill, raw: string): string | null {
  const match = /^([a-z])(\d{2})$/i.exec(raw);
  if (!match) return null;
  if (match[1].toUpperCase() !== skill.typePrefix) return null;
  return `${skill.typePrefix}${match[2]}`;
}

/** Mã đề: chữ số/chữ cái/gạch ngang, tối đa 40 ký tự. */
export function isValidExamId(raw: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,39}$/i.test(raw);
}
