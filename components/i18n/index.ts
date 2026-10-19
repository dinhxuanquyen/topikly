import { vi, type Messages } from "./vi";

export type { Messages };

/** Hiện chỉ có tiếng Việt; thêm ngôn ngữ khác thì chọn theo locale tại đây. */
export const t: Messages = vi;
