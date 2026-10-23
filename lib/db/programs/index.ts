import { topikII } from "./topik-ii";
import type {
  ExamBlueprint,
  ExamKindCode,
  ProgramCode,
  ProgramConfig,
  QuestionTypeConfig,
  Skill,
} from "./types";

export * from "./types";
export { topikII } from "./topik-ii";

/**
 * Registry chương trình theo code. Thêm `topik-i`, `eps` bằng cách tạo file cấu hình
 * cùng kiểu `ProgramConfig` rồi đăng ký ở đây — không cần sửa logic nghiệp vụ.
 */
const registry: Partial<Record<ProgramCode, ProgramConfig>> = {
  "topik-ii": topikII,
  // "topik-i": topikI,
  // eps: eps,
};

export function listPrograms(): ProgramConfig[] {
  return Object.values(registry);
}

export function findProgram(code: string): ProgramConfig | undefined {
  return (registry as Record<string, ProgramConfig | undefined>)[code];
}

export function getProgram(code: string): ProgramConfig {
  const program = findProgram(code);
  if (!program) throw new Error(`Chương trình không tồn tại hoặc chưa cấu hình: ${code}`);
  return program;
}

export function findQuestionType(
  programCode: string,
  typeCode: string,
): QuestionTypeConfig | undefined {
  return findProgram(programCode)?.question_types.find((t) => t.code === typeCode);
}

/**
 * Cấu trúc (số câu, thời gian) của một phần thi theo loại đề. Ưu tiên `exam_blueprints`; loại không
 * khai báo (Full…) lấy theo `sections` của chương trình. `undefined` nếu chương trình không có phần đó.
 */
export function getExamBlueprint(
  program: ProgramConfig,
  kind: ExamKindCode,
  skill: Skill,
): ExamBlueprint | undefined {
  const declared = program.exam_blueprints[kind]?.[skill];
  if (declared) return declared;
  const section = program.sections.find((s) => s.skill === skill);
  return section
    ? { question_count: section.question_count, duration_sec: section.duration_sec }
    : undefined;
}
