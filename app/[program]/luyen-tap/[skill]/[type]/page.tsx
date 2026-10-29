import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireProgram, requireSkill, requireTypeCode } from "@/components/config/route-guards";
import { SKILLS } from "@/components/config/taxonomy";
import { t } from "@/components/i18n";
import { PracticePageShell } from "@/components/practice/page-shell";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { WritingPracticeRunner } from "@/components/writing/writing-runner";
import { getPracticeQuestions, getPracticeTypes } from "@/lib/practice/queries";
import { getWritingPrompts, getWritingTypes } from "@/lib/practice/writing-queries";

/** Cố ý blocking để segment lạ trả 404: xem ghi chú ở app/[program]/layout.tsx. */
export const instant = false;

type Props = { params: Promise<{ program: string; skill: string; type: string }> };

/**
 * Sinh sẵn mọi dạng đang có câu / đề của các chương trình đang mở (Nghe, Đọc, Viết). Dạng lạ hoặc
 * chưa có câu không nằm trong danh sách và trả 404 lúc chạy (xem `PracticeTypePage`). Với
 * cacheComponents phải trả ít nhất một phần tử.
 */
export async function generateStaticParams() {
  const params: { program: string; skill: string; type: string }[] = [];
  for (const program of PROGRAMS.filter(isProgramOpen)) {
    for (const skill of SKILLS) {
      if (skill.code === "writing") {
        for (const type of await getWritingTypes(program.slug)) {
          params.push({ program: program.slug, skill: skill.slug, type: type.type_code });
        }
        continue;
      }
      const types = await getPracticeTypes(program.slug, skill.code);
      for (const type of types) {
        params.push({ program: program.slug, skill: skill.slug, type: type.type_code });
      }
    }
  }
  return params;
}

async function resolve(params: Props["params"]) {
  const { program, skill, type } = await params;
  const resolvedSkill = requireSkill(skill);
  return {
    program: requireProgram(program),
    skill: resolvedSkill,
    code: requireTypeCode(resolvedSkill, type),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, code } = await resolve(params);
  return { title: `${t.practiceType.title(code)} ${program.name}` };
}

export default async function PracticeTypePage({ params }: Props) {
  const { program, skill, code } = await resolve(params);
  const skillName = t.skills[skill.slug].name;
  const breadcrumb = [
    { label: program.name, href: `/${program.slug}` },
    { label: t.practice.title, href: `/${program.slug}/luyen-tap` },
    { label: skillName, href: `/${program.slug}/luyen-tap/${skill.slug}` },
    { label: code },
  ];

  if (skill.code === "writing") {
    const prompts = await getWritingPrompts(program.slug, code);
    if (prompts.length === 0) notFound();
    const writingTypes = await getWritingTypes(program.slug);
    const writingSummary = writingTypes.find((type) => type.type_code === code);
    return (
      <PracticePageShell
        wide
        exitHref={`/${program.slug}/luyen-tap/${skill.slug}`}
        breadcrumb={breadcrumb}
        title={t.practiceType.pageTitle(code, writingSummary?.name_vi ?? skillName)}
        description={writingSummary?.group_name_vi}
      >
        <WritingPracticeRunner program={program.slug} prompts={prompts} />
      </PracticePageShell>
    );
  }

  const questions = await getPracticeQuestions(program.slug, code);
  if (questions.length === 0) notFound();
  const types = await getPracticeTypes(program.slug, skill.code);
  const summary = types.find((type) => type.type_code === code);

  return (
    <PracticePageShell
      exitHref={`/${program.slug}/luyen-tap/${skill.slug}`}
      breadcrumb={breadcrumb}
      title={t.practiceType.pageTitle(code, summary?.name_vi ?? skillName)}
      description={summary?.group_name_vi}
    >
      <PracticeRunner
        program={program.slug}
        questions={questions}
        exitHref={`/${program.slug}/luyen-tap/${skill.slug}`}
      />
    </PracticePageShell>
  );
}
