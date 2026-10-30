import Link from "next/link";
import type { ExamSummary, PublicExam } from "@/lib/exam/types";

/** Các điểm vào học thật, lấy đề theo kỹ năng để không gắn cứng mã đề vào landing. */
export function StartHere({
  program,
  placement,
  exams,
}: {
  program: string;
  placement: PublicExam | null;
  exams: ExamSummary[];
}) {
  const skills = ["reading", "listening", "writing"] as const;
  const entries = [
    ...(placement
      ? [
          {
            title: "Test trình độ",
            href: `/${program}/lo-trinh/test-trinh-do`,
            detail: `${placement.question_count} câu · ${Math.ceil(placement.duration_sec / 60)} phút · gợi ý cấp bắt đầu`,
          },
        ]
      : []),
    ...skills.flatMap((skill) => {
      const exam = exams.find((item) => item.skills.length === 1 && item.skills[0] === skill);
      return exam
        ? [
            {
              title: exam.title,
              href: `/${program}/de-thi/mini/${exam.id}`,
              detail: `${exam.question_count} câu · ${Math.ceil(exam.duration_sec / 60)} phút${exam.status === "draft" ? " · Đề mẫu" : ""}`,
            },
          ]
        : [];
    }),
  ];
  if (!entries.length) return null;
  return (
    <section
      aria-labelledby="start-here-heading"
      className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20"
    >
      <h2 id="start-here-heading" className="lp-display text-balance">
        Bắt đầu từ đâu
      </h2>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Làm test để chọn cấp xuất phát, hoặc thử một đề theo kỹ năng. Không cần đăng nhập.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="block rounded-2xl bg-sky-50 p-5 transition-colors outline-none hover:bg-sky-100 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="block text-xl font-bold">{entry.title}</span>
              <span className="mt-2 block text-sm text-muted-foreground">{entry.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
