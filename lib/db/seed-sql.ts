import { listPrograms } from "./programs";
import type { ProgramConfig, QuestionTypeConfig } from "./programs";

/**
 * Sinh `supabase/seed.sql` (programs + question_types) từ cấu hình trong lib/db/programs/*.
 * Nguồn sự thật duy nhất là code cấu hình; file SQL là sản phẩm sinh ra (có test chống lệch).
 * Toàn bộ là upsert nên chạy lại bao nhiêu lần cũng được.
 */

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableInt(value: number | undefined): string {
  return value === undefined ? "NULL" : String(value);
}

/** Phần cấu hình lưu ở programs.config (mọi thứ trừ code, name, question_types). */
function storedConfig(program: ProgramConfig) {
  return {
    total_max_score: program.total_max_score,
    sections: program.sections,
    level_thresholds: program.level_thresholds,
    subskills: program.subskills,
    traps: program.traps,
    difficulty_range: program.difficulty_range,
    speaker_age_ranges: program.speaker_age_ranges,
    tag_vocabulary: program.tag_vocabulary,
    manuscript: program.manuscript,
    writing_sample_limits: program.writing_sample_limits,
    multi_trap_exempt_subskills: program.multi_trap_exempt_subskills,
    exam_blueprints: program.exam_blueprints,
    type_groups: program.type_groups,
  };
}

function typeRow(t: QuestionTypeConfig): string {
  const allowed = `ARRAY[${t.allowed_subskills.map(sqlString).join(", ")}]::text[]`;
  return `  (${[
    sqlString(t.code),
    sqlString(t.skill),
    sqlString(t.type_group),
    t.range[0],
    t.range[1],
    sqlString(t.name_vi),
    sqlString(t.subskill),
    allowed,
    t.typical_difficulty[0],
    t.typical_difficulty[1],
    t.paired ? "true" : "false",
    sqlNullableInt(t.char_limit?.min),
    sqlNullableInt(t.char_limit?.max),
    sqlString(t.format),
  ].join(", ")})`;
}

export function buildProgramSeedSql(program: ProgramConfig): string {
  const code = sqlString(program.code);
  const lines: string[] = [];
  lines.push(`-- Chương trình: ${program.code}`);
  lines.push(
    `INSERT INTO "programs" ("code", "name", "config") VALUES (${code}, ${sqlString(program.name)}, ${sqlString(JSON.stringify(storedConfig(program)))}::jsonb)`,
  );
  lines.push(
    `ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "config" = EXCLUDED."config", "updated_at" = now();`,
  );
  lines.push("");
  lines.push(
    `INSERT INTO "question_types" ("program_id", "code", "skill", "type_group", "range_from", "range_to", "name_vi", "subskill", "allowed_subskills", "typical_difficulty_min", "typical_difficulty_max", "paired", "char_min", "char_max", "format")`,
  );
  lines.push(
    `SELECT p."id", v."code", v."skill"::"skill", v."type_group", v."range_from", v."range_to", v."name_vi", v."subskill", v."allowed_subskills", v."tdmin", v."tdmax", v."paired", v."char_min", v."char_max", v."format"::"question_format"`,
  );
  lines.push(`FROM "programs" p, (VALUES`);
  lines.push(program.question_types.map(typeRow).join(",\n"));
  lines.push(
    `) AS v("code", "skill", "type_group", "range_from", "range_to", "name_vi", "subskill", "allowed_subskills", "tdmin", "tdmax", "paired", "char_min", "char_max", "format")`,
  );
  lines.push(`WHERE p."code" = ${code}`);
  lines.push(
    `ON CONFLICT ("program_id", "code") DO UPDATE SET "skill" = EXCLUDED."skill", "type_group" = EXCLUDED."type_group", "range_from" = EXCLUDED."range_from", "range_to" = EXCLUDED."range_to", "name_vi" = EXCLUDED."name_vi", "subskill" = EXCLUDED."subskill", "allowed_subskills" = EXCLUDED."allowed_subskills", "typical_difficulty_min" = EXCLUDED."typical_difficulty_min", "typical_difficulty_max" = EXCLUDED."typical_difficulty_max", "paired" = EXCLUDED."paired", "char_min" = EXCLUDED."char_min", "char_max" = EXCLUDED."char_max", "format" = EXCLUDED."format";`,
  );
  return lines.join("\n");
}

export function buildSeedSql(programs: readonly ProgramConfig[] = listPrograms()): string {
  const header = [
    "-- supabase/seed.sql — SINH TỰ ĐỘNG, đừng sửa tay.",
    "-- Nguồn: lib/db/programs/*.ts. Tạo lại: npm run db:seed-sql",
    "-- Chạy lại an toàn (upsert). Áp dụng: `supabase db reset` (tự chạy seed.sql) hoặc psql -f supabase/seed.sql",
    "",
  ].join("\n");
  return header + programs.map(buildProgramSeedSql).join("\n\n") + "\n";
}
