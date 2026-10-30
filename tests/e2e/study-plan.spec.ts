import { expect, test } from "@playwright/test";

const URL = "/topik-ii/lo-trinh";

test.describe("Lộ trình học theo ngày — khách", () => {
  test("tạo mục tiêu, học theo liên kết thật, tải lại vẫn giữ tiến độ", async ({ page }) => {
    await page.goto(URL);
    await page.getByLabel("Cấp mục tiêu").selectOption("4");
    await page.getByLabel("Thời gian học mỗi ngày").selectOption("60");
    await page.getByRole("button", { name: "60 ngày", exact: true }).click();
    await page.getByRole("button", { name: "Tạo lộ trình", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Lộ trình đến 4급" })).toBeVisible();
    const daily = page.getByRole("region", { name: "Nhiệm vụ hôm nay" });
    await expect(daily.getByRole("checkbox")).toHaveCount(3);
    await daily.getByRole("checkbox").first().check();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Lộ trình đến 4급" })).toBeVisible();
    await expect(daily.getByRole("checkbox").first()).toBeChecked();
    await expect(page.getByRole("progressbar", { name: "Tiến độ lộ trình" })).toHaveAttribute(
      "value",
      "1",
    );
    await daily.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/ly-thuyet\/tu-vung\/v-/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(daily.getByRole("checkbox").first()).toBeChecked();
    for (const checkbox of await daily.getByRole("checkbox").all()) await checkbox.check();
    await expect(daily.getByRole("status")).toContainText("Bạn đã hoàn thành nhiệm vụ");
    await expect(page.getByText("Chuỗi hoàn thành: 1 ngày", { exact: false })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("xem trước tuần có Mini test, khóa đánh dấu tương lai và hủy thay mục tiêu", async ({
    page,
  }) => {
    await page.goto(URL);
    await page.getByLabel("Thời gian học mỗi ngày").selectOption("60");
    await page.getByRole("button", { name: "Tạo lộ trình", exact: true }).click();
    const days = page.getByLabel("Ngày học");
    await days.selectOption({ index: 6 });
    const daily = page.getByRole("region", { name: "Nhiệm vụ theo ngày" });
    await expect(daily.getByRole("link", { name: /Mini test Đọc/ })).toBeVisible();
    for (const checkbox of await daily.getByRole("checkbox").all())
      await expect(checkbox).toBeDisabled();
    await page.getByRole("button", { name: "Đổi mục tiêu" }).click();
    await page.getByLabel("Cấp mục tiêu").selectOption("6");
    await page.getByRole("button", { name: "Giữ kế hoạch hiện tại" }).click();
    await expect(page.getByRole("heading", { name: "Lộ trình đến 3급" })).toBeVisible();
    await page.getByRole("button", { name: "Đổi mục tiêu" }).click();
    await page.getByLabel("Cấp mục tiêu").selectOption("4");
    await page.getByRole("button", { name: "Tạo lại lộ trình" }).click();
    await expect(page.getByRole("heading", { name: "Lộ trình đến 4급" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Tiến độ lộ trình" })).toHaveAttribute(
      "value",
      "0",
    );
  });

  test("localStorage bị chặn: vẫn tạo và đánh dấu, cảnh báo rõ giới hạn", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("Blocked", "SecurityError");
      };
    });
    await page.goto(URL);
    await page.getByRole("button", { name: "Tạo lộ trình", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Trình duyệt không lưu được lộ trình" }),
    ).toBeVisible();
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});
