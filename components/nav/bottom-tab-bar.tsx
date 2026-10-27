"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { getPillarLinks, isPathActive, resolveProgram } from "./nav-model";
import { PILLAR_ICONS } from "./pillar-icons";

/**
 * Thanh tab cố định dưới đáy, chỉ hiện trên điện thoại (< md). Trụ đang xem là ô xanh nhạt.
 * Chừa vùng an toàn iOS bằng env(safe-area-inset-bottom); <main> chừa chỗ tương ứng
 * bằng class `pb-tabbar` (xem app/globals.css).
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const program = resolveProgram(pathname);
  const pillars = getPillarLinks(program.slug);

  // Trang chủ có nút hành động riêng; thanh tab là điều hướng của app, không đè lên trang giới thiệu.
  if (pathname === "/") return null;

  return (
    <nav
      aria-label={t.a11y.tabBar}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-1.5">
        {pillars.map(({ key, href }) => {
          const Icon = PILLAR_ICONS[key];
          const active = isPathActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[calc(var(--tabbar-height)-0.75rem)] flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[0.6875rem] leading-tight font-bold whitespace-nowrap text-ink-600 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset motion-safe:active:scale-95",
                  "aria-[current=page]:bg-sky-100 aria-[current=page]:text-sky-700",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
                <span>{t.nav.pillars[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
