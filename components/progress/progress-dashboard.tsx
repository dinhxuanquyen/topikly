"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useLearningHistory } from "./use-learning-history";
import { subscribeClock } from "./use-clock";
import { progressSummary } from "@/lib/progress/summary";
import { useKnownWords } from "@/components/lexicon/known-store";
import { useReviewCards } from "@/components/lexicon/review-store";
import { useStudyPlan } from "@/components/planner/plan-store";
import { useAutoComplete } from "@/components/planner/use-auto-complete";
import { dateKey, generateDays, type PlannerCatalog } from "@/lib/planner/plan";
import type { PracticeTypeSummary } from "@/lib/practice/types";

export function ProgressDashboard({
  program,
  types,
  catalog,
  wordIds,
}: {
  program: string;
  types: PracticeTypeSummary[];
  catalog: PlannerCatalog;
  wordIds: string[];
}) {
  const history = useLearningHistory(program);
  const { known } = useKnownWords(program);
  const review = useReviewCards(program);
  const { plan } = useStudyPlan(program);
  const now = useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => 0,
  );
  useAutoComplete(program, catalog, plan, now ? dateKey(new Date(now)) : "");
  if (!history.ready || !now || !review.ready)
    return <p role="status">Đang tổng hợp tiến bộ trên thiết bị…</p>;
  const summary = progressSummary(history.answers, program, now);
  const weak = types
    .filter(
      (type) =>
        summary.byType[type.type_code]?.attempted &&
        (summary.byType[type.type_code]?.rate ?? 1) < 1,
    )
    .sort(
      (a, b) => (summary.byType[a.type_code]?.rate ?? 1) - (summary.byType[b.type_code]?.rate ?? 1),
    );
  const due = wordIds.filter((id) => review.cards[id] && review.cards[id]!.dueAt <= now).length;
  const tasks = plan ? generateDays(plan, catalog).flatMap((day) => day.tasks) : [];
  const completed = tasks.filter((task) => plan?.completed[task.taskId]).length;
  const maximum = Math.max(1, ...summary.days.map((day) => day.attempts));
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {history.failed && (
        <p role="alert" className="text-coral-700 md:col-span-2">
          Không đọc được một phần lịch sử. Các số liệu dưới đây có thể chưa đầy đủ; hãy cho phép
          trình duyệt lưu dữ liệu và tải lại trang.
        </p>
      )}
      <nav aria-label="Học tiếp" className="flex flex-wrap gap-3 md:col-span-2">
        <Link
          className={buttonVariants({ className: "min-h-11" })}
          href={`/${program}/luyen-tap/on-tap`}
        >
          Ôn câu sai
        </Link>
        <Link
          className={buttonVariants({ variant: "outline", className: "min-h-11" })}
          href={`/${program}/ly-thuyet/tu-vung/on-tap`}
        >
          Flashcard · {due} thẻ đến hạn
        </Link>
      </nav>
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-surface p-5 md:col-span-2 md:grid-cols-4">
        {[
          ["Câu đã làm", summary.attempted],
          ["Đúng lần gần nhất", summary.rate === null ? "—" : `${Math.round(summary.rate * 100)}%`],
          ["Lượt trả lời", summary.attempts],
          ["Từ đã thuộc", wordIds.filter((id) => known.has(id)).length],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-3xl font-normal tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="week-heading" className="rounded-2xl bg-surface p-5 md:p-6">
        <h2 id="week-heading" className="text-xl font-semibold">
          7 ngày luyện tập
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lượt trả lời Nghe/Đọc, bao gồm làm lại. Tỉ lệ đúng phía trên tính trên từng câu khác nhau.
        </p>
        <ol className="mt-5 space-y-3">
          {summary.days.map((day) => (
            <li
              key={day.date}
              className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 text-sm tabular-nums"
            >
              <span>
                {day.date.slice(8)}/{day.date.slice(5, 7)}
              </span>
              <div className="h-3 rounded-full bg-background" aria-hidden>
                <div
                  className="h-3 rounded-full bg-sky-600"
                  style={{ width: `${(day.attempts / maximum) * 100}%` }}
                />
              </div>
              <span
                className="text-right"
                aria-label={`${day.attempts} lượt, ${day.unique} câu khác nhau`}
              >
                {day.attempts} lượt
              </span>
            </li>
          ))}
        </ol>
        {!summary.attempts && (
          <p className="mt-4">
            Bạn chưa có lịch sử luyện tập. Bắt đầu một bài để theo dõi tiến bộ tại đây.
          </p>
        )}
      </section>
      <section aria-labelledby="weak-heading" className="rounded-2xl bg-surface p-5 md:p-6">
        <h2 id="weak-heading" className="text-xl font-semibold">
          Dạng cần luyện thêm
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Xếp theo tỉ lệ đúng lần gần nhất, từ thấp đến cao; số câu ít chưa đủ để kết luận trình độ.
        </p>
        {weak.length ? (
          <ul className="mt-3 divide-y divide-border">
            {weak.slice(0, 5).map((type) => {
              const stats = summary.byType[type.type_code]!;
              return (
                <li key={type.type_code} className="flex items-center justify-between gap-4 py-3">
                  <Link
                    className="min-h-11 flex-1 py-2 font-semibold underline-offset-4 hover:underline"
                    href={`/${program}/luyen-tap/${type.skill === "reading" ? "doc" : "nghe"}/${type.type_code}`}
                  >
                    {type.type_code} · {type.name_vi}
                  </Link>
                  <span className="shrink-0 text-right tabular-nums">
                    {Math.round((stats.rate ?? 0) * 100)}%
                    <span className="block text-sm text-muted-foreground">
                      {stats.correct}/{stats.attempted} câu
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3">
            {summary.attempted
              ? "Các câu đã làm đều đúng ở lần gần nhất. Hãy thử thêm dạng mới để kiểm tra kiến thức."
              : "Chưa có kết quả để xác định dạng cần luyện."}
          </p>
        )}
      </section>
      <section
        aria-labelledby="plan-progress-heading"
        className="rounded-2xl bg-surface p-5 md:p-6"
      >
        <h2 id="plan-progress-heading" className="text-xl font-semibold">
          Tiến độ lộ trình
        </h2>
        <p className="mt-2">
          {plan
            ? `${completed}/${tasks.length} nhiệm vụ đã hoàn thành.`
            : "Bạn chưa tạo lộ trình học."}
        </p>
        <Link
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          href={`/${program}/lo-trinh`}
        >
          {plan ? "Mở lộ trình" : "Lập kế hoạch học"}
        </Link>
      </section>
      <section aria-labelledby="exam-history-heading" className="rounded-2xl bg-surface p-5 md:p-6">
        <h2 id="exam-history-heading" className="text-xl font-semibold">
          Lịch sử thi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tối đa 10 lần nộp gần nhất của mỗi đề còn lưu trên thiết bị. Hiển thị 10 lần gần nhất bên
          dưới.
        </p>
        {history.exams.length ? (
          <ul className="mt-3 divide-y divide-border">
            {history.exams.slice(0, 10).map((exam, i) => (
              <li
                key={`${exam.examKey}:${exam.submittedAt}:${i}`}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{exam.result.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(exam.submittedAt).toLocaleString("vi-VN")}
                  </p>
                  <Link
                    className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
                    href={`/${program}/de-thi/${exam.kind}/${exam.examId}`}
                  >
                    Mở đề và kết quả gần nhất
                  </Link>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p>
                    {exam.score}/{exam.maxScore}
                  </p>
                  <p className="max-w-40 text-sm text-muted-foreground">
                    {exam.writingPending
                      ? "Viết chưa tự chấm"
                      : exam.selfScored
                        ? "Gồm điểm Viết tự chấm"
                        : exam.isEstimate
                          ? "Điểm ước lượng"
                          : "Điểm bài thi"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">Chưa có bài thi đã nộp trên thiết bị này.</p>
        )}
      </section>
      <p className="text-sm text-muted-foreground md:col-span-2">
        Tiến độ thuộc trình duyệt này, chưa đồng bộ tài khoản. Xóa dữ liệu trình duyệt sẽ xóa lịch
        sử học.
      </p>
    </div>
  );
}
