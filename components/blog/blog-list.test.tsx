import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogStatusBadges } from "./blog-badges";
import { BlogCategoryFilter } from "./blog-category-filter";
import { BlogIndex } from "./blog-index";
import { BlogPostList } from "./blog-post-list";
import { BlogToc } from "./blog-toc";
import { CATEGORIES, makeSummary } from "./test-fixtures";

describe("BlogPostList", () => {
  it("thẻ bài có tiêu đề, chuyên mục, ngày vi-VN, thời gian đọc và link tới bài", () => {
    render(<BlogPostList posts={[makeSummary()]} />);
    // Tên truy cập của liên kết gọn = tiêu đề; mô tả, ngày, thời gian đọc nằm ngoài liên kết.
    const link = screen.getByRole("link", { name: "Cấu trúc đề TOPIK II" });
    expect(link).toHaveAttribute("href", "/blog/cau-truc-de-topik-ii");
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(link);
    const card = screen.getByRole("article");
    expect(card).toHaveTextContent("Đề TOPIK II gồm những phần nào");
    expect(card).toHaveTextContent("27 tháng 10, 2026");
    expect(card).toHaveTextContent("5 phút đọc");
    expect(card.querySelector("time")).toHaveAttribute("datetime", "2026-10-27");
  });

  it("bài đã duyệt và đã xuất bản không có nhãn", () => {
    render(<BlogPostList posts={[makeSummary()]} />);
    expect(screen.queryByText("Bản nháp")).toBeNull();
    expect(screen.queryByText("Chưa duyệt")).toBeNull();
  });

  it("bài nháp chưa duyệt có cả hai nhãn; chưa có ngày vẫn hiển thị được", () => {
    render(
      <BlogPostList
        posts={[makeSummary({ status: "draft", reviewed: false, published_at: null })]}
      />,
    );
    expect(screen.getByText("Bản nháp")).toBeInTheDocument();
    expect(screen.getByText("Chưa duyệt")).toBeInTheDocument();
    expect(screen.getByRole("article")).not.toHaveTextContent("tháng");
  });

  it("bài đã xuất bản nhưng chưa duyệt chỉ có nhãn Chưa duyệt", () => {
    render(<BlogStatusBadges post={{ status: "published", reviewed: false }} />);
    expect(screen.getByText("Chưa duyệt")).toBeInTheDocument();
    expect(screen.queryByText("Bản nháp")).toBeNull();
  });

  it("danh sách rỗng hiện thông báo, kèm liên kết gợi ý nếu có", () => {
    render(
      <BlogPostList
        posts={[]}
        emptyText="Chưa có bài trong chuyên mục này."
        emptyAction={{ href: "/blog", label: "Xem tất cả bài viết" }}
      />,
    );
    expect(screen.getByText("Chưa có bài trong chuyên mục này.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem tất cả bài viết" })).toHaveAttribute(
      "href",
      "/blog",
    );
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("BlogCategoryFilter", () => {
  it("Tất cả được đánh dấu trang hiện tại, chuyên mục rỗng bị ẩn", () => {
    render(<BlogCategoryFilter categories={CATEGORIES} total={3} />);
    const all = screen.getByRole("link", { name: /Tất cả/ });
    expect(all).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Cấu trúc đề, 2 bài" })).toHaveAttribute(
      "href",
      "/blog/chuyen-muc/cau-truc-de",
    );
    expect(screen.queryByRole("link", { name: /^Viết/ })).toBeNull();
  });

  it("chuyên mục đang xem được đánh dấu, kể cả khi rỗng", () => {
    render(<BlogCategoryFilter categories={CATEGORIES} active="viet" total={3} />);
    expect(screen.getByRole("link", { name: /^Viết/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Tất cả/ })).not.toHaveAttribute("aria-current");
  });
});

describe("BlogIndex", () => {
  it("/blog: H1 Blog, bộ lọc và thẻ bài", () => {
    render(<BlogIndex categories={CATEGORIES} posts={[makeSummary()]} total={3} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Blog và tài liệu");
    expect(screen.getByRole("navigation", { name: "Lọc bài viết theo chuyên mục" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Danh sách bài viết" })).toBeVisible();
  });

  it("trang chuyên mục: H1 là tên chuyên mục, có breadcrumb, rỗng thì báo", () => {
    render(<BlogIndex categories={CATEGORIES} posts={[]} total={3} activeCategory="viet" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Viết");
    expect(screen.getByRole("navigation", { name: "Đường dẫn" })).toBeVisible();
    expect(screen.getByText("Chưa có bài trong chuyên mục này.")).toBeInTheDocument();
  });

  it("chưa có bài nào: báo chưa có bài", () => {
    render(<BlogIndex categories={[]} posts={[]} total={0} />);
    expect(screen.getByText(/Chưa có bài viết nào/)).toBeInTheDocument();
  });
});

describe("BlogToc", () => {
  it("liệt kê H2 với liên kết neo; dưới 2 mục thì ẩn", () => {
    const { rerender } = render(
      <BlogToc
        idPrefix="bai"
        toc={[
          { id: "a", text: "Mục A" },
          { id: "b", text: "Mục B" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Mục B" })).toHaveAttribute("href", "#b");
    rerender(
      <BlogToc
        idPrefix="bai"
        toc={[
          { id: "정보-nghia", text: "정보 nghĩa" },
          { id: "b", text: "B" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /nghĩa/ })).toHaveAttribute(
      "href",
      "#" + encodeURIComponent("정보-nghia"),
    );
    rerender(<BlogToc idPrefix="bai" toc={[{ id: "a", text: "Mục A" }]} />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
