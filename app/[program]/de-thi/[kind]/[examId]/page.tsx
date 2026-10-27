import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireExamId, requireExamKind, requireProgram } from "@/components/config/route-guards";
import { EXAM_KINDS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { ExamRunner } from "@/components/exam/exam-runner";
import { PracticePageShell } from "@/components/practice/page-shell";
import { getExam, getExams } from "@/lib/exam/queries";
import { getPracticeTypes } from "@/lib/practice/queries";
import { PRACTICE_SKILLS } from "@/lib/practice/types";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; kind: string; examId: string }> };

/**
 * Sinh sẵn mọi đề thật của các chương trình đang mở. Đề lạ trả 404 lúc chạy (`notFound()`).
 * Với cacheComponents phải trả ít nhất một phần tử: cần có ít nhất một đề trong content/.
 */
export async function generateStaticParams() {
  const params: { program: string; kind: string; examId: string }[] = [];
  for (const program of PROGRAMS.filter(isProgramOpen)) {
    for (const kind of EXAM_KINDS) {
      const exams = await getExams(program.slug, kind.slug);
      for (const exam of exams) {
        params.push({ program: program.slug, kind: kind.slug, examId: exam.id });
      }
    }
  }
  return params;
}

async function resolve(params: Props["params"]) {
  const { program, kind, examId } = await params;
  const resolvedProgram = requireProgram(program);
  const resolvedKind = requireExamKind(kind);
  const id = requireExamId(examId);
  const exam = await getExam(resolvedProgram.slug, resolvedKind.slug, id);
  if (!exam) notFound();
  return { program: resolvedProgram, kind: resolvedKind, exam };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, kind, exam } = await resolve(params);
  return { title: `${t.exam.title(t.examKinds[kind.slug].name, exam.title)} ${program.name}` };
}

export default async function ExamPage({ params }: Props) {
  const { program, kind, exam } = await resolve(params);
  const kindName = t.examKinds[kind.slug].name;
  const listHref = `/${program.slug}/de-thi/${kind.slug}`;

  // Dạng nào đã có câu luyện: trang kết quả chỉ gắn "Luyện dạng này" tới trang tồn tại.
  const practiceTypeCodes: string[] = [];
  for (const skill of exam.skills) {
    if (skill === "writing" || !PRACTICE_SKILLS.includes(skill)) continue;
    for (const type of await getPracticeTypes(program.slug, skill)) {
      practiceTypeCodes.push(type.type_code);
    }
  }

  return (
    <PracticePageShell
      wide
      breadcrumb={[
        { label: program.name, href: `/${program.slug}` },
        { label: t.exams.title, href: `/${program.slug}/de-thi` },
        { label: kindName, href: listHref },
        { label: exam.title },
      ]}
      title={exam.title}
    >
      <ExamRunner exam={exam} practiceTypeCodes={practiceTypeCodes} listHref={listHref} />
    </PracticePageShell>
  );
}
