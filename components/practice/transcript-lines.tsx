import { cn } from "@/lib/utils";
import type { TranscriptLine } from "./transcript";

interface TranscriptLinesProps {
  lines: readonly TranscriptLine[];
  /**
   * Bản dịch tiếng Việt, mỗi phần tử ứng với một dòng của `lines`. Chỉ ghép theo dòng khi số dòng
   * khớp; lệch thì in cả khối dịch bên dưới để không gán nhầm lời cho người nói.
   */
  translation?: readonly string[];
}

/** Danh sách lượt thoại có nhãn người nói (남자/여자…), tuỳ chọn kèm bản dịch dưới mỗi lượt. */
export function TranscriptLines({ lines, translation = [] }: TranscriptLinesProps) {
  const paired = translation.length > 0 && translation.length === lines.length;
  return (
    <>
      <ul className="space-y-2.5">
        {lines.map((line, index) => (
          <li key={index} className="space-y-0.5">
            <p lang="ko" className="flex items-baseline gap-2 text-base leading-relaxed">
              {line.speaker ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    line.gender === "female"
                      ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
                      : "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
                  )}
                >
                  {line.speaker}
                </span>
              ) : null}
              <span className="min-w-0">{line.text}</span>
            </p>
            {paired ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{translation[index]}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {!paired && translation.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
          {translation.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
