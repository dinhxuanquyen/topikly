import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogArticle } from "./blog-article";
import { makePost, makeSummary } from "./test-fixtures";

describe("BlogArticle", () => {
  it("có H1, ngày, thời gian đọc, mục lục, thân bài, luyện tiếp và nguồn", () => {
    render(<BlogArticle post={makePost()} sameCategory={[]} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cấu trúc đề TOPIK II");
    expect(screen.getByText("Đăng ngày 27 tháng 10, 2026")).toBeInTheDocument();
    expect(screen.getByText("5 phút đọc")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mục lục" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Phần Nghe" })).toHaveAttribute(
      "id",
      "phan-nghe",
    );
    const related = screen.getByRole("region", { name: "Luyện tiếp trên Topikly" });
    expect(within(related).getByRole("link", { name: /Làm Mini test/ })).toHaveAttribute(
      "href",
      "/topik-ii/de-thi/mini",
    );
    const sources = screen.getByRole("region", { name: "Nguồn tham khảo" });
    const link = within(sources).getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("bài nháp chưa duyệt có nhãn và ghi chú; không hiện mục rỗng", () => {
    render(
      <BlogArticle
        post={makePost({
          status: "draft",
          reviewed: false,
          related: [],
          sources: [],
          published_at: null,
        })}
        sameCategory={[]}
      />,
    );
    expect(screen.getByText("Bản nháp")).toBeInTheDocument();
    expect(screen.getByText("Chưa duyệt")).toBeInTheDocument();
    expect(screen.getByText(/Đây là bản nháp/)).toBeInTheDocument();
    expect(screen.queryByText("Luyện tiếp trên Topikly")).toBeNull();
    expect(screen.queryByText("Nguồn tham khảo")).toBeNull();
    expect(screen.queryByText(/Đăng ngày/)).toBeNull();
  });

  it("hiện ngày cập nhật khi khác ngày đăng và bài cùng chuyên mục", () => {
    render(
      <BlogArticle
        post={makePost({ updated_at: "2026-11-02" })}
        sameCategory={[makeSummary({ slug: "bai-khac", title: "Bài khác" })]}
      />,
    );
    expect(screen.getByText("cập nhật 2 tháng 11, 2026")).toBeInTheDocument();
    const same = screen.getByRole("region", { name: "Bài cùng chuyên mục" });
    expect(within(same).getByRole("link", { name: /Bài khác/ })).toHaveAttribute(
      "href",
      "/blog/bai-khac",
    );
  });
});

describe("BlogArticle: id và nhãn trợ năng", () => {
  it("id tiêu đề các mục phụ chứa slug, nên hai bài cùng nằm trong DOM không trùng id", () => {
    const { container } = render(
      <>
        <BlogArticle post={makePost({ slug: "bai-mot" })} sameCategory={[makeSummary()]} />
        <BlogArticle post={makePost({ slug: "bai-hai" })} sameCategory={[makeSummary()]} />
      </>,
    );
    // Chỉ xét id cố định của khung bài (id neo trong thân bài lấy từ nội dung).
    const ids = [...container.querySelectorAll("[id^='blog-']")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("blog-toc-heading-bai-mot");
    expect(ids).toContain("blog-related-heading-bai-hai");
  });

  it("nhãn bảng phân biệt được: số thứ tự và chữ cột đầu", () => {
    render(
      <BlogArticle
        post={makePost({
          blocks: [
            { kind: "table", header: ["**Từ**", "Nghĩa"], rows: [["a", "b"]] },
            { kind: "table", header: ["Phần", "Số câu"], rows: [["Nghe", "50"]] },
          ],
        })}
        sameCategory={[]}
      />,
    );
    expect(screen.getByRole("region", { name: "Bảng 1: Từ" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bảng 2: Phần" })).toBeInTheDocument();
  });
});
