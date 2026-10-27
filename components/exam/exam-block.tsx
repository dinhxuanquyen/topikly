import type { RefObject } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { PublicExamQuestion } from "@/lib/exam/types";
import type { ChoiceLabel } from "@/lib/practice/types";
import { ChoiceList } from "@/components/practice/choice-list";
import { QuestionMaterial } from "@/components/practice/question-material";
import { renderInline } from "@/components/practice/rich-text";
import type { ChoiceBlockRef, ExamSession } from "./exam-state";

/** Id vòng cổ của nhóm radio một câu, duy nhất trên trang. */
export function choiceGroupId(idPrefix: string, questionId: string): string {
  return `${idPrefix}-g-${questionId}`;
}

/** Id tiêu đề của một câu (đích focus khi nhảy từ bảng số câu). */
export function questionHeadingId(idPrefix: string, questionId: string): string {
  return `${idPrefix}-q-${questionId}`;
}

interface ExamBlockViewProps {
  blockRef: ChoiceBlockRef;
  session: ExamSession;
  /** true = đã nộp / đang nộp / hết giờ: không đổi đáp án được. */
  locked: boolean;
  idPrefix: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Tiền tố "Phần Đọc" khi đề có nhiều phần. */
  sectionLabel?: string;
  onSelect: (questionId: string, label: ChoiceLabel) => void;
  onClear: (questionId: string) => void;
  onToggleMark: (questionId: string) => void;
  onQuestionFocus: (questionId: string) => void;
}

/**
 * Một khối câu của đề lắp ráp.
 *  - Lệnh nhóm (`instruction_ko`) in MỘT lần ở đầu khối.
 *  - Khối dùng chung ngữ liệu: in ngữ liệu một lần, rồi `stem` riêng từng câu.
 *  - Câu đơn: ẨN `stem` (content-spec mục 5) và in ngữ liệu riêng của câu.
 * Không chứa đáp án hay lời giải: dữ liệu `PublicQuestion` vốn không có.
 */
export function ExamBlockView({
  blockRef,
  session,
  locked,
  idPrefix,
  headingRef,
  sectionLabel,
  onSelect,
  onClear,
  onToggleMark,
  onQuestionFocus,
}: ExamBlockViewProps) {
  const { block } = blockRef;
  const sharedSource = block.shared_material ? block.questions[0]?.question : undefined;
  const headingText = t.examRun.blockHeading(block.first_number, block.last_number);

  return (
    <section aria-labelledby={`${idPrefix}-block`} className="space-y-5">
      <div className="space-y-2">
        <h2
          id={`${idPrefix}-block`}
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-[calc(var(--header-height)+5rem)] rounded-md text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {sectionLabel ? `${sectionLabel} · ${headingText}` : headingText}
        </h2>
        <p lang="ko" className="text-lg leading-relaxed font-semibold md:text-xl">
          {block.instruction_ko}
        </p>
      </div>

      {sharedSource ? <QuestionMaterial question={sharedSource} audioMode="exam" /> : null}

      {block.questions.map((item) => (
        <ExamQuestionView
          key={item.question.id}
          item={item}
          shared={block.shared_material}
          soleInBlock={block.questions.length === 1}
          selected={(session.answers[item.question.id] as ChoiceLabel | undefined) ?? null}
          marked={Boolean(session.marked[item.question.id])}
          locked={locked}
          idPrefix={idPrefix}
          onSelect={onSelect}
          onClear={onClear}
          onToggleMark={onToggleMark}
          onFocus={onQuestionFocus}
        />
      ))}
    </section>
  );
}

interface ExamQuestionViewProps {
  item: PublicExamQuestion;
  shared: boolean;
  /** Khối chỉ có một câu: tiêu đề khối đã là "Câu n" nên tiêu đề câu chỉ còn cho trình đọc màn hình. */
  soleInBlock: boolean;
  selected: ChoiceLabel | null;
  marked: boolean;
  locked: boolean;
  idPrefix: string;
  onSelect: (questionId: string, label: ChoiceLabel) => void;
  onClear: (questionId: string) => void;
  onToggleMark: (questionId: string) => void;
  onFocus: (questionId: string) => void;
}

function ExamQuestionView({
  item,
  shared,
  soleInBlock,
  selected,
  marked,
  locked,
  idPrefix,
  onSelect,
  onClear,
  onToggleMark,
  onFocus,
}: ExamQuestionViewProps) {
  const { number, question } = item;
  const headingId = questionHeadingId(idPrefix, question.id);

  return (
    <article
      aria-labelledby={headingId}
      data-exam-question={question.id}
      onFocusCapture={() => onFocus(question.id)}
      className="space-y-3 rounded-2xl border border-border p-3 md:p-4"
    >
      <div
        className={cn("flex items-center gap-2", soleInBlock ? "justify-end" : "justify-between")}
      >
        <h3
          id={headingId}
          tabIndex={-1}
          className={cn(
            "scroll-mt-[calc(var(--header-height)+5rem)] rounded-md text-base font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            soleInBlock && "sr-only",
          )}
        >
          {t.examRun.questionHeading(number)}
        </h3>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 px-3",
            marked &&
              "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
          )}
          aria-pressed={marked}
          title={t.examRun.markHelp}
          disabled={locked}
          onClick={() => onToggleMark(question.id)}
        >
          <Flag aria-hidden className={marked ? "fill-amber-400" : undefined} />
          {marked ? t.examRun.unmark : t.examRun.mark}
        </Button>
      </div>

      {shared ? (
        <p lang="ko" className="text-base leading-relaxed font-semibold md:text-lg">
          {renderInline(question.stem)}
        </p>
      ) : (
        <QuestionMaterial question={question} audioMode="exam" />
      )}

      <ChoiceList
        choices={question.choices}
        group={choiceGroupId(idPrefix, question.id)}
        groupLabel={t.examRun.choicesLabel(number)}
        selected={selected}
        locked={locked}
        result={null}
        restoredCorrect={null}
        onSelect={(label) => onSelect(question.id, label)}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3 text-muted-foreground"
          disabled={locked || selected === null}
          onClick={() => onClear(question.id)}
        >
          {t.examRun.clear}
        </Button>
      </div>
    </article>
  );
}
