import { t } from "@/components/i18n";
import { Breadcrumb } from "@/components/placeholder/breadcrumb";
import type { BlogCategoryCode, BlogCategorySummary, BlogPostSummary } from "@/lib/blog/types";
import { BlogCategoryFilter } from "./blog-category-filter";
import { BlogPostList } from "./blog-post-list";

interface BlogIndexProps {
  categories: BlogCategorySummary[];
  posts: BlogPostSummary[];
  /** Tổng số bài hiển thị (mọi chuyên mục). */
  total: number;
  /** Chuyên mục đang xem; bỏ trống = trang /blog. */
  activeCategory?: BlogCategoryCode;
}

/** Danh sách bài của /blog và /blog/chuyen-muc/<mã>: tiêu đề, bộ lọc chuyên mục, thẻ bài. */
export function BlogIndex({ categories, posts, total, activeCategory }: BlogIndexProps) {
  const category = categories.find((c) => c.code === activeCategory);
  const listHeadingId = `blog-list-heading-${activeCategory ?? "all"}`;
  const title = category ? category.name_vi : t.blog.title;
  const description = category ? category.description_vi : t.blog.description;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-10">
      {category ? (
        <Breadcrumb items={[{ label: t.blog.title, href: "/blog" }, { label: category.name_vi }]} />
      ) : null}
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-balance md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-prose text-base text-muted-foreground md:text-lg">{description}</p>
      </header>

      <div className="mb-6">
        <BlogCategoryFilter categories={categories} active={activeCategory} total={total} />
      </div>

      <section aria-labelledby={listHeadingId}>
        <h2 id={listHeadingId} className="sr-only">
          {t.blog.listLabel}
        </h2>
        <BlogPostList
          posts={posts}
          label={t.blog.listLabel}
          emptyText={category ? t.blog.emptyCategory : t.blog.emptyAll}
          emptyAction={category ? { href: "/blog", label: t.blog.emptyCategoryAction } : undefined}
        />
      </section>
    </div>
  );
}
