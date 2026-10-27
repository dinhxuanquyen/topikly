import { expect, test } from "@playwright/test";

/**
 * Mã HTTP 404 thật ngay LẦN GỌI ĐẦU tới segment lạ của mọi route động (chống soft 404 cho crawler).
 *
 * Lỗi cũ: với `next start`, lần đầu tới một slug chưa từng gọi nhận 200 kèm giao diện 404 (Next
 * gửi fallback shell rồi mới resume, header `x-nextjs-postponed: 1`); từ lần hai mới 404. Nguyên
 * nhân và cách sửa: ghi chú `partialPrefetching` trong next.config.ts. Mỗi URL gắn nonce riêng theo
 * project + thời điểm nên luôn là lần gọi đầu, không phụ thuộc thứ tự chạy hay test khác.
 *
 * Trang hợp lệ phải giữ prerender (`x-nextjs-cache: HIT`); bỏ kiểm header này khi chạy E2E_DEV.
 */

const PROGRAM = "topik-ii";
const NOT_FOUND_TITLE = "Không tìm thấy trang";

test.describe("404 ngay lần gọi đầu", () => {
  test("Segment lạ ở mọi route động trả 404 (không postpone), có giao diện 404 và noindex", async ({
    request,
  }, testInfo) => {
    const nonce = `${testInfo.project.name}-${Date.now()}`;
    const missing = [
      `/khong-co-${nonce}`,
      `/khong-co-${nonce}/ly-thuyet`,
      `/${PROGRAM}/ly-thuyet/ngu-phap/khong-co-${nonce}`,
      `/${PROGRAM}/ly-thuyet/ngu-phap/nhom/khong-co-${nonce}`,
      `/${PROGRAM}/ly-thuyet/tu-vung/v-9${Date.now()}`,
      `/${PROGRAM}/ly-thuyet/tu-vung/han-tu/khong-co-${nonce}`,
      `/${PROGRAM}/luyen-tap/khong-co-${nonce}`,
      `/${PROGRAM}/luyen-tap/nghe/khong-co-${nonce}`,
      `/${PROGRAM}/luyen-tap/doc/khong-co-${nonce}`,
      `/${PROGRAM}/luyen-tap/viet/khong-co-${nonce}`,
      `/${PROGRAM}/de-thi/khong-co-${nonce}`,
      `/${PROGRAM}/de-thi/mini/khong-co-${nonce}`,
    ];
    for (const url of missing) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(404);
      expect(response.headers()["x-nextjs-postponed"], url).toBeUndefined();
      const html = await response.text();
      expect(html, url).toContain(NOT_FOUND_TITLE);
      expect(html, url).toMatch(/<meta name="robots" content="[^"]*noindex/);
    }
  });

  test("Trang hợp lệ của route động vẫn 200 và giữ bản prerender", async ({ request }) => {
    for (const url of [
      `/${PROGRAM}`,
      `/${PROGRAM}/ly-thuyet/ngu-phap/na-boda`,
      `/${PROGRAM}/ly-thuyet/tu-vung/v-00001`,
      `/${PROGRAM}/luyen-tap/viet/W51`,
      `/${PROGRAM}/de-thi/mini/doc-01`,
    ]) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      if (!process.env.E2E_DEV) {
        expect(response.headers()["x-nextjs-cache"], url).toBe("HIT");
      }
    }
  });
});
