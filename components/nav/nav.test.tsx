import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomTabBar } from "./bottom-tab-bar";
import { SiteHeader } from "./site-header";

const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

const PILLAR_LABELS = ["Lý thuyết", "Lộ trình", "Luyện tập", "Đề thi", "Nâng cấp"];

function activeLinks(container: HTMLElement) {
  return within(container)
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page");
}

describe("BottomTabBar", () => {
  beforeEach(() => {
    nav.pathname = "/topik-ii";
  });

  it("hiển thị đủ 5 trụ theo đúng thứ tự, mỗi trụ là một liên kết", () => {
    render(<BottomTabBar />);
    const bar = screen.getByRole("navigation", { name: "Thanh điều hướng dưới" });
    const links = within(bar).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(PILLAR_LABELS);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/topik-ii/ly-thuyet",
      "/topik-ii/lo-trinh",
      "/topik-ii/luyen-tap",
      "/topik-ii/de-thi",
      "/nang-cap",
    ]);
  });

  it("không hiện ở trang làm bài (chế độ tập trung)", () => {
    nav.pathname = "/topik-ii/luyen-tap/doc/R39";
    render(<BottomTabBar />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("không hiện ở trang chủ (trang giới thiệu có nút hành động riêng)", () => {
    nav.pathname = "/";
    render(<BottomTabBar />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("không đánh dấu trụ nào khi ở trang tổng quan chương trình", () => {
    render(<BottomTabBar />);
    expect(activeLinks(screen.getByRole("navigation"))).toHaveLength(0);
  });

  it.each([
    ["/topik-ii/ly-thuyet", "Lý thuyết"],
    ["/topik-ii/lo-trinh", "Lộ trình"],
    ["/topik-ii/luyen-tap", "Luyện tập"],
    ["/topik-ii/luyen-tap/doc", "Luyện tập"],
    ["/topik-ii/de-thi/full/01", "Đề thi"],
    ["/nang-cap", "Nâng cấp"],
  ])("đường dẫn %s chỉ đánh dấu active trụ %s", (pathname, label) => {
    nav.pathname = pathname;
    render(<BottomTabBar />);
    const active = activeLinks(screen.getByRole("navigation"));
    expect(active.map((l) => l.textContent)).toEqual([label]);
  });

  it("không nhầm tiền tố: /topik-ii/luyen-tapx không làm Luyện tập active", () => {
    nav.pathname = "/topik-ii/luyen-tapx";
    render(<BottomTabBar />);
    expect(activeLinks(screen.getByRole("navigation"))).toHaveLength(0);
  });

  it("giữ nguyên chương trình đang xem khi chuyển trụ", () => {
    nav.pathname = "/topik-i/ly-thuyet";
    render(<BottomTabBar />);
    const hrefs = within(screen.getByRole("navigation"))
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs.slice(0, 4).every((h) => h?.startsWith("/topik-i/"))).toBe(true);
    expect(hrefs[4]).toBe("/nang-cap");
  });

  it("ở trang ngoài chương trình (Nâng cấp, Blog) dùng chương trình mặc định", () => {
    nav.pathname = "/blog";
    render(<BottomTabBar />);
    const first = within(screen.getByRole("navigation")).getAllByRole("link")[0];
    expect(first).toHaveAttribute("href", "/topik-ii/ly-thuyet");
  });
});

describe("SiteHeader", () => {
  beforeEach(() => {
    nav.pathname = "/topik-ii/de-thi/full/01";
  });

  it("có logo, 5 trụ, Blog, Tài khoản và bộ chọn chương trình", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Về trang chủ Topikly" })).toHaveAttribute("href", "/");

    const primary = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(
      within(primary)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(PILLAR_LABELS);

    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: "Tài khoản" })).toHaveAttribute("href", "/tai-khoan");
    expect(
      screen.getByRole("button", { name: "Chọn chương trình thi: TOPIK II" }),
    ).toBeInTheDocument();
  });

  it("đánh dấu active đúng trụ theo pathname", () => {
    render(<SiteHeader />);
    const primary = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(activeLinks(primary).map((l) => l.textContent)).toEqual(["Đề thi"]);
  });

  it("đánh dấu Blog active khi đang ở /blog", () => {
    nav.pathname = "/blog";
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tài khoản" })).not.toHaveAttribute("aria-current");
  });

  it("bộ chọn chương trình hiện tên chương trình theo URL", () => {
    nav.pathname = "/eps/luyen-tap";
    render(<SiteHeader />);
    expect(
      screen.getByRole("button", { name: "Chọn chương trình thi: EPS-TOPIK" }),
    ).toBeInTheDocument();
  });

  it("mở bộ chọn chương trình: liệt kê 3 chương trình, TOPIK I và EPS ghi sắp ra mắt", async () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: /Chọn chương trình thi/ }));

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href"))).toEqual(["/topik-ii", "/topik-i", "/eps"]);
    expect(items[0]).toHaveAttribute("aria-current", "true");
    expect(items[1]).toHaveTextContent("Sắp ra mắt");
    expect(items[2]).toHaveTextContent("Sắp ra mắt");
  });
});
