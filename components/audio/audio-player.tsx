"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { AlertCircle, Pause, Play, RotateCcw, RotateCw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/components/i18n";
import { formatClock } from "@/components/practice/practice-state";
import { parseTranscript } from "@/components/practice/transcript";
import { TranscriptLines } from "@/components/practice/transcript-lines";
import { cn } from "@/lib/utils";
import type { PublicSpeaker } from "@/lib/practice/types";
import { useExamAudio } from "./exam-audio-context";

export type AudioPlayerMode = "practice" | "exam";

export const PLAYBACK_RATES = [0.75, 1, 1.25] as const;
export const SKIP_SECONDS = 5;

export interface AudioPlayerProps {
  src: string;
  /**
   * Khoá của đoạn audio trong phiên (thường là id câu hoặc id khối). Chế độ thi dùng nó để nhớ
   * "đã phát", nên phải ổn định giữa các lần mount.
   */
  id: string;
  /** Mặc định "practice". */
  mode?: AudioPlayerMode;
  /** Lời thoại tiếng Hàn (chỉ chế độ luyện; chế độ thi không bao giờ hiển thị). */
  transcriptKo?: string;
  speakers?: readonly PublicSpeaker[];
  /** Bản dịch tiếng Việt, mỗi dòng ứng với một dòng của `transcriptKo`. Có thì mới hiện tuỳ chọn dịch. */
  transcriptVi?: string;
  /**
   * Chỉ chế độ thi. Trạng thái "đã phát" sống NGOÀI component để qua được việc unmount khi đổi
   * câu/khối. Có ba nguồn, theo thứ tự ưu tiên:
   *  1. prop `played` (+ `onPlayed`): controlled, bên gọi tự giữ state;
   *  2. `ExamAudioProvider` bọc phía trên (cách trình làm đề dùng, có lưu nháp);
   *  3. state cục bộ: chỉ sống trong một lần mount, đủ cho trang đơn lẻ.
   * `onPlayed` luôn được gọi một lần ngay khi audio thật sự bắt đầu phát (sự kiện `play`), nên nếu
   * lỗi tải hoặc trình duyệt chặn phát thì lượt nghe chưa bị tính.
   */
  played?: boolean;
  onPlayed?: (id: string) => void;
  className?: string;
}

/**
 * Trình phát audio cho câu Nghe, dựng trên `<audio>` gốc ẩn (không dùng `controls`).
 *  - practice: phát/tạm dừng, thanh tua, ±5 giây, tốc độ, phát lại, lời thoại song ngữ.
 *  - exam: một nút Phát bấm được một lần; đang phát không tạm dừng/tua/đổi tốc độ; xong là khoá.
 */
export function AudioPlayer({ mode = "practice", ...props }: AudioPlayerProps) {
  return mode === "exam" ? <ExamPlayer {...props} /> : <PracticePlayer {...props} />;
}

// ------------------------------------------------------------------ dùng chung

const FRAME = "space-y-3 rounded-xl border border-border bg-card p-3 md:p-4";

function finiteSeconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clock(seconds: number): string {
  return formatClock(seconds * 1000);
}

/**
 * `loadedmetadata` / `error` có thể bắn TRƯỚC khi React gắn handler (audio có sẵn trong HTML
 * hoặc tải từ cache), nên khi mount phải đọc lại trạng thái hiện có của phần tử.
 */
function useInitialMediaState(
  audioRef: RefObject<HTMLAudioElement | null>,
  onMetadata: (duration: number) => void,
  onError: () => void,
) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.error) onError();
    else if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onMetadata(finiteSeconds(audio.duration));
    }
    // Chỉ chạy một lần khi mount: các thay đổi sau đó đã có handler sự kiện lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function ErrorNote({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg border-2 border-red-600 bg-red-50 p-2.5 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-50">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// ------------------------------------------------------------------ chế độ luyện

