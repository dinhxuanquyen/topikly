import type { Metadata } from "next";
import { t } from "@/components/i18n";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

export const metadata: Metadata = { title: t.upgrade.title };

export default function UpgradePage() {
  return (
    <PlaceholderPage
      title={t.upgrade.title}
      description={t.upgrade.description}
      planned={t.upgrade.planned}
    >
      <p className="text-sm text-muted-foreground">{t.upgrade.note}</p>
    </PlaceholderPage>
  );
}
