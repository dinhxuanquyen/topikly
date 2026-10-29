import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/blog/blog-index";
import { blogCategoryPath } from "@/components/blog/seo";
import { t } from "@/components/i18n";
import { getBlogCategories, getBlogPosts } from "@/lib/blog/queries";
import { BLOG_CATEGORIES, BLOG_CATEGORY_CODES, type BlogCategoryCode } from "@/lib/blog/types";

/** Cố ý blocking để mã chuyên mục lạ trả đúng mã 404 (cùng lý do với app/[program]/layout.tsx). */
export const instant = false;

type Props = { params: Promise<{ category: string }> };

/** Sinh sẵn mọi chuyên mục (danh sách đóng), kể cả chuyên mục chưa có bài. */
export function generateStaticParams() {
  return BLOG_CATEGORIES.map((category) => ({ category: category.code }));
}

function requireCategory(raw: string): BlogCategoryCode {
  const code = BLOG_CATEGORY_CODES.find((c) => c === raw);
  if (!code) notFound();
  return code;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = requireCategory((await params).category);
  const category = BLOG_CATEGORIES.find((c) => c.code === code)!;
  const posts = await getBlogPosts(code);
  return {
    title: t.blog.categoryPageTitle(category.name_vi),
    description: category.description_vi,
    alternates: { canonical: blogCategoryPath(code) },
    // Chuyên mục rỗng là trang mỏng: không lập chỉ mục.
    robots: posts.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogCategoryPage({ params }: Props) {
  const code = requireCategory((await params).category);
  const [posts, categories, all] = await Promise.all([
    getBlogPosts(code),
    getBlogCategories(),
    getBlogPosts(),
  ]);
  return (
    <BlogIndex categories={categories} posts={posts} total={all.length} activeCategory={code} />
  );
}
