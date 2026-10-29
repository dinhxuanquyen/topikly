import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/components/config/site";

/**
 * Cho phép thu thập toàn site trừ API và trang tài khoản (nội dung cá nhân, không có giá trị tìm
 * kiếm). Trỏ tới sitemap theo NEXT_PUBLIC_SITE_URL.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/tai-khoan"] }],
    sitemap: absoluteUrl("/sitemap.xml", siteUrl),
  };
}
