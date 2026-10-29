"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, UserRound } from "lucide-react";
import { SITE_LINKS } from "@/components/config/pillars";
import { t } from "@/components/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { getPillarLinks, isFocusPath, isPathActive, resolveProgram } from "./nav-model";
import { PILLAR_ICONS } from "./pillar-icons";
import { ProgramSwitcher } from "./program-switcher";

const linkBase =
  "relative inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-bold whitespace-nowrap lg:px-3 lg:text-[0.9375rem] text-ink-600 outline-none transition-colors duration-150 hover:bg-sky-50 hover:text-sky-700 focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-sky-100 aria-[current=page]:text-sky-700";

/**
 * Điều hướng trên cùng: logo mèo Topi, chọn chương trình, 5 trụ (từ md), Blog, Tài khoản và
 * MỘT nút hành động (định luật Hick: một lựa chọn chính mỗi màn).
 * Trên điện thoại chỉ có logo, chọn chương trình, Blog và Tài khoản (5 trụ ở thanh tab dưới đáy).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const program = resolveProgram(pathname);
  const pillars = getPillarLinks(program.slug);

  const extras = [
    { href: SITE_LINKS.blog, label: t.nav.blog, Icon: Newspaper },
    { href: SITE_LINKS.account, label: t.nav.account, Icon: UserRound },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b-2 border-line bg-background pt-[env(safe-area-inset-top)]",
        // Chế độ tập trung: trên điện thoại chỉ còn câu hỏi (trang có nút thoát riêng).
        isFocusPath(pathname) && "max-md:hidden",
      )}
    >
      <div className="mx-auto flex h-(--header-height) w-full max-w-7xl items-center gap-2 px-4 md:gap-3 md:px-6">
        <Logo />
        <ProgramSwitcher current={program} />

        <nav aria-label={t.a11y.primaryNav} className="ml-2 hidden md:block">
          <ul className="flex items-center gap-0.5">
            {pillars.map(({ key, href }) => {
              const Icon = PILLAR_ICONS[key];
              const active = isPathActive(pathname, href);
              return (
                <li key={key}>
                  <Link href={href} aria-current={active ? "page" : undefined} className={linkBase}>
                    <Icon aria-hidden className="hidden size-4 xl:block" />
                    {t.nav.pillars[key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          {extras.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isPathActive(pathname, href) ? "page" : undefined}
              className={cn(linkBase, "max-md:size-11 max-md:justify-center max-md:px-0")}
            >
              <Icon aria-hidden className="size-5 md:size-4" />
              <span className="sr-only lg:not-sr-only">{label}</span>
            </Link>
          ))}
          <Link
            href={`/${program.slug}/luyen-tap`}
            className={cn(
              buttonVariants(),
              "ml-2 hidden h-11 px-5 text-[0.9375rem] lg:inline-flex",
            )}
          >
            {t.nav.tryFree}
          </Link>
        </div>
      </div>
    </header>
  );
}
