import { ClipboardList, Eye, Play, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import type { ExamResult, PublicExam } from "@/lib/exam/types";
import { listeningAudioStatus, toMinutes } from "./exam-state";

interface ExamIntroProps {
  exam: PublicExam;
  /** false = đang đọc IndexedDB xem có bài làm dở không: chưa cho bắt đầu để khỏi ghi đè. */
  ready: boolean;
  /** Kết quả lần nộp gần nhất (nếu có) để xem lại. */
  lastResult: ExamResult | null;
  onStart: () => void;
  onViewLastResult: () => void;
}

/** Màn giới thiệu: số câu, thời gian, quy chế, nút Bắt đầu. */
export function ExamIntro({ exam, ready, lastResult, onStart, onViewLastResult }: ExamIntroProps) {
  const minutes = toMinutes(exam.duration_sec);
  const multiSection = exam.sections.length > 1;
  const audio = listeningAudioStatus(exam);
  const hasPlayableAudio = audio.listening > audio.missing;
  const hasWriting = exam.sections.some((section) => section.skill === "writing");
  const writingOnly = exam.sections.every((section) => section.skill === "writing");
  const rules = [
    t.examIntro.rules.timer(minutes),
    writingOnly ? t.examIntro.rules.autoSubmitWriting : t.examIntro.rules.autoSubmit,
    writingOnly ? t.examIntro.rules.noAnswersWriting : t.examIntro.rules.noAnswers,
    ...(writingOnly ? [] : [t.examIntro.rules.blank]),
    ...(hasWriting ? [t.examIntro.rules.blankWriting, t.examIntro.rules.writingCount] : []),
    t.examIntro.rules.guest,
    ...(hasPlayableAudio ? [t.examIntro.rules.audioOnce] : []),
  ];

  return (
    <section aria-labelledby="exam-intro-heading" className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 id="exam-intro-heading" className="flex items-center gap-2 text-lg font-bold">
          <ClipboardList aria-hidden className="size-5 text-primary" />
          {t.examIntro.heading}
        </h2>
        <p className="mt-2 text-2xl font-bold tabular-nums">
          {t.examIntro.summary(exam.question_count, minutes)}
        </p>
        {multiSection ? (
          <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            {exam.sections.map((section) => (
              <li key={section.order}>
                {t.examIntro.sectionLine(
                  t.examCard.skillNames[section.skill],
                  section.question_count,
                  toMinutes(section.duration_sec),
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {audio.missing > 0 ? (
          <div
            role="note"
            aria-labelledby="exam-intro-audio-missing"
            data-testid="audio-missing-notice"
            className="mt-4 flex gap-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <p id="exam-intro-audio-missing" className="font-bold">
                {t.examIntro.audioMissing.heading}
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {audio.missing === audio.listening
                  ? t.examIntro.audioMissing.all(audio.listening)
                  : t.examIntro.audioMissing.some(audio.missing, audio.listening)}
              </p>
            </div>
          </div>
        ) : null}

        <h3 className="mt-5 text-sm font-semibold text-muted-foreground">
          {t.examIntro.rulesHeading}
        </h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        {exam.kind === "mini" ? (
          <p className="mt-3 text-sm text-muted-foreground">{t.examIntro.estimateNote}</p>
        ) : null}
        {hasWriting ? (
          <p
            data-testid="writing-self-score-note"
            className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium"
          >
            {t.examIntro.writingNote}
          </p>
        ) : null}
        {exam.kind === "placement" ? (
          <p className="mt-3 text-sm text-muted-foreground">{t.placement.intro.note}</p>
        ) : null}
        {exam.status === "draft" ? (
          <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-soft-foreground">
            {t.examCard.sampleNote}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="h-12 px-6 text-base" disabled={!ready} onClick={onStart}>
          <Play aria-hidden />
          {t.examIntro.start}
        </Button>
        {lastResult ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 px-5 text-base"
            onClick={onViewLastResult}
          >
            <Eye aria-hidden />
            {t.examIntro.viewLastResult}
          </Button>
        ) : null}
        {!ready ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t.examIntro.loading}
          </p>
        ) : null}
      </div>
    </section>
  );
}
