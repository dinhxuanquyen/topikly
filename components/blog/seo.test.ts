import { describe, expect, it } from "vitest";
import { absoluteUrl, FALLBACK_SITE_URL, resolveSiteUrl } from "@/components/config/site";
import { formatBlogDate } from "./format";
import { buildArticleJsonLd, isIndexablePost, serializeJsonLd } from "./seo";
import { makePost } from "./test-fixtures";

describe("serializeJsonLd", () => {
  it("escape '<' để không đóng thẻ script sớm", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });
});

describe("buildArticleJsonLd", () => {
  it("Article với url tuyệt đối, ngày và chuyên mục", () => {
    const data = buildArticleJsonLd(makePost({ updated_at: "2026-11-02" }), "https://topikly.test");
    expect(data["@type"]).toBe("Article");
    expect(data.url).toBe("https://topikly.test/blog/cau-truc-de-topik-ii");
    expect(data.headline).toBe("Cấu trúc đề TOPIK II");
    expect(data.datePublished).toBe("2026-10-27");
    expect(data.dateModified).toBe("2026-11-02");
    expect(data.articleSection).toBe("Cấu trúc đề");
    expect(data.inLanguage).toBe("vi");
  });

  it("bài nháp chưa có ngày thì bỏ trường ngày", () => {
    const data = buildArticleJsonLd(makePost({ published_at: null }), "https://topikly.test");
    expect(data).not.toHaveProperty("datePublished");
    expect(data).not.toHaveProperty("dateModified");
  });
});

describe("isIndexablePost", () => {
  it("chỉ bài published được lập chỉ mục", () => {
    expect(isIndexablePost({ status: "published" })).toBe(true);
    expect(isIndexablePost({ status: "draft" })).toBe(false);
  });
});

describe("resolveSiteUrl", () => {
  it("lấy origin, bỏ dấu / cuối và đường dẫn", () => {
    expect(resolveSiteUrl("https://topikly.test/")).toBe("https://topikly.test");
    expect(resolveSiteUrl(" https://topikly.test/abc ")).toBe("https://topikly.test");
  });

  it("để trống hoặc sai thì dùng địa chỉ dự phòng", () => {
    expect(resolveSiteUrl(undefined)).toBe(FALLBACK_SITE_URL);
    expect(resolveSiteUrl("")).toBe(FALLBACK_SITE_URL);
    expect(resolveSiteUrl("khong-phai-url")).toBe(FALLBACK_SITE_URL);
    expect(resolveSiteUrl("javascript:alert(1)")).toBe(FALLBACK_SITE_URL);
  });

  it("absoluteUrl ghép đường dẫn", () => {
    expect(absoluteUrl("/blog", "https://topikly.test")).toBe("https://topikly.test/blog");
    expect(absoluteUrl("blog", "https://topikly.test")).toBe("https://topikly.test/blog");
  });
});

describe("formatBlogDate", () => {
  it("định dạng vi-VN, không lệch múi giờ", () => {
    expect(formatBlogDate("2026-10-27")).toBe("27 tháng 10, 2026");
    expect(formatBlogDate("2026-01-01")).toBe("1 tháng 1, 2026");
  });

  it("chuỗi sai trả nguyên văn", () => {
    expect(formatBlogDate("không phải ngày")).toBe("không phải ngày");
  });
});
