import type { Metadata } from "next";
import { requireExamId, requireExamKind, requireProgram } from "@/components/config/route-guards";
import { EXAM_KINDS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { PlaceholderPage } from "@/components/placeholder/placeholder-page";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; kind: string; examId: string }> };

export function generateStaticParams() {
  return EXAM_KINDS.map((kind) => ({ kind: kind.slug, examId: kind.sampleExamId }));
}

async function resolve(params: Props["params"]) {
  const { program, kind, examId } = await params;
  return {
    program: requireProgram(program),
    kind: requireExamKind(kind),
    examId: requireExamId(examId),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, kind, examId } = await resolve(params);
  return { title: `${t.exam.title(t.examKinds[kind.slug].name, examId)} ${program.name}` };
}

export default async function ExamPage({ params }: Props) {
  const { program, kind, examId } = await resolve(params);
  const kindName = t.examKinds[kind.slug].name;

  return (
    <PlaceholderPage
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.exams.title, href: `/${program.slug}/de-thi` },
        { label: kindName, href: `/${program.slug}/de-thi/${kind.slug}` },
        { label: t.examKind.examLabel(examId) },
      ]}
      title={t.exam.title(kindName, examId)}
      description={t.exam.description(kindName)}
      planned={t.exam.planned}
    />
  );
}
