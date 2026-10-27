import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Tắt có chủ đích để segment lạ trả 404 thật ngay lần gọi đầu (không soft 404).
  // Các route động ở đây `instant = false` nên shell tĩnh rỗng và được đánh dấu "blocking":
  // param lạ phải render đủ, gặp notFound() trước khi stream => 404. Bật partialPrefetching
  // thì Next 16 "nâng" route blocking đó thành fallback shell: lần gọi đầu gửi shell rỗng với
  // mã 200 rồi mới resume (header `x-nextjs-postponed: 1`), notFound() đến sau khi mã đã chốt.
  // Shell rỗng nên Partial Prefetching cũng không đem lại gì. Next bản lớn sau bắt buộc bật:
  // khi đó cần cơ chế khác (vd. đóng param ngoài generateStaticParams). Chặn hồi quy:
  // tests/e2e/not-found.spec.ts.
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
