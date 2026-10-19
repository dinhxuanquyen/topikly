"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, UserRound } from "lucide-react";
import { SITE_LINKS } from "@/components/config/pillars";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { getPillarLinks, isPathActive, resolveProgram } from "./nav-model";
import { PILLAR_ICONS } from "./pillar-icons";
import { ProgramSwitcher } from "./program-switcher";

const linkBase =
  "relative inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-semibold aria-[current=page]:text-primary lg:px-3";

/**
 * Điều hướng trên cùng. Trên điện thoại chỉ có logo, chọn chương trình, Blog và
 * Tài khoản (5 trụ nằm ở thanh tab dưới đáy); từ md trở lên có đủ 5 trụ.
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-(--header-height) w-full max-w-6xl items-center gap-2 px-4 md:gap-3">
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
                    <Icon aria-hidden className="hidden size-4 lg:block" />
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
              className={cn(linkBase, "max-md:size-10 max-md:justify-center max-md:px-0")}
            >
              <Icon aria-hidden className="size-5 md:size-4" />
              <span className="sr-only lg:not-sr-only">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
