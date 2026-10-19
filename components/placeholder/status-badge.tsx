import { Hammer, Hourglass } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";

type Variant = "building" | "soon";

const ICONS = { building: Hammer, soon: Hourglass } as const;

export function StatusBadge({
  variant = "building",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const Icon = ICONS[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-soft-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t.status[variant]}
    </span>
  );
}
