import Link from "next/link";
import { t } from "@/components/i18n";
import type { BlogCategoryCode, BlogCategorySummary } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { blogCategoryPath } from "./seo";

interface BlogCategoryFilterProps {
  categories: BlogCategorySummary[];
  /** Chuyên mục đang xem; bỏ trống = Tất cả. */
  active?: BlogCategoryCode;
  /** Tổng số bài (hiện trên chip "Tất cả"). */
  total: number;
}

const CHIP =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-extrabold transition-[background-color,border-color,transform] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:active:scale-95";
const CHIP_ACTIVE = "border-sky-600 bg-sky-600 text-white";
const CHIP_IDLE = "border-line bg-card text-ink-900 hover:border-sky-200 hover:bg-sky-50";

/**
 * Bộ lọc chuyên mục: dãy liên kết (mỗi chuyên mục một URL riêng, SEO được), xuống dòng khi hẹp
 * nên không gây cuộn ngang ở 375px. Chuyên mục không có bài bị ẩn, trừ chuyên mục đang xem.
 */
export function BlogCategoryFilter({ categories, active, total }: BlogCategoryFilterProps) {
  const visible = categories.filter((c) => c.post_count > 0 || c.code === active);
  return (
    <nav aria-label={t.blog.filterLabel}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/blog"
            aria-current={active === undefined ? "page" : undefined}
            className={cn(CHIP, active === undefined ? CHIP_ACTIVE : CHIP_IDLE)}
          >
            {t.blog.allCategories}
            <span className="text-xs opacity-80">{total}</span>
          </Link>
        </li>
        {visible.map((category) => {
          const isActive = category.code === active;
          return (
            <li key={category.code}>
              <Link
                href={blogCategoryPath(category.code)}
                aria-current={isActive ? "page" : undefined}
                aria-label={t.blog.categoryCount(category.name_vi, category.post_count)}
                className={cn(CHIP, isActive ? CHIP_ACTIVE : CHIP_IDLE)}
              >
                {category.name_vi}
                <span aria-hidden className="text-xs opacity-80">
                  {category.post_count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
