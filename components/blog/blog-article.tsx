import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { t } from "@/components/i18n";
import { Breadcrumb } from "@/components/placeholder/breadcrumb";
import type { BlogPost, BlogPostSummary } from "@/lib/blog/types";
import { BlogStatusBadges } from "./blog-badges";
import { BlogBody } from "./blog-body";
import { BlogPostList } from "./blog-post-list";
import { BlogToc } from "./blog-toc";
import { formatBlogDate } from "./format";
import { blogCategoryPath } from "./seo";
import { renderBlogPlain } from "./blog-inline";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface BlogArticleProps {
  post: BlogPost;
  /** Bài cùng chuyên mục (đã loại bài hiện tại). */
  sameCategory: BlogPostSummary[];
}

/** Trang một bài: tiêu đề, thông tin, mục lục, thân bài, liên kết luyện tiếp, nguồn, bài cùng mục. */
export function BlogArticle({ post, sameCategory }: BlogArticleProps) {
  const isDraft = post.status === "draft";
  const showUpdated = post.updated_at !== null && post.updated_at !== post.published_at;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-10">
      <Breadcrumb
        items={[
          { label: t.blog.title, href: "/blog" },
          { label: post.category.name_vi, href: blogCategoryPath(post.category.code) },
          { label: t.blog.postCrumb },
        ]}
      />

      <article>
        <header>
          <h1 className="text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl">
            {renderBlogPlain(post.title)}
          </h1>
          <p className="mt-3 text-base text-pretty text-muted-foreground md:text-lg">
            {renderBlogPlain(post.description)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={blogCategoryPath(post.category.code)}
              className="rounded-full bg-sky-100 px-3 py-1 text-sm font-extrabold text-sky-700 outline-none hover:bg-sky-200 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {post.category.name_vi}
            </Link>
            <BlogStatusBadges post={post} />
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {post.published_at ? (
              <>
                <time dateTime={post.published_at}>
                  {t.blog.publishedOn(formatBlogDate(post.published_at))}
                </time>
                <span aria-hidden>·</span>
              </>
            ) : null}
            {showUpdated && post.updated_at ? (
              <>
                <time dateTime={post.updated_at}>
                  {t.blog.updatedOn(formatBlogDate(post.updated_at))}
                </time>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{t.blog.readingMinutes(post.reading_minutes)}</span>
          </p>
          {isDraft || !post.reviewed ? (
            <p role="note" className="mt-4 rounded-2xl bg-sun-100 px-4 py-3 text-sm font-semibold">
              {isDraft ? t.blog.draftNote : t.blog.unreviewedNote}
            </p>
          ) : null}
        </header>

        <BlogToc toc={post.toc} idPrefix={post.slug} />
        <BlogBody blocks={post.blocks} />
      </article>

      {post.related.length > 0 ? (
        <section aria-labelledby={`blog-related-heading-${post.slug}`} className="mt-10">
          <h2
            id={`blog-related-heading-${post.slug}`}
            className="mb-3 text-lg font-bold md:text-xl"
          >
            {t.blog.related}
          </h2>
          <ul className="grid gap-2">
            {post.related.map((link, index) => (
              <li key={`${index}-${link.href}`}>
                <Link
                  href={link.href}
                  className="group flex min-h-12 items-center gap-3 rounded-2xl border-2 border-b-4 border-line bg-card p-3 font-bold transition-[background-color,border-color,transform] duration-150 outline-none hover:border-sky-200 hover:bg-sky-50 focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:active:translate-y-0.5"
                >
                  <span className="min-w-0 flex-1">{link.label}</span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {post.sources.length > 0 ? (
        <section aria-labelledby={`blog-sources-heading-${post.slug}`} className="mt-10">
          <h2
            id={`blog-sources-heading-${post.slug}`}
            className="mb-3 text-lg font-bold md:text-xl"
          >
            {t.blog.sources}
          </h2>
          <ul className="space-y-2 text-sm">
            {post.sources.map((source, index) => (
              <li key={`${index}-${source.url}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-start gap-1.5 rounded-sm underline underline-offset-4 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    {source.title}
                    <span className="text-muted-foreground"> ({hostOf(source.url)})</span>
                    <span className="sr-only"> {t.blog.externalLink}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sameCategory.length > 0 ? (
        <section aria-labelledby={`blog-same-category-heading-${post.slug}`} className="mt-10">
          <h2
            id={`blog-same-category-heading-${post.slug}`}
            className="mb-3 text-lg font-bold md:text-xl"
          >
            {t.blog.sameCategory}
          </h2>
          <BlogPostList posts={sameCategory} label={t.blog.sameCategory} />
        </section>
      ) : null}

      <p className="mt-10">
        <Link
          href="/blog"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          {t.blog.backToList}
        </Link>
      </p>
    </div>
  );
}
