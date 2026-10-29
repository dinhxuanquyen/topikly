import type { Metadata } from "next";
import { requireExamKind, requireProgram } from "@/components/config/route-guards";
import { EXAM_KINDS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { ExamList } from "@/components/exam/exam-list";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";
import { PracticePageShell } from "@/components/practice/page-shell";
import { getExams } from "@/lib/exam/queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; kind: string }> };

export function generateStaticParams() {
  return EXAM_KINDS.map((kind) => ({ kind: kind.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program: programSlug, kind: kindSlug } = await params;
  const program = requireProgram(programSlug);
  const kind = requireExamKind(kindSlug);
  const exams = await getExams(program.slug, kind.slug);
  return {
    title: `${t.examKind.title(t.examKinds[kind.slug].name)} ${program.name}`,
    // Loại đề chưa có đề là trang "Sắp ra mắt" (nội dung mỏng): không lập chỉ mục.
    robots: exams.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function ExamKindPage({ params }: Props) {
  const { program: programSlug, kind: kindSlug } = await params;
  const program = requireProgram(programSlug);
  const kind = requireExamKind(kindSlug);
  const kindName = t.examKinds[kind.slug].name;
  const breadcrumb = [
    { label: program.name, href: `/${program.slug}` },
    { label: t.exams.title, href: `/${program.slug}/de-thi` },
    { label: kindName },
  ];

  const exams = await getExams(program.slug, kind.slug);

  // Loại đề chưa có đề thật: giữ trạng thái "sắp có".
  if (exams.length === 0) {
    return (
      <PlaceholderPage
        breadcrumb={breadcrumb}
        title={t.examKind.title(kindName)}
        description={t.examKinds[kind.slug].summary}
        planned={t.examKind.planned}
        statusVariant="soon"
      >
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
          {t.examKind.comingSoon}
        </p>
      </PlaceholderPage>
    );
  }

  return (
    <PracticePageShell
      wide
      breadcrumb={breadcrumb}
      title={t.examKind.title(kindName)}
      description={t.examKinds[kind.slug].summary}
    >
      <section aria-labelledby="exam-list-heading">
        <h2 id="exam-list-heading" className="mb-1 text-sm font-semibold text-muted-foreground">
          {t.examKind.listHeading}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">{t.examKind.guestNote}</p>
        <ExamList
          program={program.slug}
          kind={kind.slug}
          exams={exams}
          label={t.examKind.listLabel(kindName)}
        />
      </section>
    </PracticePageShell>
  );
}
