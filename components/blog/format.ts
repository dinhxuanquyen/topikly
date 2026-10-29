/** Định dạng ngày cho Blog. Ngày vào là "YYYY-MM-DD" (không múi giờ), nên luôn tính theo UTC. */

const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-27" -> "27 tháng 10, 2026". Chuỗi không hợp lệ trả về nguyên văn. */
export function formatBlogDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return iso;
  return DATE_FORMAT.format(date);
}
