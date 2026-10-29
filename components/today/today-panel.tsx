"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Flame, Star } from "lucide-react";
import { TopiCat } from "@/components/brand/topi-cat";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/components/i18n";
import {
  dailySummary,
  nextTypeIndex,
  ratePercent,
  type DailySummary,
  type TypeStats,
} from "@/components/practice/guest-stats";
import {
  invalidateStatsCache,
  loadAnswers,
  loadStatsByType,
  subscribeGuestChanges,
} from "@/components/practice/guest-store";
import { cn } from "@/lib/utils";

/** Mục tiêu mỗi ngày (số câu). Chưa có cài đặt riêng: mặc định ngắn để dễ bắt đầu. */
export const DAILY_GOAL = 5;

export interface TodayType {
  type_code: string;
  skill_slug: string;
  skill_name: string;
  name_vi: string;
  question_count: number;
}

const T = t.today;

/**
 * Màn "Hôm nay" (Figma: "Di động — Hôm nay"): mục tiêu ngày, chuỗi ngày học, thẻ "Học tiếp" và
 * các dạng tiếp theo. Mọi con số đọc từ lịch sử làm bài của khách trên thiết bị (IndexedDB);
 * trước khi đọc xong (và khi tắt script) thẻ vẫn hiện, với tiến độ 0 và dạng đầu tiên.
 */
export function TodayPanel({ program, types }: { program: string; types: TodayType[] }) {
  const [summary, setSummary] = useState<DailySummary>({ todayCount: 0, streakDays: 0 });
  const [stats, setStats] = useState<Record<string, TypeStats>>({});

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      invalidateStatsCache();
      void Promise.all([loadAnswers(program), loadStatsByType(program)]).then(([answers, map]) => {
        if (cancelled) return;
        setSummary(dailySummary(answers, Date.now()));
        setStats(map);
      });
    };
    refresh();
    const unsubscribe = subscribeGuestChanges(refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("pageshow", refresh);
    };
  }, [program]);

  const next = nextTypeIndex(types, stats);
  const current = types[next];
  const done = Math.min(summary.todayCount, DAILY_GOAL);
  const left = DAILY_GOAL - done;
  const started = Object.keys(stats).length > 0;
  // Đường học: dạng ngay trước (nếu có), dạng đang học và hai dạng sau.
  const pathStart = Math.max(0, next - 1);
  const path = types.slice(pathStart, pathStart + 4);

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-5">
      <section
        aria-label={T.goalLabel}
        className="flex items-center gap-4 rounded-3xl border-b-4 border-sky-200 bg-sky-50 p-4 md:p-5"
      >
        <TopiCat className="size-16 shrink-0 md:size-20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[1.0625rem] leading-snug font-extrabold">
              {left === 0 ? T.goalDone : started ? T.goalLeft(left) : T.goalStart}
            </p>
            {summary.streakDays > 0 ? (
              <span
                title={T.streakLabel(summary.streakDays)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-line bg-background px-2.5 py-1 text-sm font-extrabold"
              >
                <Flame aria-hidden className="size-4 fill-sun-400 text-sun-600" />
                <span className="sr-only">{T.streakLabel(summary.streakDays)}</span>
                <span aria-hidden>{summary.streakDays}</span>
              </span>
            ) : null}
          </div>
          <div
            role="progressbar"
            aria-label={T.goalLabel}
            aria-valuemin={0}
            aria-valuemax={DAILY_GOAL}
            aria-valuenow={done}
            className="mt-2 h-3 overflow-hidden rounded-full bg-line"
          >
            <span
              className="block h-full origin-left rounded-full bg-mint-500 transition-transform duration-700 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${Math.max(done / DAILY_GOAL, 0.04)})` }}
            />
          </div>
          <p className="mt-1.5 text-sm font-semibold text-ink-600">
            {T.goalCount(summary.todayCount, DAILY_GOAL)}
          </p>
        </div>
      </section>

      {current ? (
        <section
          aria-labelledby="today-continue"
          className="flex flex-col gap-3 rounded-3xl border-b-[6px] border-sky-700 bg-sky-600 p-5 text-white md:row-span-2 md:self-start"
        >
          <span className="self-start rounded-full bg-sky-100 px-3 py-1 text-sm font-extrabold text-sky-700">
            {T.continueChip(current.skill_name, Number(current.type_code.slice(1)))}
          </span>
          <h2 id="today-continue" className="text-2xl leading-tight font-extrabold">
            {current.name_vi}
          </h2>
          <p className="text-[0.9375rem] leading-relaxed text-sky-100">
            {T.continueMeta(current.question_count)}
            {stats[current.type_code]?.rate != null
              ? ` · ${ratePercent(stats[current.type_code]!.rate)}% đúng`
              : null}
          </p>
          <Link
            href={`/${program}/luyen-tap/${current.skill_slug}/${current.type_code}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-auto h-12 w-full border-sky-700 text-base",
            )}
          >
            {started ? T.continue : T.start}
          </Link>
        </section>
      ) : null}

      {path.length > 0 ? (
        <section aria-labelledby="today-path" className="md:col-start-1">
          <h2 id="today-path" className="text-xl font-extrabold">
            {T.pathHeading}
          </h2>
          <ol className="mt-3 grid gap-2">
            {path.map((type, i) => {
              const index = pathStart + i;
              const state = index === next ? "current" : index < next ? "done" : "next";
              return (
                <li key={type.type_code} style={{ paddingLeft: `${[0, 3, 6, 3][i] ?? 0}rem` }}>
                  <Link
                    href={`/${program}/luyen-tap/${type.skill_slug}/${type.type_code}`}
                    className="group flex items-center gap-3 rounded-2xl p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        "grid size-14 shrink-0 place-items-center rounded-full border-b-[5px] transition-transform duration-150 group-active:translate-y-0.5",
                        state === "done" && "border-sky-300 bg-sky-200 text-sky-700",
                        state === "current" && "border-sky-700 bg-sky-600 text-white",
                        state === "next" && "border-ink-300 bg-line text-ink-600",
                      )}
                    >
                      {state === "done" ? (
                        <Check aria-hidden className="size-6" strokeWidth={3} />
                      ) : state === "current" ? (
                        <Star aria-hidden className="size-6 fill-white" />
                      ) : (
                        <span aria-hidden className="text-sm font-extrabold">
                          {Number(type.type_code.slice(1))}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-base leading-snug font-bold",
                          state === "next" && "text-ink-600",
                        )}
                      >
                        {type.name_vi}
                      </span>
                      <span className="block text-sm text-ink-600">
                        {type.skill_name} · {T.state[state]}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
