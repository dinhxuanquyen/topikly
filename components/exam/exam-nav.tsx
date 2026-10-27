import { Flag } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { isAnswered, type FlatQuestion, type ExamSession } from "./exam-state";

interface ExamNavProps {
  questions: readonly FlatQuestion[];
  session: ExamSession;
  /** Câu đang xem (để đánh dấu aria-current). */
  currentId: string | null;
  /** Có nhiều phần thi: tiền tố số câu bằng phần để không nhầm "Câu 1" của hai phần. */
  sectionLabels?: readonly string[];
  onGoto: (question: FlatQuestion) => void;
}

/** Bảng số câu: đã làm / chưa làm / đánh dấu / đang xem. Mỗi ô là một nút cao 44px. */
export function ExamNav({ questions, session, currentId, sectionLabels, onGoto }: ExamNavProps) {
  const groups: { sectionIndex: number; items: FlatQuestion[] }[] = [];
  for (const question of questions) {
    const last = groups.at(-1);
    if (last && last.sectionIndex === question.sectionIndex) last.items.push(question);
    else groups.push({ sectionIndex: question.sectionIndex, items: [question] });
  }

  return (
    <nav aria-label={t.examRun.navLabel} className="space-y-3">
      {groups.map((group) => (
        <div key={group.sectionIndex}>
          {sectionLabels && sectionLabels.length > 1 ? (
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {sectionLabels[group.sectionIndex]}
            </p>
          ) : null}
          <ol className="flex flex-wrap gap-2">
            {group.items.map((question) => {
              const answered = isAnswered(question, session);
              const marked = Boolean(session.marked[question.id]);
              const current = question.id === currentId;
              const statusText = [
                answered ? t.examRun.statusAnswered : t.examRun.statusUnanswered,
                marked ? t.examRun.statusMarked : "",
                current ? t.examRun.statusCurrent : "",
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={question.id}>
                  <button
                    type="button"
                    data-answered={answered}
                    aria-current={current ? "step" : undefined}
                    aria-label={t.examRun.gotoQuestion(question.number, statusText)}
                    onClick={() => onGoto(question)}
                    className={cn(
                      "relative grid size-11 place-items-center rounded-lg border-2 text-sm font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                      answered
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background",
                      current && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                  >
                    {question.number}
                    {marked ? (
                      <Flag
                        aria-hidden
                        className="absolute -top-1.5 -right-1.5 size-4 fill-amber-400 text-amber-700"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border-2 border-primary bg-primary" />
          {t.examRun.legendAnswered}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border-2 border-border bg-background" />
          {t.examRun.legendUnanswered}
        </li>
        <li className="flex items-center gap-1.5">
          <Flag className="size-3.5 fill-amber-400 text-amber-700" />
          {t.examRun.legendMarked}
        </li>
      </ul>
    </nav>
  );
}
