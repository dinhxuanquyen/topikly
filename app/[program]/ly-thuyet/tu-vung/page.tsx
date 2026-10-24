import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProgram } from "@/components/config/route-guards";
import { t } from "@/components/i18n";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { VocabBrowser } from "@/components/lexicon/vocab-browser";
import { getVocabFacets, getVocabList } from "@/lib/lexicon/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = requireProgram((await params).program);
  return { title: `${t.vocab.title} ${program.name}` };
}

/**
 * Danh sách từ vựng: tải MỘT lần toàn bộ danh sách (đã cache) rồi lọc ở client theo cấp, chủ đề,
 * từ loại, bạn giả, trạng thái đã thuộc, tìm chữ. Bộ lọc nằm trên URL (?cap=3&chu-de=...) nhưng
 * trang không đọc searchParams phía server nên vẫn prerender được.
 */
export default async function VocabListPage({ params }: Props) {
  const program = requireProgram((await params).program);
  const [facets, words] = await Promise.all([
    getVocabFacets(program.slug),
    getVocabList(program.slug),
  ]);
  if (!facets) notFound();

  return (
    <TheoryShell
      wide
      program={program.slug}
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.theory.title, href: `/${program.slug}/ly-thuyet` },
        { label: t.vocab.title },
      ]}
      title={t.vocab.title}
      description={t.vocab.description}
    >
      <VocabBrowser program={program.slug} words={words} facets={facets} />
    </TheoryShell>
  );
}
