import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-index";
import { t } from "@/components/i18n";
import { getBlogCategories, getBlogPosts } from "@/lib/blog/queries";

export const metadata: Metadata = {
  title: t.blog.title,
  description: t.blog.description,
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([getBlogPosts(), getBlogCategories()]);
  return <BlogIndex categories={categories} posts={posts} total={posts.length} />;
}
