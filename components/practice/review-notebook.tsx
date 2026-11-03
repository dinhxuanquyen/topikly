"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PublicQuestion } from "@/lib/practice/types";
import { reviewQueue, type ReviewItem } from "@/lib/practice/review";
import { loadProgress, setMarked, subscribeGuestChanges } from "./guest-store";
import type { ProgressRecord } from "./guest-stats";
import { PracticeRunner } from "./practice-runner";

export function ReviewNotebook({ program, catalog }: { program: string; catalog: ReviewItem[] }) {
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"wrong" | "marked">("wrong");
  const [skill, setSkill] = useState("");
  const [type, setType] = useState("");
  const [session, setSession] = useState<PublicQuestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void loadProgress(program).then((rows) => {
        if (!active) return;
        setReady(true);
        if (rows === null)
          setError(
            "Không đọc được lịch sử trên thiết bị. Hãy cho phép trình duyệt lưu dữ liệu rồi tải lại trang.",
          );
        else setProgress(rows);
      });
    refresh();
    const unsubscribe = subscribeGuestChanges(refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", refresh);
    };
  }, [program]);
  const queue = reviewQueue(catalog, progress, { mode, skill, type });
  const types = [
    ...new Map(
      catalog.filter((q) => !skill || q.skill === skill).map((q) => [q.type_code, q.title]),
    ).entries(),
  ];
  async function start() {
    if (starting.current || !queue.length) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ program });
      queue.slice(0, 10).forEach((q) => params.append("id", q.id));
      const response = await fetch(`/api/practice/review?${params}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const questions: PublicQuestion[] = await response.json();
      if (!questions.length) throw new Error();
      setSession(questions);
    } catch {
      setError("Chưa tải được câu ôn. Kiểm tra kết nối và thử lại.");
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }
  if (!ready) return <p role="status">Đang đọc sổ câu trên thiết bị…</p>;
  if (session)
    return (
      <div className="space-y-4">
        <Button variant="outline" className="min-h-11" onClick={() => setSession(null)}>
          Về sổ câu
        </Button>
        <PracticeRunner
          program={program}
          questions={session}
          freshAttempt
          exitHref={`/${program}/luyen-tap/on-tap`}
        />
      </div>
    );
  const selectClass =
    "min-h-11 max-w-full rounded-xl border border-input bg-background px-3 text-base";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Loại câu ôn">
        <Button
          className="min-h-11"
          variant={mode === "wrong" ? "default" : "outline"}
          aria-pressed={mode === "wrong"}
          onClick={() => setMode("wrong")}
        >
          Câu sai
        </Button>
        <Button
          className="min-h-11"
          variant={mode === "marked" ? "default" : "outline"}
          aria-pressed={mode === "marked"}
          onClick={() => setMode("marked")}
        >
          Đã đánh dấu
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Kỹ năng"
          className={selectClass}
          value={skill}
          onChange={(e) => {
            setSkill(e.target.value);
            setType("");
          }}
        >
          <option value="">Nghe và Đọc</option>
          <option value="reading">Đọc</option>
          <option value="listening">Nghe</option>
        </select>
        <select
          aria-label="Dạng câu"
          className={selectClass + " min-w-0 flex-1"}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tất cả dạng câu</option>
          {types.map(([code, title]) => (
            <option key={code} value={code}>
              {code} · {title}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-coral-700">
          {error}
        </p>
      )}
      <section className="rounded-2xl bg-surface p-4 md:p-6" aria-label="Danh sách ôn tập">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg">
            <strong className="text-3xl font-normal tabular-nums">{queue.length}</strong> câu{" "}
            {mode === "wrong" ? "cần ôn" : "đã đánh dấu"}
          </p>
          <Button
            className="min-h-11"
            disabled={!queue.length || busy}
            onClick={() => void start()}
          >
            {busy ? "Đang tải…" : `Ôn ${Math.min(10, queue.length)} câu`}
          </Button>
        </div>
        {!queue.length ? (
          <div className="space-y-3">
            <p>
              {skill || type
                ? "Không có câu phù hợp với bộ lọc này."
                : mode === "wrong"
                  ? "Chưa có câu cần ôn. Các câu có lần trả lời gần nhất sai sẽ xuất hiện ở đây."
                  : "Chưa đánh dấu câu nào. Dùng nút đánh dấu khi luyện tập để lưu câu muốn xem lại."}
            </p>
            <Link
              className={buttonVariants({ variant: "outline", className: "min-h-11" })}
              href={`/${program}/luyen-tap`}
            >
              Đến luyện tập
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {q.type_code} · {q.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {q.skill === "reading" ? "Đọc" : "Nghe"} · {q.id}
                  </p>
                </div>
                {q.marked && (
                  <Button
                    variant="ghost"
                    className="min-h-11 shrink-0"
                    aria-label={`Bỏ đánh dấu ${q.id}`}
                    onClick={async () => {
                      const saved = await setMarked(
                        { program, questionId: q.id, type_code: q.type_code, skill: q.skill },
                        false,
                      );
                      if (!saved) setError("Chưa lưu được thay đổi đánh dấu. Hãy thử lại.");
                    }}
                  >
                    Bỏ dấu
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-sm text-muted-foreground">
        Gồm câu luyện trên thiết bị này. Trả lời đúng sẽ đưa câu ra khỏi danh sách câu sai; lịch sử
        và dấu đánh dấu vẫn được giữ.
      </p>
    </div>
  );
}
