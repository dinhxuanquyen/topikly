import Link from "next/link";
import { TopiCat } from "@/components/brand/topi-cat";
import { t } from "@/components/i18n";
import { SITE_LINKS } from "@/components/config/pillars";

export function Logo() {
  return (
    <Link
      href={SITE_LINKS.home}
      // Trang chủ có câu làm thử kèm lời giải; không tải trước khi người học đang làm bài.
      prefetch={false}
      aria-label={t.a11y.goHome}
      className="group flex shrink-0 items-center gap-2 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <TopiCat className="size-9 transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none" />
      <span className="text-xl font-black tracking-tight text-sky-600 max-[360px]:sr-only">
        {t.brand.name}
      </span>
    </Link>
  );
}
