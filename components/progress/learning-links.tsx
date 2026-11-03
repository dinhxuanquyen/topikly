import Link from "next/link";

export function LearningLinks({ program }: { program: string }) {
  return (
    <nav
      aria-label="Ôn tập và tiến bộ"
      className="my-5 flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-2"
    >
      {[
        ["luyen-tap/on-tap", "Sổ câu sai"],
        ["ly-thuyet/tu-vung/on-tap", "Flashcard & lịch ôn"],
        ["tien-do", "Tiến bộ của tôi"],
      ].map(([path, title]) => (
        <Link
          key={path}
          href={`/${program}/${path}`}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {title}
        </Link>
      ))}
    </nav>
  );
}
