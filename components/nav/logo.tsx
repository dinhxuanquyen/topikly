import Link from "next/link";
import { t } from "@/components/i18n";
import { SITE_LINKS } from "@/components/config/pillars";

export function Logo() {
  return (
    <Link
      href={SITE_LINKS.home}
      aria-label={t.a11y.goHome}
      className="flex items-center gap-2 rounded-md font-bold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        lang="ko"
        className="grid size-8 place-items-center rounded-lg bg-primary text-base leading-none text-primary-foreground"
      >
        토
      </span>
      <span className="text-lg max-[360px]:sr-only">{t.brand.name}</span>
    </Link>
  );
}
