import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DEFAULT_PROGRAM, type Program } from "@/components/config/programs";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { PlaceholderPage } from "./placeholder-page";

/** Màn hình cho chương trình chưa mở (TOPIK I, EPS-TOPIK). */
export function ComingSoon({ program }: { program: Program }) {
  const fallback = DEFAULT_PROGRAM;
  return (
    <PlaceholderPage
      statusVariant="soon"
      title={t.comingSoon.title(program.name)}
      description={t.comingSoon.description(program.name)}
    >
      <Link
        href={`/${fallback.slug}`}
        className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}
      >
        {t.comingSoon.cta(fallback.name)}
      </Link>
    </PlaceholderPage>
  );
}
