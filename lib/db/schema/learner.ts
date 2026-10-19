import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { createdAt, pk, updatedAt, userId } from "./_shared";
import { choices, exams, questions } from "./content";
import { attemptModeEnum, planStatusEnum, planTaskKindEnum, srsItemTypeEnum } from "./enums";
import { programs } from "./programs";

export const profiles = pgTable("profiles", {
  /** Khoá chính = auth.users.id (1–1 với tài khoản). */
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
  displayName: text("display_name"),
  targetLevel: smallint("target_level"),
  examDate: date("exam_date"),
  minutesPerDay: smallint("minutes_per_day"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const placementResults = pgTable(
  "placement_results",
  {
    id: pk(),
    userId: userId(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
    estimatedLevel: smallint("estimated_level"),
    /** Mã dạng câu yếu (question_types.code). */
    weakTypes: text("weak_types")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [index("placement_results_user_idx").on(t.userId, t.createdAt)],
);

export const studyPlans = pgTable(
  "study_plans",
  {
    id: pk(),
    userId: userId(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: planStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("study_plans_user_status_idx").on(t.userId, t.status)],
);

export const planTasks = pgTable(
  "plan_tasks",
  {
    id: pk(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    /** Ngày lịch của nhiệm vụ (không phải chỉ số ngày). */
    day: date("day").notNull(),
    kind: planTaskKindEnum("kind").notNull(),
    /** Tham chiếu mềm tuỳ kind: mã dạng câu, id bộ từ, id đề mini… */
    refId: text("ref_id"),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [index("plan_tasks_plan_day_idx").on(t.planId, t.day)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: pk(),
    userId: userId(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    examId: uuid("exam_id").references(() => exams.id, { onDelete: "restrict" }),
    /** Mã dạng câu khi luyện theo dạng (mode = practice). */
    practiceType: text("practice_type"),
    mode: attemptModeEnum("mode").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    /** Điểm từng phần, tổng, cấp — tính ở server khi nộp. */
    scoreJson: jsonb("score_json").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("attempts_user_started_idx").on(t.userId, t.startedAt),
    index("attempts_exam_idx").on(t.examId),
    check("attempts_target_chk", sql`${t.examId} is not null or ${t.practiceType} is not null`),
  ],
);

/** Nguồn dữ liệu cho thống kê theo dạng và lộ trình thích ứng. RLS qua attempts. */
export const answers = pgTable(
  "answers",
  {
    id: pk(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    choiceId: uuid("choice_id").references(() => choices.id, { onDelete: "set null" }),
    /** Server điền khi chấm (chế độ thi: sau khi nộp). */
    isCorrect: boolean("is_correct"),
    timeSpentMs: integer("time_spent_ms").notNull().default(0),
    flagged: boolean("flagged").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("answers_attempt_question_uq").on(t.attemptId, t.questionId),
    index("answers_attempt_idx").on(t.attemptId),
    index("answers_question_idx").on(t.questionId),
  ],
);

export const writingSubmissions = pgTable(
  "writing_submissions",
  {
    id: pk(),
    userId: userId(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    attemptId: uuid("attempt_id").references(() => attempts.id, { onDelete: "set null" }),
    text: text("text").notNull(),
    charCount: integer("char_count").notNull(),
    ruleChecksJson: jsonb("rule_checks_json").$type<Record<string, unknown>>(),
    aiScoreJson: jsonb("ai_score_json").$type<Record<string, unknown>>(),
    aiFeedbackJson: jsonb("ai_feedback_json").$type<Record<string, unknown>>(),
    modelVersion: text("model_version"),
    createdAt: createdAt(),
  },
  (t) => [index("writing_submissions_user_idx").on(t.userId, t.createdAt)],
);

/** Thẻ ôn FSRS. */
export const srsCards = pgTable(
  "srs_cards",
  {
    id: pk(),
    userId: userId(),
    itemType: srsItemTypeEnum("item_type").notNull(),
    itemId: uuid("item_id").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("srs_cards_user_item_uq").on(t.userId, t.itemType, t.itemId),
    index("srs_cards_user_due_idx").on(t.userId, t.dueAt),
  ],
);
