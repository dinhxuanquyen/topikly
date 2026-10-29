import { serializeJsonLd } from "./seo";

/**
 * Dữ liệu có cấu trúc cho công cụ tìm kiếm. React không cho đặt chuỗi thô vào <script> nên dùng
 * dangerouslySetInnerHTML; an toàn vì nội dung là JSON.stringify và "<" đã được escape (<).
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
