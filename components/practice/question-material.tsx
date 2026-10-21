import { ImageIcon, Info } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/lib/practice/types";
import { ChartView } from "./chart-view";
import { RichLines } from "./rich-text";
import { parseTranscript } from "./transcript";

/** Khung mô tả tranh khi ảnh chưa có (image_url null). */
export function ImagePending({
  description,
  className,
}: {
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm",
        className,
      )}
    >
      <ImageIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-semibold">{t.material.imagePending}</p>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Transcript({
  question,
  showNoAudioNote,
}: {
  question: PublicQuestion;
  showNoAudioNote: boolean;
}) {
  const lines = parseTranscript(question.transcript_ko ?? "", question.speakers);
  return (
    <section
      aria-labelledby={`${question.id}-transcript`}
      className="rounded-xl border border-border bg-card p-4"
    >
      <h3 id={`${question.id}-transcript`} className="text-sm font-semibold text-muted-foreground">
        {t.material.transcript}
      </h3>
      {showNoAudioNote ? (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{t.material.transcriptNoAudio}</span>
        </p>
      ) : null}
      <ul className="mt-3 space-y-2.5">
        {lines.map((line, index) => (
          <li key={index} lang="ko" className="flex items-baseline gap-2 text-base leading-relaxed">
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
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Phần đề bài của một câu: lệnh đề, lời thoại (Nghe), ngữ liệu, câu <보기>, biểu đồ, tranh.
 * Không chứa đáp án hay lời giải.
 */
export function QuestionMaterial({ question }: { question: PublicQuestion }) {
  const hasAudio = typeof question.audio_url === "string" && question.audio_url !== "";
  const showImageFrame =
    question.image_desc && !question.image_url && (question.chart_data?.length ?? 0) === 0;

  return (
    <div className="space-y-4">
      {hasAudio ? (
        <audio controls src={question.audio_url ?? undefined} className="w-full" />
      ) : null}

      {question.skill === "listening" && question.transcript_ko ? (
        hasAudio ? (
          <details className="rounded-xl border border-border bg-card p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">
              {t.material.transcriptToggle}
            </summary>
            <div className="mt-2">
              <Transcript question={question} showNoAudioNote={false} />
            </div>
          </details>
        ) : (
          <Transcript question={question} showNoAudioNote />
        )
      ) : null}

      {question.passage ? (
        <section
          aria-label={t.material.passage}
          lang="ko"
          className="rounded-xl border border-border bg-card p-4 text-base leading-8 md:p-5 md:text-lg md:leading-9"
        >
          <RichLines text={question.passage} lineClassName="[&:not(:first-child)]:mt-1" />
        </section>
      ) : null}

      {question.insert_sentence ? (
        <section
          aria-label={t.material.insertSentenceHint}
          className="rounded-xl border-2 border-primary/30 bg-brand-soft p-4"
        >
          <p lang="ko" className="text-sm font-bold text-brand-soft-foreground">
            {t.material.insertSentence}
          </p>
          <p lang="ko" className="mt-1 text-base leading-8 md:text-lg">
            {question.insert_sentence}
          </p>
        </section>
      ) : null}

      {question.chart_data?.map((chart, index) => (
        <ChartView key={index} chart={chart} />
      ))}
      {question.chart_data && question.data_is_fictional ? (
        <p className="-mt-2 text-xs text-muted-foreground">{t.material.chartFictional}</p>
      ) : null}

      {question.image_url ? (
        // Ảnh đề thi do đội nội dung cung cấp; mô tả tiếng Việt làm alt.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.image_url}
          alt={question.image_desc ?? ""}
          className="max-h-96 w-full rounded-xl border border-border object-contain"
        />
      ) : null}
      {showImageFrame ? <ImagePending description={question.image_desc!} /> : null}
    </div>
  );
}
