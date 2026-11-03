import type { Metadata } from "next";
import { requireProgram } from "@/components/config/route-guards";
import { TheoryShell } from "@/components/lexicon/theory-shell";
import { FlashcardStudy } from "@/components/lexicon/flashcard-study";
import { getVocabList, getVocabWord } from "@/lib/lexicon/queries";
import type { VocabWord } from "@/lib/lexicon/types";

export const instant = false;
export const metadata: Metadata = { title: "Flashcard & lịch ôn từ vựng" };
export default async function FlashcardPage({ params }: { params: Promise<{ program: string }> }) {
  const program = requireProgram((await params).program);
  const list = await getVocabList(program.slug);
  const details = await Promise.all(list.map((word) => getVocabWord(program.slug, word.id)));
  const words = details.flatMap((detail): VocabWord[] => (detail ? [detail.word] : []));
  return (
    <TheoryShell
      program={program.slug}
      title="Flashcard & lịch ôn"
      description="Nhớ nghĩa tiếng Việt, nhận ra gốc Hán-Hàn và ôn đúng lúc."
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: "Từ vựng", href: `/${program.slug}/ly-thuyet/tu-vung` },
        { label: "Flashcard" },
      ]}
    >
      <FlashcardStudy program={program.slug} words={words} />
    </TheoryShell>
  );
}
