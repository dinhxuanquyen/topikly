import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, pk, userId } from "./_shared";
import { paymentProviderEnum, subscriptionPlanEnum } from "./enums";

/**
 * Một dòng cho mỗi lần mua gói (giữ lịch sử). Quyền Premium hiện tại = dòng có
 * plan != 'free' và (expires_at is null [lifetime] hoặc expires_at > now()).
 * Ghi/sửa chỉ qua server (service role) — người dùng chỉ đọc dòng của mình.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: pk(),
    userId: userId(),
    plan: subscriptionPlanEnum("plan").notNull().default("free"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    provider: paymentProviderEnum("provider"),
    /** Mã giao dịch của cổng thanh toán — unique theo (provider, txn) để webhook idempotent. */
    providerTxnId: text("provider_txn_id"),
    deviceLimit: integer("device_limit").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    index("subscriptions_user_expires_idx").on(t.userId, t.expiresAt),
    uniqueIndex("subscriptions_txn_uq").on(t.provider, t.providerTxnId),
  ],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    userId: userId(),
    day: date("day").notNull(),
    aiGradings: integer("ai_gradings").notNull().default(0),
    practiceQuestions: integer("practice_questions").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
