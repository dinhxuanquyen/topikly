import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildSeedSql } from "../lib/db/seed-sql";

const out = path.resolve(process.cwd(), "supabase/seed.sql");
writeFileSync(out, buildSeedSql(), "utf8");
console.log(`Đã ghi ${out}`);
