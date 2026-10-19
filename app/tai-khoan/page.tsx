import type { Metadata } from "next";
import { t } from "@/components/i18n";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

export const metadata: Metadata = { title: t.account.title };

export default function AccountPage() {
  return (
    <PlaceholderPage
      title={t.account.title}
      description={t.account.description}
      planned={t.account.planned}
    >
      <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-soft-foreground">
        {t.account.guestNote}
      </p>
    </PlaceholderPage>
  );
}
