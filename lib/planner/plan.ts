import { z } from "zod";

export const DAILY_MINUTES = [15, 30, 60, 90] as const;
const DAY_MS = 86_400_000;

/** Ngày lịch, không cộng mili giây trên múi giờ địa phương (tránh lệch ngày do DST). */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function addDays(day: string, count: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS;
}

const daySchema = z.string().refine(isDateKey);
export const planSchema = z
  .object({
    version: z.literal(1),
    program: z.string().min(1).max(40),
    startDate: daySchema,
    examDate: daySchema,
    targetLevel: z.number().int().positive(),
    minutesPerDay: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(90)]),
    weakTypeCodes: z.array(z.string().max(64)).max(100),
    completed: z
      .record(z.string().max(200), daySchema)
      .refine((v) => Object.keys(v).length <= 2000),
  })
  .refine((p) => {
    const days = daysBetween(p.startDate, p.examDate);
    return days >= 1 && days <= 366;
  });

export type StudyPlan = z.infer<typeof planSchema>;
export type ResourceKind = "vocab" | "grammar" | "practice" | "mini_test";
export interface PlanResource {
  id: string;
  kind: ResourceKind;
  title: string;
  href: string;
  level: number;
  /** Mã dạng có thật, dùng ghép kết quả Test trình độ với kho câu luyện. */
  typeCodes?: string[];
  /** Thời lượng thật của đề; các nhiệm vụ còn lại là thời gian học gợi ý. */
  durationMinutes?: number;
}
export interface PlannerCatalog {
  levels: { level: number; label: string }[];
  resources: PlanResource[];
}
export interface PlanTask extends PlanResource {
  taskId: string;
  minutes: number;
  priority: boolean;
}
export interface PlanDay {
  date: string;
  tasks: PlanTask[];
}

export function parsePlan(value: unknown, program: string): StudyPlan | null {
  const result = planSchema.safeParse(value);
  return result.success && result.data.program === program ? result.data : null;
}

/** Chỉ lập lịch bằng nội dung đang có. Lặp vòng để ôn lại khi hết ngân hàng. */
export function generateDays(plan: StudyPlan, catalog: PlannerCatalog): PlanDay[] {
  if (!parsePlan(plan, plan.program) || !catalog.levels.some((l) => l.level === plan.targetLevel))
    return [];
  const eligible = catalog.resources
    .filter((r) => r.level <= plan.targetLevel)
    .toSorted((a, b) => a.level - b.level || a.id.localeCompare(b.id));
  const byKind = (kind: ResourceKind) => eligible.filter((r) => r.kind === kind);
  const practice = byKind("practice");
  const weak = practice.filter((r) =>
    r.typeCodes?.some((code) => plan.weakTypeCodes.includes(code)),
  );
  const exams = byKind("mini_test").filter(
    (r) => r.durationMinutes && r.durationMinutes <= plan.minutesPerDay,
  );
  const days: PlanDay[] = [];
  for (let index = 0; index < daysBetween(plan.startDate, plan.examDate); index++) {
    const date = addDays(plan.startDate, index);
    const tasks: PlanTask[] = [];
    let remaining = plan.minutesPerDay;
    const append = (resource: PlanResource | undefined, minutes: number, priority = false) => {
      if (!resource || minutes <= 0) return;
      tasks.push({
        ...resource,
        taskId: `${date}:${resource.kind}:${resource.id}`,
        minutes,
        priority,
      });
      remaining -= minutes;
    };
    if ((index + 1) % 7 === 0 && exams.length > 0) {
      const exam = exams[Math.floor(index / 7) % exams.length]!;
      append(exam, exam.durationMinutes!);
    }
    for (const kind of ["vocab", "grammar"] as const) {
      const resources = byKind(kind);
      if (remaining >= 5) append(resources[index % resources.length], 5);
    }
    const priority = weak.length > 0 && index % 3 !== 2;
    const pool = priority ? weak : practice;
    append(pool[index % pool.length], remaining, priority);
    days.push({ date, tasks });
  }
  return days;
}

/** Chuỗi ngày tự đánh dấu hoàn thành trọn nhiệm vụ; hôm nay chưa xong vẫn giữ chuỗi hôm qua. */
export function planStreak(
  days: PlanDay[],
  completed: StudyPlan["completed"],
  today: string,
): number {
  const doneDates = new Set<string>();
  for (const day of days) {
    if (day.tasks.length && day.tasks.every((task) => completed[task.taskId])) {
      const dates = day.tasks.map((task) => completed[task.taskId]!);
      doneDates.add(dates.toSorted().at(-1)!);
    }
  }
  let cursor = doneDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (doneDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
