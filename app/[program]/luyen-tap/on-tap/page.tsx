import type { Metadata } from "next";
import { requireProgram } from "@/components/config/route-guards";
import { PracticePageShell } from "@/components/practice/page-shell";
import { ReviewNotebook } from "@/components/practice/review-notebook";
import { getReviewCatalog } from "@/lib/practice/queries";

export const instant = false;
export const metadata: Metadata = { title: "Sổ câu sai & câu đánh dấu" };
export default async function ReviewPage({ params }: { params: Promise<{ program: string }> }) {
  const program = requireProgram((await params).program);
  const catalog = await getReviewCatalog(program.slug);
  return (
    <PracticePageShell
      exitHref={`/${program.slug}/luyen-tap`}
      title="Sổ câu sai & câu đánh dấu"
      description="Ôn lại những câu cần thêm một lần hiểu rõ."
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: "Luyện tập", href: `/${program.slug}/luyen-tap` },
        { label: "Sổ câu" },
      ]}
    >
      <ReviewNotebook program={program.slug} catalog={catalog} />
    </PracticePageShell>
  );
}
