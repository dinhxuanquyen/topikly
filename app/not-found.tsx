import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center px-4 py-16 md:px-6">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold md:text-3xl">{t.notFound.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.notFound.description}</p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-5 text-base")}>
        {t.notFound.home}
      </Link>
    </section>
  );
}
