import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, pk, updatedAt } from "./_shared";
import { examKindEnum, skillEnum } from "./enums";
import { programs, questionTypes } from "./programs";

// ---------------------------------------------------------------- Đề & câu hỏi

export const exams = pgTable(
  "exams",
  {
    id: pk(),
    /** Khoá ổn định trong content/ để import idempotent. */
    externalId: text("external_id").notNull(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    kind: examKindEnum("kind").notNull(),
    title: text("title").notNull(),
    source: text("source"),
    published: boolean("published").notNull().default(false),
    isPremium: boolean("is_premium").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("exams_external_id_uq").on(t.externalId),
    index("exams_program_kind_idx").on(t.programId, t.kind),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: pk(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    skill: skillEnum("skill").notNull(),
    /** Thứ tự phần thi trong đề (README: `order`, tránh từ khoá SQL). */
    position: smallint("position").notNull(),
    durationSec: integer("duration_sec").notNull(),
  },
  (t) => [uniqueIndex("sections_exam_position_uq").on(t.examId, t.position)],
);

/** Nhóm câu dùng chung bài đọc/audio. section_id null = nhóm của câu luyện tập lẻ. */
export const questionGroups = pgTable(
  "question_groups",
  {
    id: pk(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    /**
     * group_key trong YAML ("l21-22-0007", "r48-50-0002"): các file cùng group_key
     * gộp thành MỘT dòng. null = nhóm ghép khi dựng đề (không đến từ file câu hỏi).
     */
    groupKey: text("group_key"),
    sectionId: uuid("section_id").references(() => sections.id, { onDelete: "cascade" }),
    passageMd: text("passage_md"),
    audioUrl: text("audio_url"),
    imageUrl: text("image_url"),
    transcriptKo: text("transcript_ko"),
    transcriptVi: text("transcript_vi"),
    /** Phần chung khác của bộ câu (image_desc, chart_data…). */
    meta: jsonb("meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    uniqueIndex("question_groups_program_key_uq").on(t.programId, t.groupKey),
    index("question_groups_section_idx").on(t.sectionId),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: pk(),
    /** Id YAML (vd. "r39-0001", regex ^[lrw][0-9]{2}-[0-9]{4}$) — unique để import idempotent. */
    externalId: text("external_id").notNull(),
    groupId: uuid("group_id").references(() => questionGroups.id, { onDelete: "set null" }),
    programId: uuid("program_id").notNull(),
    typeCode: text("type_code").notNull(),
    /** Số câu trong đề (1–50, 51–54); null với câu luyện tập lẻ. */
    number: smallint("number"),
    subskill: text("subskill").notNull(),
    stem: text("stem").notNull(),
    /**
     * Trường riêng theo dạng, chưa có cột: insert_sentence, speakers, tts_notes, image_desc,
     * chart_data, data_is_fictional, pair_with, notes_internal, tags gốc… (content-spec 5.8).
     * Trường Viết nằm ở bảng writing_tasks.
     */
    meta: jsonb("meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Chỉ "original" (tự biên soạn) — nguồn khác không được import. */
    source: text("source").notNull().default("original"),
    authoredBy: text("authored_by"),
    reviewedAt: date("reviewed_at"),
    difficulty: smallint("difficulty").notNull(),
    explanationVi: text("explanation_vi").notNull(),
    reviewedBy: text("reviewed_by"),
    published: boolean("published").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("questions_external_id_uq").on(t.externalId),
    index("questions_type_code_idx").on(t.programId, t.typeCode),
    index("questions_group_idx").on(t.groupId),
    index("questions_subskill_idx").on(t.subskill),
    foreignKey({
      columns: [t.programId, t.typeCode],
      foreignColumns: [questionTypes.programId, questionTypes.code],
      name: "questions_type_fk",
    }).onDelete("restrict"),
    check("questions_difficulty_range", sql`${t.difficulty} between 3 and 6`),
    check("questions_external_id_fmt", sql`${t.externalId} ~ '^[lrw][0-9]{2}-[0-9]{4}$'`),
  ],
);

export const choices = pgTable(
  "choices",
  {
    id: pk(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    /** Bắt buộc với phương án nhiễu (validate ở script import). */
    distractorNoteVi: text("distractor_note_vi"),
    /** Kiểu bẫy của phương án nhiễu (danh mục trap) — dùng thống kê lỗi sai. */
    trap: text("trap"),
    position: smallint("position").notNull().default(0),
    /** image_desc, chart_data của phương án là hình/biểu đồ (L01–L03). */
    meta: jsonb("meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    uniqueIndex("choices_question_label_uq").on(t.questionId, t.label),
    // DB chỉ chặn >1 đáp án đúng; "đúng 1" được kiểm ở script validate.
    uniqueIndex("choices_one_correct_uq")
      .on(t.questionId)
      .where(sql`${t.isCorrect}`),
  ],
);

/**
 * Phần riêng của câu Viết (W51–W54): đáp án chấp nhận, điểm cần có, bài mẫu…
 * Chứa đáp án/bài mẫu nên KHÔNG mở cho client đọc trực tiếp (xem RLS) — chỉ server/AI chấm đọc.
 * Mỗi câu Viết đúng một dòng.
 */
export const writingTasks = pgTable("writing_tasks", {
  id: pk(),
  questionId: uuid("question_id")
    .notNull()
    .unique()
    .references(() => questions.id, { onDelete: "cascade" }),
  /** formal_polite | polite | written_plain (W51–W52). */
  register: text("register"),
  /** Đề dạng chữ (W53–W54). */
  task: text("task"),
  /** W51–W52: [{label, accepted_answers, partial_answers, rejected_answers, required_elements_vi, note_vi}]. */
  blanks: jsonb("blanks").$type<unknown[]>(),
  /** W53–W54: [{id, ko, vi}]. */
  requiredPoints: jsonb("required_points").$type<unknown[]>(),
  charMin: integer("char_min"),
  charMax: integer("char_max"),
  /** [{level, text, char_count, covers, rubric_notes_vi}] — 2 bài mẫu. */
  modelAnswers: jsonb("model_answers").$type<unknown[]>(),
  expressionBank: jsonb("expression_bank").$type<unknown[]>(),
  outlineVi: text("outline_vi"),
  scoringNotesVi: text("scoring_notes_vi"),
  commonMistakesVi: jsonb("common_mistakes_vi").$type<string[]>(),
  createdAt: createdAt(),
});

export const tags = pgTable("tags", {
  id: pk(),
  /** vd. "topic:environment", "connector:그-결과" */
  slug: text("slug").notNull().unique(),
});

export const questionTags = pgTable(
  "question_tags",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.tagId] }),
    index("question_tags_tag_idx").on(t.tagId),
  ],
);

// ---------------------------------------------------------------- Lý thuyết

export const words = pgTable(
  "words",
  {
    id: pk(),
    externalId: text("external_id"),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "restrict" }),
    hangul: text("hangul").notNull(),
    hanja: text("hanja"),
    hanViet: text("han_viet"),
    meaningVi: text("meaning_vi").notNull(),
    pos: text("pos"),
    level: smallint("level"),
    exampleKo: text("example_ko"),
    exampleVi: text("example_vi"),
    /** Bạn giả Hán-Việt: từ trông giống nhưng nghĩa khác. */
    falseFriend: text("false_friend"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("words_external_id_uq").on(t.externalId),
    index("words_hangul_idx").on(t.hangul),
    index("words_level_idx").on(t.programId, t.level),
  ],
);

/** 학 · 學 · học */
export const hanjaSyllables = pgTable(
  "hanja_syllables",
  {
    syllable: text("syllable").notNull(),
    hanja: text("hanja").notNull(),
    hanViet: text("han_viet").notNull(),
  },
  (t) => [primaryKey({ columns: [t.syllable, t.hanja] })],
);

export const wordSyllables = pgTable(
  "word_syllables",
  {
    wordId: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    syllableIndex: smallint("syllable_index").notNull(),
    syllable: text("syllable").notNull(),
    hanja: text("hanja").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.wordId, t.syllableIndex] }),
    foreignKey({
      columns: [t.syllable, t.hanja],
      foreignColumns: [hanjaSyllables.syllable, hanjaSyllables.hanja],
      name: "word_syllables_hanja_fk",
    }),
    index("word_syllables_hanja_idx").on(t.syllable, t.hanja),
  ],
);

export const grammarPoints = pgTable(
  "grammar_points",
  {
    id: pk(),
    externalId: text("external_id"),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "restrict" }),
    pattern: text("pattern").notNull(),
    meaningVi: text("meaning_vi").notNull(),
    level: smallint("level"),
    function: text("function"),
    /** Nhóm ngữ pháp gần nghĩa dễ nhầm (vd. -느라고 / -는 바람에 / -는 탓에). */
    compareGroup: text("compare_group"),
    bodyMd: text("body_md"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("grammar_points_external_id_uq").on(t.externalId),
    index("grammar_points_compare_group_idx").on(t.compareGroup),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: pk(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    /** Trụ/chủ đề bài học: vocab | grammar | strategy | hanviet… */
    pillar: text("pillar").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    bodyMdx: text("body_mdx").notNull().default(""),
    position: integer("position").notNull().default(0),
    published: boolean("published").notNull().default(false),
    isPremium: boolean("is_premium").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("lessons_program_slug_uq").on(t.programId, t.slug),
    index("lessons_program_pillar_idx").on(t.programId, t.pillar, t.position),
  ],
);
