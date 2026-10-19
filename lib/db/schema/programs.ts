import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ProgramConfig } from "../programs/types";
import { createdAt, pk, updatedAt } from "./_shared";
import { questionFormatEnum, skillEnum } from "./enums";

/** Phần cấu hình lưu ở cột `programs.config` (dạng câu nằm riêng ở bảng question_types). */
export type StoredProgramConfig = Omit<ProgramConfig, "question_types" | "code" | "name">;

/** Chương trình thi (topik-ii | topik-i | eps). `config` chứa cấu trúc đề, thang điểm, ngưỡng cấp. */
export const programs = pgTable(
  "programs",
  {
    id: pk(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<StoredProgramConfig>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("programs_code_uq").on(t.code)],
);

/** Dạng câu theo nhóm khoảng câu: L01, R39, W54… Khớp `lib/db/programs/*`. */
export const questionTypes = pgTable(
  "question_types",
  {
    id: pk(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    skill: skillEnum("skill").notNull(),
    /** Nhóm dạng chứa mã này: "R39-41", "L21-22", "W53" (đơn vị thẻ luyện tập/thống kê). */
    typeGroup: text("type_group").notNull(),
    /** Khoảng câu của NHÓM. */
    rangeFrom: integer("range_from").notNull(),
    rangeTo: integer("range_to").notNull(),
    nameVi: text("name_vi").notNull(),
    /** subskill chính; tập cho phép nằm ở allowed_subskills. */
    subskill: text("subskill"),
    allowedSubskills: text("allowed_subskills")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    typicalDifficultyMin: smallint("typical_difficulty_min"),
    typicalDifficultyMax: smallint("typical_difficulty_max"),
    /** Thuộc bộ dùng chung ngữ liệu (cặp/bộ ba -> question_groups). */
    paired: boolean("paired").notNull().default(false),
    /** Giới hạn ký tự bài Viết (W53, W54). */
    charMin: integer("char_min"),
    charMax: integer("char_max"),
    format: questionFormatEnum("format").notNull().default("multiple_choice"),
  },
  (t) => [
    uniqueIndex("question_types_program_code_uq").on(t.programId, t.code),
    index("question_types_skill_idx").on(t.programId, t.skill),
    index("question_types_group_idx").on(t.programId, t.typeGroup),
  ],
);