function PracticePlayer({
  src,
  id,
  transcriptKo,
  speakers,
  transcriptVi,
  className,
}: Omit<AudioPlayerProps, "mode" | "played" | "onPlayed">) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uid = useId();
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [failed, setFailed] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const hasTranscript = Boolean(transcriptKo);
  const lines = useMemo(
    () => parseTranscript(transcriptKo ?? "", speakers),
    [transcriptKo, speakers],
  );
  const translation = useMemo(
    () =>
      transcriptVi
        ? transcriptVi
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
    [transcriptVi],
  );
  const transcriptOpen = hasTranscript && (showTranscript || failed);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);
  useInitialMediaState(audioRef, setDuration, () => setFailed(true));

  function syncMeta(audio: HTMLAudioElement) {
    setDuration(finiteSeconds(audio.duration));
    audio.playbackRate = rate;
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (ended) audio.currentTime = 0;
    void Promise.resolve(audio.play()).catch(() => undefined);
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const max = finiteSeconds(audio.duration) || duration;
    const next = Math.min(Math.max(0, seconds), max);
    audio.currentTime = next;
    setCurrent(next);
    if (ended && next < max) setEnded(false);
  }

  function replay() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrent(0);
    setEnded(false);
    void Promise.resolve(audio.play()).catch(() => undefined);
  }

  function retry() {
    setFailed(false);
    audioRef.current?.load();
  }

  const status = failed
    ? t.audio.loadError
    : playing
      ? t.audio.statusPlaying
      : ended
        ? t.audio.statusEnded
        : started
          ? t.audio.statusPaused
          : t.audio.statusIdle;
  const disabled = failed;
  const transcriptId = `${uid}-transcript`;

  return (
    <section aria-label={t.audio.playerLabel} data-audio-id={id} className={cn(FRAME, className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        hidden
        onLoadedMetadata={(e: SyntheticEvent<HTMLAudioElement>) => {
          setFailed(false);
          syncMeta(e.currentTarget);
        }}
        onDurationChange={(e) => setDuration(finiteSeconds(e.currentTarget.duration))}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          setEnded(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
        }}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          className="size-12 shrink-0 rounded-full"
          aria-label={playing ? t.audio.pause : t.audio.play}
          disabled={disabled}
          onClick={toggle}
        >
          {playing ? (
            <Pause aria-hidden className="size-5" />
          ) : (
            <Play aria-hidden className="size-5" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={Math.min(current, duration)}
            disabled={disabled || duration === 0}
            aria-label={t.audio.seekLabel}
            aria-valuetext={t.audio.seekValue(clock(current), clock(duration))}
            onChange={(e) => seekTo(Number(e.currentTarget.value))}
            className="block h-11 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <span
          className="shrink-0 text-sm text-muted-foreground tabular-nums"
          aria-hidden
          data-testid="audio-time"
        >
          {clock(current)} / {clock(duration)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-11 px-3"
          aria-label={t.audio.back5}
          disabled={disabled}
          onClick={() => seekTo((audioRef.current?.currentTime ?? current) - SKIP_SECONDS)}
        >
          <RotateCcw aria-hidden />
          {t.audio.back5Short}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-11 px-3"
          aria-label={t.audio.forward5}
          disabled={disabled}
          onClick={() => seekTo((audioRef.current?.currentTime ?? current) + SKIP_SECONDS)}
        >
          <RotateCw aria-hidden />
          {t.audio.forward5Short}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-3"
          disabled={disabled}
          onClick={replay}
        >
          <RotateCcw aria-hidden />
          {t.audio.replay}
        </Button>
      </div>

      <div
        role="radiogroup"
        aria-label={t.audio.speedLabel}
        className="flex flex-wrap items-center gap-2"
      >
        <span aria-hidden className="text-sm text-muted-foreground">
          {t.audio.speedLabel}
        </span>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {PLAYBACK_RATES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex min-h-11 min-w-14 cursor-pointer items-center justify-center px-3 text-sm font-medium select-none",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-inset",
                rate === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={`${uid}-rate`}
                value={value}
                checked={rate === value}
                disabled={disabled}
                onChange={() => setRate(value)}
                className="sr-only"
              />
              {t.audio.speedOption(value)}
            </label>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Volume2 aria-hidden className="size-4 shrink-0" />
          <span>{status}</span>
        </p>
        {failed ? (
          <ErrorNote>{hasTranscript ? t.audio.loadErrorPractice : t.audio.loadError}</ErrorNote>
        ) : null}
      </div>
      {failed ? (
        <Button type="button" variant="outline" className="h-11 px-4" onClick={retry}>
          <RotateCcw aria-hidden />
          {t.audio.retry}
        </Button>
      ) : null}

      {hasTranscript ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              aria-expanded={transcriptOpen}
              aria-controls={transcriptId}
              disabled={failed}
              onClick={() => setShowTranscript((open) => !open)}
            >
              {transcriptOpen ? t.audio.transcriptHide : t.audio.transcriptShow}
            </Button>
            {transcriptOpen && translation.length > 0 ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showTranslation}
                  onChange={(e) => setShowTranslation(e.currentTarget.checked)}
                  className="size-5 accent-primary"
                />
                {t.audio.showTranslation}
              </label>
            ) : null}
          </div>
          <div id={transcriptId} hidden={!transcriptOpen}>
            {transcriptOpen ? (
              <TranscriptLines lines={lines} translation={showTranslation ? translation : []} />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------ chế độ thi

function ExamPlayer({
  src,
  id,
  played,
  onPlayed,
  className,
}: Omit<AudioPlayerProps, "mode" | "transcriptKo" | "speakers" | "transcriptVi">) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const session = useExamAudio();
  const [localPlayed, setLocalPlayed] = useState(false);
  // Lượt phát này do chính instance này bắt đầu: còn phải giữ <audio> trong DOM cho tới khi xong.
  const [startedHere, setStartedHere] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const reportedRef = useRef(false);
  useInitialMediaState(audioRef, setDuration, () => setFailed(true));

  const isPlayed = played ?? session?.played[id] ?? localPlayed;
  const canPlay = !isPlayed && !playing && !failed;

  function markPlayed() {
    if (reportedRef.current) return;
    reportedRef.current = true;
    setLocalPlayed(true);
    session?.markPlayed(id);
    onPlayed?.(id);
  }

  function start() {
    if (!canPlay) return;
    const audio = audioRef.current;
    if (!audio) return;
    void Promise.resolve(audio.play()).catch(() => undefined);
  }

  function retry() {
    setFailed(false);
    audioRef.current?.load();
  }

  const percent = duration > 0 ? Math.min(100, Math.round((current / duration) * 100)) : 0;
  const label = playing ? t.audio.exam.playing : isPlayed ? t.audio.exam.played : t.audio.exam.play;
  const status = failed
    ? t.audio.loadError
    : playing
      ? t.audio.statusPlaying
      : isPlayed
        ? t.audio.statusEnded
        : t.audio.statusIdle;

  return (
    <section aria-label={t.audio.playerLabel} data-audio-id={id} className={cn(FRAME, className)}>
      {!isPlayed || startedHere ? (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          hidden
          // Chặn menu chuột phải (tải xuống, tốc độ, vòng lặp).
          onContextMenu={(e) => e.preventDefault()}
          onLoadedMetadata={(e) => {
            setFailed(false);
            setDuration(finiteSeconds(e.currentTarget.duration));
          }}
          onDurationChange={(e) => setDuration(finiteSeconds(e.currentTarget.duration))}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => {
            setStartedHere(true);
            setPlaying(true);
            markPlayed();
          }}
          onPause={(e) => {
            const audio = e.currentTarget;
            // Phím media / tai nghe / hệ điều hành có thể tạm dừng: chế độ thi tự phát tiếp.
            // Hết bài thì trình duyệt cũng bắn `pause` trước `ended`, nên bỏ qua khi đã ended.
            if (audio.ended) return;
            void Promise.resolve(audio.play()).catch(() => setPlaying(false));
          }}
          onRateChange={(e) => {
            if (e.currentTarget.playbackRate !== 1) e.currentTarget.playbackRate = 1;
          }}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          onError={() => {
            setPlaying(false);
            setFailed(true);
          }}
        />
      ) : null}

      <p className="text-sm text-muted-foreground">{t.audio.exam.notice}</p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          className="h-12 min-w-32 px-5 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          aria-disabled={!canPlay}
          onClick={start}
        >
          <Play aria-hidden className="size-5" />
          {label}
        </Button>
        {playing ? (
          <span className="text-sm text-muted-foreground tabular-nums" aria-hidden>
            {clock(current)} / {clock(duration)}
          </span>
        ) : null}
      </div>

      {playing ? (
        <div
          role="progressbar"
          aria-label={t.audio.exam.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={t.audio.seekValue(clock(current), clock(duration))}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      ) : null}

      <div aria-live="polite" className="space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Volume2 aria-hidden className="size-4 shrink-0" />
          <span>{status}</span>
        </p>
        {failed ? <ErrorNote>{t.audio.loadErrorExam}</ErrorNote> : null}
      </div>
      {failed ? (
        <Button type="button" variant="outline" className="h-11 px-4" onClick={retry}>
          <RotateCcw aria-hidden />
          {t.audio.retry}
        </Button>
      ) : null}
    </section>
  );
}
