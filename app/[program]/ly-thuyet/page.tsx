import type { Metadata } from "next";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.theory.title} ${program.name}` };
}

export default async function TheoryPage({ params }: Props) {
  const program = requireProgram((await params).program);

  return (
    <PlaceholderPage
      breadcrumb={[{ label: program.name, href: `/${program.slug}` }, { label: t.theory.title }]}
      title={t.theory.title}
      description={t.theory.description}
      planned={t.theory.planned}
    />
  );
}
