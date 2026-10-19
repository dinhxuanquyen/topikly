"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { PROGRAMS, type Program } from "@/components/config/programs";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";

export function ProgramSwitcher({ current }: { current: Program }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`${t.nav.programSwitcher.choose}: ${current.name}`}
        className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-background px-3 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted"
      >
        {current.name}
        <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup className="min-w-52 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                {t.nav.programSwitcher.label}
              </Menu.GroupLabel>
              {PROGRAMS.map((program) => {
                const isCurrent = program.slug === current.slug;
                return (
                  <Menu.LinkItem
                    key={program.slug}
                    closeOnClick
                    render={
                      <Link
                        href={`/${program.slug}`}
                        aria-current={isCurrent ? "true" : undefined}
                      />
                    }
                    className={cn(
                      "flex min-h-11 cursor-default items-center gap-2 rounded-lg px-2.5 text-sm outline-none select-none data-highlighted:bg-muted",
                      isCurrent && "font-semibold",
                    )}
                  >
                    <span className="flex-1">{program.name}</span>
                    {program.status === "soon" ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {t.status.soon}
                      </span>
                    ) : null}
                    {isCurrent ? <Check aria-hidden className="size-4 text-primary" /> : null}
                  </Menu.LinkItem>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
