import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { topikII } from "@/lib/db/programs";
import { buildProgramSeedSql, buildSeedSql, sqlString } from "@/lib/db/seed-sql";

describe("seed SQL", () => {
  it("sqlString nhân đôi dấu nháy đơn", () => {
    expect(sqlString("it's")).toBe("'it''s'");
  });

  it("supabase/seed.sql khớp cấu hình hiện tại (chạy lại `npm run db:seed-sql` nếu lệch)", () => {
    const file = readFileSync(path.resolve(__dirname, "../../supabase/seed.sql"), "utf8");
    expect(file).toBe(buildSeedSql());
  });

  it("upsert và đủ 104 dòng question_types", () => {
    const sql = buildProgramSeedSql(topikII);
    expect(sql).toContain('ON CONFLICT ("code") DO UPDATE');
    expect(sql).toContain('ON CONFLICT ("program_id", "code") DO UPDATE');
    expect(sql.match(/^ {2}\('[LRW]\d{2}',/gm)).toHaveLength(104);
  });

  it("config lưu cấu trúc đề, ngưỡng cấp, nhóm dạng nhưng không lặp question_types", () => {
    const sql = buildProgramSeedSql(topikII);
    const json = /'(\{"total_max_score"[\s\S]*?\})'::jsonb/.exec(sql)?.[1];
    expect(json).toBeDefined();
    const config = JSON.parse(json!.replace(/''/g, "'"));
    expect(config.level_thresholds).toHaveLength(4);
    expect(config.sections).toHaveLength(3);
    expect(config.type_groups.length).toBe(topikII.type_groups.length);
    expect(config.question_types).toBeUndefined();
  });
});
