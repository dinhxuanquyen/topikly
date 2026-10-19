"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { getPillarLinks, isPathActive, resolveProgram } from "./nav-model";
import { PILLAR_ICONS } from "./pillar-icons";

/**
 * Thanh tab cố định dưới đáy, chỉ hiện trên điện thoại (< md).
 * Chừa vùng an toàn iOS bằng env(safe-area-inset-bottom); <main> chừa chỗ tương ứng
 * bằng class `pb-tabbar` (xem app/globals.css).
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const program = resolveProgram(pathname);
  const pillars = getPillarLinks(program.slug);

  return (
    <nav
      aria-label={t.a11y.tabBar}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {pillars.map(({ key, href }) => {
          const Icon = PILLAR_ICONS[key];
          const active = isPathActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-(--tabbar-height) flex-col items-center justify-center gap-0.5 px-1 text-[0.6875rem] leading-tight font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  "aria-[current=page]:font-semibold aria-[current=page]:text-primary",
                  "after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:rounded-b-full aria-[current=page]:after:bg-primary",
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
