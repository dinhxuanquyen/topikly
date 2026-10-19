import type { Metadata } from "next";
import { t } from "@/components/i18n";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

export const metadata: Metadata = { title: t.blog.title };

export default function BlogPage() {
  return (
    <PlaceholderPage
      title={t.blog.title}
      description={t.blog.description}
      planned={t.blog.planned}
    />
  );
}
