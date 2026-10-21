import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (Playwright, chỉ chromium). Test nằm ở tests/e2e/*.spec.ts: Vitest chỉ nhận *.test.ts(x)
 * nên không chạy nhầm. Mỗi test dùng browser context mới => IndexedDB (chế độ khách) luôn sạch.
 *
 * Server: build production rồi `next start` trên cổng riêng (mặc định 3100, đổi bằng E2E_PORT).
 * Đặt E2E_DEV=1 để dùng `next dev` khi cần lặp nhanh. Ngoài CI, tái dùng server đang chạy ở cổng đó.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "vi-VN",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      // Mô phỏng điện thoại 375×812 trên chromium (không dùng engine WebKit của iPhone).
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: process.env.E2E_DEV
      ? `npm run dev -- -p ${PORT}`
      : `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
