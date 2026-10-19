import { timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

/** Khoá chính uuid sinh phía DB. */
export const pk = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/**
 * Cột cập nhật cuối. Drizzle chỉ đặt giá trị khi UPDATE qua ORM ($onUpdate);
 * không có trigger ở DB — nếu cần chặt hơn, thêm trigger ở migration sau.
 */
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * Cột user_id tham chiếu auth.users của Supabase (bảng do Supabase Auth quản lý,
 * schema "auth", không nằm trong migration của mình — drizzle.config chỉ lọc schema "public").
 * Xoá user -> xoá cascade toàn bộ dữ liệu cá nhân (đáp ứng yêu cầu xoá tài khoản).
 */
export const userId = (name = "user_id") =>
  uuid(name)
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });
