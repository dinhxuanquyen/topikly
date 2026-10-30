"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { loadLatestResult } from "@/components/exam/exam-store";
import {
  addDays,
  DAILY_MINUTES,
  dateKey,
  daysBetween,
  generateDays,
  isDateKey,
  planStreak,
  type PlannerCatalog,
  type ResourceKind,
  type StudyPlan,
} from "@/lib/planner/plan";
import { readPlan, useStudyPlan, writePlan } from "./plan-store";

const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const kindLabels: Record<ResourceKind, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  practice: "Luyện tập",
  mini_test: "Mini test",
};
function subscribeDate(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  window.addEventListener("focus", listener);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", listener);
  };
}
function displayDate(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

interface Props {
  program: string;
  catalog: PlannerCatalog;
  placementExamId: string | null;
}

function PlanForm({
  program,
  catalog,
  placementExamId,
  today,
  previous,
  onDone,
  onCancel,
}: Props & {
  today: string;
  previous: StudyPlan | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [targetLevel, setTargetLevel] = useState(previous?.targetLevel ?? catalog.levels[0]!.level);
  const [examDate, setExamDate] = useState(previous?.examDate ?? addDays(today, 30));
  const [minutes, setMinutes] = useState<number>(previous?.minutesPerDay ?? 30);
  const [weakCodes, setWeakCodes] = useState(previous?.weakTypeCodes ?? []);
  const [prioritize, setPrioritize] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!placementExamId) return;
    let active = true;
    void loadLatestResult(program, "placement", placementExamId)
      .then((result) => {
        const rows = result?.placement?.weak_subskills;
        if (active && Array.isArray(rows)) {
          setWeakCodes(
            [
              ...new Set(
                rows
                  .flatMap((row) => (Array.isArray(row.type_codes) ? row.type_codes : []))
                  .filter((code): code is string => typeof code === "string"),
              ),
            ].slice(0, 100),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [program, placementExamId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const length = daysBetween(today, examDate);
    if (!isDateKey(examDate) || length < 1 || length > 366) {
      setError("Chọn ngày thi từ ngày mai đến tối đa 366 ngày tới.");
      return;
    }
    const plan: StudyPlan = {
      version: 1,
      program,
      startDate: today,
      examDate,
      targetLevel,
      minutesPerDay: minutes as StudyPlan["minutesPerDay"],
      weakTypeCodes: prioritize ? weakCodes : [],
      completed: {},
    };
    if (!generateDays(plan, catalog).some((day) => day.tasks.length)) {
      setError("Chưa có nội dung phù hợp với cấp mục tiêu này. Hãy chọn cấp khác.");
      return;
    }
    writePlan(program, plan);
    onDone();
  }

  return (
    <section aria-labelledby="plan-setup-heading" className="rounded-2xl bg-surface p-4 md:p-6">
      <h2 id="plan-setup-heading" className="text-xl font-bold">
        {previous ? "Điều chỉnh mục tiêu" : "Tạo lộ trình của bạn"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Chia thời gian cho từ vựng, ngữ pháp, luyện dạng và Mini test cuối tuần.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Cấp mục tiêu
            <select
              value={targetLevel}
              onChange={(event) => setTargetLevel(Number(event.target.value))}
              className={inputClass}
            >
              {catalog.levels.map((level) => (
                <option key={level.level} value={level.level}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Thời gian học mỗi ngày
            <select
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className={inputClass}
            >
              {DAILY_MINUTES.map((value) => (
                <option key={value} value={value}>
                  {value} phút
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Ngày thi dự kiến
          <input
            type="date"
            required
            value={examDate}
            min={addDays(today, 1)}
            max={addDays(today, 366)}
            onChange={(event) => setExamDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <fieldset>
          <legend className="text-sm text-muted-foreground">Hoặc chọn khoảng thời gian ôn</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[30, 60, 90, 180].map((count) => (
              <button
                key={count}
                type="button"
                className={buttonVariants({ variant: "outline", className: "min-h-11 px-4" })}
                aria-pressed={examDate === addDays(today, count)}
                onClick={() => setExamDate(addDays(today, count))}
              >
                {count} ngày
              </button>
            ))}
          </div>
        </fieldset>
        {weakCodes.length ? (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={prioritize}
              onChange={(event) => setPrioritize(event.target.checked)}
              className="size-5 accent-primary"
            />
            Ưu tiên dạng làm sai trong test trình độ gần nhất
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">
            Có thể làm test trình độ bên dưới trước khi tạo kế hoạch để ưu tiên dạng cần ôn.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Nội dung được luân phiên để ôn lại. Thời gian học là gợi ý; kế hoạch không bảo đảm đạt cấp
          mục tiêu.
        </p>
        {previous ? (
          <p className="text-sm text-muted-foreground">
            Tạo lại sẽ thay kế hoạch và các dấu hoàn thành hiện tại. Bài làm và kết quả thi vẫn được
            giữ.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className={buttonVariants({ size: "lg", className: "min-h-12 px-5 text-base" })}
          >
            {previous ? "Tạo lại lộ trình" : "Tạo lộ trình"}
          </button>
          {previous ? (
            <button
              type="button"
              onClick={onCancel}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "min-h-12 px-5",
              })}
            >
              Giữ kế hoạch hiện tại
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export function StudyPlanner({ program, catalog, placementExamId }: Props) {
  const { plan, persisted, ready } = useStudyPlan(program);
  const today = useSyncExternalStore(
    subscribeDate,
    () => dateKey(new Date()),
    () => "",
  );
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  if (!ready || !today)
    return (
      <p role="status" className="py-4 text-muted-foreground">
        Đang tải lộ trình trên thiết bị…
      </p>
    );
  if (!catalog.levels.length || !catalog.resources.length)
    return <p>Chưa có nội dung để tạo lộ trình cho chương trình này.</p>;
  const usablePlan =
    plan && catalog.levels.some((level) => level.level === plan.targetLevel) ? plan : null;
  if (!usablePlan || editing)
    return (
      <PlanForm
        program={program}
        catalog={catalog}
        placementExamId={placementExamId}
        today={today}
        previous={usablePlan}
        onDone={() => {
          setEditing(false);
          setSelected(null);
        }}
        onCancel={() => setEditing(false)}
      />
    );

  const days = generateDays(usablePlan, catalog);
  const current =
    days.find((day) => day.date === selected) ??
    days.find((day) => day.date >= today) ??
    days.at(-1);
  const tasks = days.flatMap((day) => day.tasks);
  const done = tasks.filter((task) => usablePlan.completed[task.taskId]).length;
  const overdue = days.filter(
    (day) => day.date < today && day.tasks.some((task) => !usablePlan.completed[task.taskId]),
  );
  const level = catalog.levels.find((item) => item.level === usablePlan.targetLevel)!;
  const streak = planStreak(days, usablePlan.completed, today);
  const future = current ? current.date > today : false;

  function toggle(taskId: string, checked: boolean) {
    // Đọc bản mới nhất để các thao tác liên tiếp không ghi đè dấu vừa đánh.
    const latest = readPlan(program).plan;
    if (!latest) return;
    const completed = { ...latest.completed };
    if (checked) completed[taskId] = today;
    else delete completed[taskId];
    writePlan(program, { ...latest, completed });
  }

  return (
    <div className="space-y-5">
      {!persisted ? (
        <p role="alert" className="rounded-xl bg-coral-100 p-3 text-sm text-coral-700">
          Trình duyệt không lưu được lộ trình. Tiến độ chỉ còn trong phiên này; hãy cho phép lưu dữ
          liệu trên thiết bị.
        </p>
      ) : null}
      <section aria-labelledby="plan-heading" className="rounded-2xl bg-surface p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="plan-heading" className="text-xl font-bold">
              Lộ trình đến {level.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thi dự kiến {displayDate(usablePlan.examDate)} · {usablePlan.minutesPerDay} phút/ngày
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={buttonVariants({ variant: "outline", className: "min-h-11 px-4" })}
          >
            Đổi mục tiêu
          </button>
        </div>
        <p className="mt-4 text-lg">
          <span className="tabular-nums">
            {done}/{tasks.length}
          </span>{" "}
          nhiệm vụ đã hoàn thành
        </p>
        <progress
          aria-label="Tiến độ lộ trình"
          max={Math.max(1, tasks.length)}
          value={done}
          className="mt-2 h-2 w-full accent-primary"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {days.length} ngày ôn · Chuỗi hoàn thành: {streak} ngày
        </p>
        {today >= usablePlan.examDate ? (
          <p className="mt-3 text-sm">
            Đã đến ngày thi dự kiến. Bạn vẫn có thể ôn và hoàn thành các nhiệm vụ còn lại.
          </p>
        ) : null}
        {overdue.length ? (
          <p className="mt-3 text-sm">
            Còn {overdue.length} ngày học trước chưa hoàn thành.{" "}
            <button
              type="button"
              className="min-h-11 font-semibold underline underline-offset-4"
              onClick={() => setSelected(overdue[0]!.date)}
            >
              Ôn ngày còn thiếu đầu tiên
            </button>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="daily-plan-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="daily-plan-heading" className="text-xl font-bold">
            {current?.date === today ? "Nhiệm vụ hôm nay" : "Nhiệm vụ theo ngày"}
          </h2>
          <label className="text-sm">
            Ngày học
            <select
              value={current?.date ?? ""}
              onChange={(event) => setSelected(event.target.value)}
              className={inputClass}
            >
              {days.map((day, index) => (
                <option key={day.date} value={day.date}>
                  Ngày {index + 1} · {displayDate(day.date)}
                  {day.tasks.length && day.tasks.every((task) => usablePlan.completed[task.taskId])
                    ? " · Xong"
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        {future ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Bạn có thể xem trước bài học. Đánh dấu hoàn thành sẽ mở từ ngày học này.
          </p>
        ) : null}
        <ul className="mt-4 divide-y divide-border">
          {current?.tasks.map((task) => (
            <li key={task.taskId} className="flex items-start gap-3 py-4">
              <label className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-within:ring-3 focus-within:ring-ring/50">
                <input
                  type="checkbox"
                  aria-label={`Hoàn thành: ${task.title}`}
                  checked={Boolean(usablePlan.completed[task.taskId])}
                  disabled={future}
                  onChange={(event) => toggle(task.taskId, event.target.checked)}
                  className="size-5 accent-primary"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">
                  {kindLabels[task.kind]} · {task.minutes} phút
                  {task.priority ? " · Ưu tiên từ test trình độ" : ""}
                </p>
                <Link
                  href={task.href}
                  className="inline-block min-h-11 py-2 text-base font-semibold underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {task.title}
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {current && !current.tasks.length ? (
          <p className="py-4 text-muted-foreground">
            Chưa có nội dung phù hợp. Hãy đổi cấp mục tiêu để tạo lại lộ trình.
          </p>
        ) : null}
        {current?.tasks.length &&
        current.tasks.every((task) => usablePlan.completed[task.taskId]) ? (
          <p role="status" className="rounded-xl bg-mint-100 p-3 text-mint-700">
            Bạn đã hoàn thành nhiệm vụ của ngày học này.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">
          Tự đánh dấu sau khi học xong. Mini test chỉ được xếp mỗi ngày thứ 7 nếu đủ thời gian làm
          trọn đề. Bài học lặp lại để ôn tập; phần Nghe thiếu audio sẽ ghi rõ là đọc lời thoại.
        </p>
      </section>
      <p className="text-sm text-muted-foreground">
        Lộ trình lưu trên trình duyệt này, chưa đồng bộ tài khoản. Xóa dữ liệu trình duyệt sẽ xóa kế
        hoạch và tiến độ.
      </p>
    </div>
  );
}
