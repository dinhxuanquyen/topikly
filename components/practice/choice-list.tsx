import { Check, X } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { CheckResponse, ChoiceLabel, PublicChoice } from "@/lib/practice/types";
import { ChartView } from "./chart-view";
import { ImagePending } from "./question-material";
import { renderInline } from "./rich-text";

/** "①" → "1": nhãn hiển thị trong ô số (nhãn gốc vẫn dùng cho trình đọc màn hình và khi chấm). */
export function choiceNumber(label: string): string {
  const index = "①②③④⑤".indexOf(label);
  return index >= 0 ? String(index + 1) : label;
}

export function choiceInputId(group: string, index: number): string {
  return `${group}-choice-${index}`;
}

export type ChoiceStatus = "idle" | "selected" | "correct" | "wrong" | "missed";

/**
 * Trạng thái hiển thị của một phương án.
 *  - Trước khi có kết quả: chỉ "selected" / "idle".
 *  - Có kết quả: đáp án đúng là "correct" (dù bạn chọn hay không: `missed` nếu bạn không chọn nó
 *    và đã chọn khác), phương án bạn chọn sai là "wrong".
 *  - Mở lại trang (chưa có kết quả đầy đủ): biết bạn chọn gì và đúng/sai, chưa biết đáp án đúng.
 */
export function choiceStatus(
  label: ChoiceLabel,
  selected: ChoiceLabel | null,
  result: CheckResponse | null,
  restoredCorrect: boolean | null,
): ChoiceStatus {
  if (result) {
    if (label === result.correctLabel) return selected === label ? "correct" : "missed";
    return selected === label ? "wrong" : "idle";
  }
  if (selected === label) {
    if (restoredCorrect === true) return "correct";
    if (restoredCorrect === false) return "wrong";
    return "selected";
  }
  return "idle";
}

/** Chuỗi ngắn đọc cho trình đọc màn hình thay cho hình / biểu đồ trong phương án. */
function choiceSummary(choice: PublicChoice): string {
  if (choice.text) return choice.text;
  if (choice.image_desc) return choice.image_desc;
  if (choice.chart_data?.length) return choice.chart_data.map((c) => c.title).join(", ");
  return "";
}

const STATUS_CLASS: Record<ChoiceStatus, string> = {
  idle: "border-line bg-card hover:bg-sky-50",
  selected: "border-sky-600 bg-sky-50",
  correct: "border-mint-500 bg-mint-100 text-ink-900 dark:bg-emerald-950/50 dark:text-emerald-50",
  missed: "border-mint-500 bg-mint-100 text-ink-900 dark:bg-emerald-950/50 dark:text-emerald-50",
  wrong:
    "anim-shake border-coral-500 bg-coral-100 text-ink-900 dark:bg-red-950/50 dark:text-red-50",
};

interface ChoiceListProps {
  choices: readonly PublicChoice[];
  /** Tên nhóm radio, duy nhất trên trang. */
  group: string;
  selected: ChoiceLabel | null;
  /** true = đã nộp / đang chấm: không đổi lựa chọn được. */
  locked: boolean;
  result: CheckResponse | null;
  restoredCorrect: boolean | null;
  onSelect: (label: ChoiceLabel) => void;
  /** Nhãn của nhóm radio; mặc định "Chọn đáp án". Trang có nhiều câu cần nhãn riêng từng câu. */
  groupLabel?: string;
}

export function ChoiceList({
  choices,
  group,
  selected,
  locked,
  result,
  restoredCorrect,
  onSelect,
  groupLabel,
}: ChoiceListProps) {
  return (
    <div
      role="radiogroup"
      aria-label={groupLabel ?? t.runner.choicesLabel}
      className="grid gap-2.5"
    >
      {choices.map((choice, index) => {
        const status = choiceStatus(choice.label, selected, result, restoredCorrect);
        const checked = selected === choice.label;
        const checkedChoice = result?.choices.find((c) => c.label === choice.label);
        const hasNote = Boolean(checkedChoice?.note_vi || checkedChoice?.trap_name_vi);
        const inputId = choiceInputId(group, index);
        const noteId = `${inputId}-note`;
        const summary = choiceSummary(choice);
        const badge =
          status === "correct"
            ? selected === choice.label && result
              ? t.result.yourCorrectBadge
              : t.result.correctBadge
            : status === "missed"
              ? t.result.correctBadge
              : status === "wrong"
                ? t.result.yourWrongBadge
                : null;
        return (
          <div key={choice.label}>
            <label
              htmlFor={inputId}
              className={cn(
                "relative flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 border-b-4 p-3 transition-[background-color,border-color,transform] duration-150 md:p-4",
                !locked && "motion-safe:active:translate-y-0.5",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60",
                locked && "cursor-default",
                STATUS_CLASS[status],
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={group}
                value={choice.label}
                checked={checked}
                disabled={locked}
                onChange={() => onSelect(choice.label)}
                aria-label={`${choice.label} ${summary}`.trim()}
                aria-describedby={hasNote ? noteId : undefined}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg border-2 text-lg leading-none font-extrabold",
                  status === "idle" && "border-ink-300 bg-background text-ink-600",
                  status === "selected" && "border-sky-600 bg-sky-600 text-white",
                  (status === "correct" || status === "missed") &&
                    "anim-pop border-mint-500 bg-mint-500 text-white",
                  status === "wrong" && "border-coral-500 bg-coral-500 text-white",
                )}
              >
                {status === "correct" || status === "missed" ? (
                  <Check className="size-5" strokeWidth={3} />
                ) : status === "wrong" ? (
                  <X className="size-5" strokeWidth={3} />
                ) : (
                  choiceNumber(choice.label)
                )}
              </span>
              <span className="min-w-0 flex-1 pt-1">
                {choice.text ? (
                  <span lang="ko" className="block text-base leading-relaxed md:text-lg">
                    {renderInline(choice.text)}
                  </span>
                ) : null}
                {/* Phương án biểu đồ đã vẽ từ chart_data: image_desc chỉ còn làm nhãn trợ năng. */}
                {!choice.text && choice.image_desc && !choice.chart_data?.length ? (
                  <ImagePending
                    description={choice.image_desc}
                    className="border-0 bg-transparent p-0"
                  />
                ) : null}
                {choice.chart_data?.map((chart, i) => (
                  <span key={i} className="mt-1 block">
                    <ChartView chart={chart} />
                  </span>
                ))}
                {badge ? (
                  <span
                    className={cn(
                      "mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-sm font-extrabold",
                      status === "wrong" ? "bg-coral-700 text-white" : "bg-mint-700 text-white",
                    )}
                  >
                    {choice.label} {badge}
                  </span>
                ) : null}
              </span>
            </label>
            {hasNote && checkedChoice ? (
              <div
                id={noteId}
                className="anim-slide-up mx-1 mt-2 rounded-2xl bg-surface px-4 py-3 text-[0.9375rem] leading-relaxed"
              >
                {checkedChoice.trap_name_vi ? (
                  <p className="font-semibold">
                    {t.result.trap}: {checkedChoice.trap_name_vi}
                  </p>
                ) : null}
                {checkedChoice.note_vi ? (
                  <p className="mt-0.5">
                    {renderInline(checkedChoice.note_vi, { tagKorean: true })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
