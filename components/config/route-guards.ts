import { notFound } from "next/navigation";
import {
  getExamKind,
  getSkill,
  isValidExamId,
  parseTypeCode,
  type ExamKind,
  type Skill,
} from "./taxonomy";
import { getProgram, type Program } from "./programs";

/** Các hàm kiểm tra segment URL; segment lạ thì trả 404. */

export function requireProgram(slug: string): Program {
  const program = getProgram(slug);
  if (!program) notFound();
  return program;
}

export function requireSkill(slug: string): Skill {
  const skill = getSkill(slug);
  if (!skill) notFound();
  return skill;
}

export function requireTypeCode(skill: Skill, raw: string): string {
  const code = parseTypeCode(skill, raw);
  if (!code) notFound();
  return code;
}

export function requireExamKind(slug: string): ExamKind {
  const kind = getExamKind(slug);
  if (!kind) notFound();
  return kind;
}

export function requireExamId(raw: string): string {
  if (!isValidExamId(raw)) notFound();
  return raw;
}
