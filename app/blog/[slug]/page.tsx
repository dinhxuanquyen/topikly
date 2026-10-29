import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { JsonLd } from "@/components/blog/json-ld";
import { blogPostPath, buildArticleJsonLd, isIndexablePost } from "@/components/blog/seo";
import { t } from "@/components/i18n";
import { getBlogPost, getBlogPosts, getRelatedBlogPosts } from "@/lib/blog/queries";

/** Cố ý blocking để slug lạ trả đúng mã 404 (cùng lý do với app/[program]/layout.tsx). */
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

/**
 * Sinh sẵn mọi bài đang hiển thị; slug lạ trả 404 lúc chạy. Với cacheComponents phải trả ít nhất
 * một phần tử, nên khi chưa có bài nào ta trả một slug giả (trang đó gọi notFound()).
 */
export async function generateStaticParams() {
  const posts = await getBlogPosts();
  if (posts.length === 0) return [{ slug: "chua-co-bai" }];
  return posts.map((post) => ({ slug: post.slug }));
}

async function resolve(params: Props["params"]) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await resolve(params);
  const path = blogPostPath(post.slug);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: path },
    // Bài nháp: không lập chỉ mục, không đi theo liên kết.
    robots: isIndexablePost(post) ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: path,
      siteName: t.brand.name,
      locale: "vi_VN",
      section: post.category.name_vi,
      tags: post.tags.length > 0 ? post.tags : undefined,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? post.published_at ?? undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await resolve(params);
  const sameCategory = await getRelatedBlogPosts(post.slug, 3);
  return (
    <>
      <BlogArticle post={post} sameCategory={sameCategory} />
      <JsonLd data={buildArticleJsonLd(post)} />
    </>
  );
}
