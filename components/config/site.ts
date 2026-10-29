/**
 * Địa chỉ gốc của site, dùng cho metadataBase, canonical, sitemap và robots.
 * Lấy từ NEXT_PUBLIC_SITE_URL; để trống hoặc sai định dạng thì dùng địa chỉ dev.
 * Giá trị NEXT_PUBLIC_* được nhúng lúc build.
 */
export const FALLBACK_SITE_URL = "http://localhost:3000";

/** Trả về origin (không có "/" cuối, không có đường dẫn). */
export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return FALLBACK_SITE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK_SITE_URL;
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

let warned = false;

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const url = resolveSiteUrl(raw);
  // Bản production mà thiếu/sai địa chỉ thì canonical, sitemap và robots trỏ nhầm localhost: nhắc một lần.
  if (
    process.env.NODE_ENV === "production" &&
    !warned &&
    (!raw?.trim() || url === FALLBACK_SITE_URL)
  ) {
    warned = true;
    console.warn(
      "[topikly] NEXT_PUBLIC_SITE_URL thiếu hoặc không hợp lệ: canonical, sitemap và robots đang dùng " +
        FALLBACK_SITE_URL +
        ". Đặt biến này khi triển khai.",
    );
  }
  return url;
}

/** Ghép đường dẫn tuyệt đối từ đường dẫn bắt đầu bằng "/". */
export function absoluteUrl(path: string, siteUrl: string = getSiteUrl()): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
