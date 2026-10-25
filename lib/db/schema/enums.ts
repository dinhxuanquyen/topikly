import { pgEnum } from "drizzle-orm/pg-core";

export const skillEnum = pgEnum("skill", ["listening", "reading", "writing", "speaking"]);

export const examKindEnum = pgEnum("exam_kind", ["full", "mini", "hard", "ibt", "placement"]);

/** Dạng câu: trắc nghiệm (có choices) hay tự luận (Viết). */
export const questionFormatEnum = pgEnum("question_format", ["multiple_choice", "constructed"]);

export const planStatusEnum = pgEnum("plan_status", ["active", "completed", "cancelled"]);

export const planTaskKindEnum = pgEnum("plan_task_kind", [
  "vocab",
  "grammar",
  "practice",
  "mini_test",
  "writing",
]);

/** exam = thi thử có giới hạn thời gian, chấm ở server; practice = luyện theo dạng. */
export const attemptModeEnum = pgEnum("attempt_mode", ["exam", "practice"]);

export const srsItemTypeEnum = pgEnum("srs_item_type", ["word", "grammar", "question"]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "premium_6m",
  "premium_1y",
  "lifetime",
]);

export const paymentProviderEnum = pgEnum("payment_provider", ["vnpay", "momo", "manual"]);
