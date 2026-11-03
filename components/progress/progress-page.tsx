import { PracticePageShell } from "@/components/practice/page-shell";
import { ProgressDashboard } from "./progress-dashboard";
import { getPracticeTypes } from "@/lib/practice/queries";
import { getPlannerCatalog } from "@/lib/planner/queries";
import { getVocabList } from "@/lib/lexicon/queries";
import type { Program } from "@/components/config/programs";

export async function ProgressPageContent({ program }: { program: Program }) {
  const [types, catalog, words] = await Promise.all([
    getPracticeTypes(program.slug),
    getPlannerCatalog(program.slug),
    getVocabList(program.slug),
  ]);
  return (
    <PracticePageShell
      wide
      title="Tiến bộ của tôi"
      description={`${program.name} · Kết quả học được lưu trên thiết bị của bạn.`}
      breadcrumb={[{ label: program.name, href: `/${program.slug}` }, { label: "Tiến bộ" }]}
    >
      <ProgressDashboard
        program={program.slug}
        types={types}
        catalog={catalog}
        wordIds={words.map((w) => w.id)}
      />
    </PracticePageShell>
  );
}
