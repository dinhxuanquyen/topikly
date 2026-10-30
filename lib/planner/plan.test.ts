import { describe, expect, it } from "vitest";
import {
  addDays,
  dateKey,
  generateDays,
  isDateKey,
  parsePlan,
  planStreak,
  type PlannerCatalog,
  type StudyPlan,
} from "./plan";

const plan: StudyPlan = {
  version: 1,
  program: "topik-ii",
  startDate: "2026-10-30",
  examDate: "2026-11-13",
  targetLevel: 3,
  minutesPerDay: 60,
  weakTypeCodes: ["R39"],
  completed: {},
};
const catalog: PlannerCatalog = {
  levels: [
    { level: 3, label: "3급" },
    { level: 4, label: "4급" },
  ],
  resources: [
    { id: "v1", kind: "vocab", title: "경제", href: "/v1", level: 3 },
    { id: "g1", kind: "grammar", title: "-느라고", href: "/g1", level: 3 },
    { id: "R10", kind: "practice", title: "Từ vựng", href: "/r10", level: 3, typeCodes: ["R10"] },
    { id: "R39", kind: "practice", title: "Chèn câu", href: "/r39", level: 3, typeCodes: ["R39"] },
    { id: "R40", kind: "practice", title: "Cấp cao", href: "/r40", level: 4, typeCodes: ["R40"] },
    {
      id: "doc-01",
      kind: "mini_test",
      title: "Mini Đọc",
      href: "/doc",
      level: 3,
      durationMinutes: 40,
    },
    {
      id: "viet-01",
      kind: "mini_test",
      title: "Mini Viết",
      href: "/viet",
      level: 3,
      durationMinutes: 50,
    },
  ],
};

describe("Lộ trình theo ngày", () => {
  it("dùng ngày địa phương; cộng ngày qua tháng, năm nhuận và DST không lệch", () => {
    expect(dateKey(new Date(2026, 9, 30, 23, 59))).toBe("2026-10-30");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-2-01")).toBe(false);
  });

  it("lập đến trước ngày thi, tổng phút không vượt ngân sách, không dùng cấp cao hơn", () => {
    for (const minutesPerDay of [15, 30, 60, 90] as const) {
      const days = generateDays({ ...plan, minutesPerDay }, catalog);
      expect(days).toHaveLength(14);
      expect(days[0]!.date).toBe(plan.startDate);
      expect(days.at(-1)!.date).toBe("2026-11-12");
      for (const day of days) {
        expect(day.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(minutesPerDay);
        expect(day.tasks.every((task) => task.level <= 3)).toBe(true);
        expect(new Set(day.tasks.map((task) => task.taskId)).size).toBe(day.tasks.length);
      }
    }
  });

  it("ưu tiên dạng làm sai nhưng vẫn luân phiên các dạng khác", () => {
    const tasks = generateDays(plan, catalog).map((day) =>
      day.tasks.find((task) => task.kind === "practice"),
    );
    expect(tasks[0]).toMatchObject({ id: "R39", priority: true });
    expect(tasks[1]).toMatchObject({ id: "R39", priority: true });
    expect(tasks[2]).toMatchObject({ id: "R10", priority: false });
    expect(
      generateDays({ ...plan, weakTypeCodes: ["KHONG-CO"] }, catalog)[0]!.tasks.at(-1)!.priority,
    ).toBe(false);
  });

  it("xếp Mini vào ngày thứ 7, thời lượng thật, luân phiên Đọc và Viết; không ép đề 40 phút vào 30 phút", () => {
    const days = generateDays(plan, catalog);
    expect(days[5]!.tasks.some((task) => task.kind === "mini_test")).toBe(false);
    expect(days[6]!.tasks[0]).toMatchObject({ id: "doc-01", minutes: 40 });
    expect(days[13]!.tasks[0]).toMatchObject({ id: "viet-01", minutes: 50 });
    expect(
      generateDays({ ...plan, minutesPerDay: 30 }, catalog)
        .flatMap((day) => day.tasks)
        .every((task) => task.kind !== "mini_test"),
    ).toBe(true);
  });

  it("kho rỗng không sinh bài giả; sắp xếp ổn định kể cả nguồn đổi thứ tự", () => {
    expect(
      generateDays(plan, { ...catalog, resources: [] }).every((day) => day.tasks.length === 0),
    ).toBe(true);
    expect(generateDays(plan, { ...catalog, resources: [...catalog.resources].reverse() })).toEqual(
      generateDays(plan, catalog),
    );
  });

  it("chặn dữ liệu hỏng, chương trình khác, ngày quá hạn dài, số phút và cấp không hỗ trợ", () => {
    expect(parsePlan(plan, "eps")).toBeNull();
    for (const patch of [
      { version: 2 },
      { startDate: "2026-02-30" },
      { examDate: plan.startDate },
      { examDate: addDays(plan.startDate, 367) },
      { minutesPerDay: 10 },
      { completed: [] },
    ])
      expect(parsePlan({ ...plan, ...patch }, plan.program)).toBeNull();
    expect(generateDays({ ...plan, targetLevel: 99 }, catalog)).toEqual([]);
    expect(generateDays({ ...plan, examDate: addDays(plan.startDate, 366) }, catalog)).toHaveLength(
      366,
    );
  });

  it("chuỗi tính ngày thật hoàn thành, không tính tương lai hay ngày còn thiếu bài", () => {
    const days = generateDays(plan, catalog);
    const completed: StudyPlan["completed"] = {};
    for (const task of days[0]!.tasks) completed[task.taskId] = "2026-10-31";
    for (const task of days[1]!.tasks) completed[task.taskId] = "2026-11-01";
    expect(planStreak(days, completed, "2026-11-01")).toBe(2);
    expect(planStreak(days, completed, "2026-11-02")).toBe(2);
    expect(planStreak(days, completed, "2026-11-03")).toBe(0);
    delete completed[days[0]!.tasks[0]!.taskId];
    expect(planStreak(days, completed, "2026-11-01")).toBe(1);
  });
});
