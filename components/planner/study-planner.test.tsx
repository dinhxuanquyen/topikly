import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPlanner } from "./study-planner";
import { readPlan, writePlan } from "./plan-store";
import { addDays, dateKey, generateDays, type PlannerCatalog } from "@/lib/planner/plan";
import { loadLatestResult } from "@/components/exam/exam-store";
import { PLACEMENT_RESULT } from "@/components/exam/test-fixtures";

vi.mock("@/components/exam/exam-store", () => ({ loadLatestResult: vi.fn() }));
const catalog: PlannerCatalog = {
  levels: [
    { level: 3, label: "3급" },
    { level: 4, label: "4급" },
  ],
  resources: [
    { id: "v1", kind: "vocab", title: "경제 — kinh tế", href: "/v1", level: 3 },
    { id: "g1", kind: "grammar", title: "-느라고", href: "/g1", level: 3 },
    {
      id: "R10",
      kind: "practice",
      title: "Từ vựng theo ngữ cảnh",
      href: "/r10",
      level: 3,
      typeCodes: ["R10"],
    },
  ],
};
let counter = 0;
let program: string;
beforeEach(() => {
  program = `test-${++counter}`;
  localStorage.clear();
  vi.mocked(loadLatestResult).mockResolvedValue(null);
});
function mount() {
  return render(
    <StudyPlanner program={program} catalog={catalog} placementExamId="placement-01" />,
  );
}
async function create() {
  fireEvent.click(await screen.findByRole("button", { name: "Tạo lộ trình" }));
  await screen.findByRole("heading", { name: "Lộ trình đến 3급" });
}

describe("Lộ trình của khách", () => {
  it("tạo, đánh dấu, mở lại còn tiến độ, nhận thay đổi từ tab khác", async () => {
    const first = mount();
    await create();
    const checkbox = screen.getAllByRole("checkbox")[0]!;
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(Object.keys(readPlan(program).plan!.completed)).toHaveLength(1);
    first.unmount();
    mount();
    expect(await screen.findByRole("heading", { name: "Lộ trình đến 3급" })).toBeVisible();
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    const saved = readPlan(program).plan!;
    localStorage.setItem(
      `topikly:study-plan:v1:${program}`,
      JSON.stringify({ ...saved, completed: {} }),
    );
    fireEvent(window, new StorageEvent("storage", { key: `topikly:study-plan:v1:${program}` }));
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
  });

  it("cho xem ngày tương lai nhưng chỉ đánh dấu từ ngày học; hủy đổi mục tiêu giữ tiến độ", async () => {
    mount();
    await create();
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.change(screen.getByLabelText("Ngày học"), {
      target: { value: addDays(dateKey(new Date()), 1) },
    });
    expect(
      screen.getAllByRole("checkbox").every((input) => (input as HTMLInputElement).disabled),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Đổi mục tiêu" }));
    fireEvent.change(screen.getByLabelText("Cấp mục tiêu"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Giữ kế hoạch hiện tại" }));
    expect(readPlan(program).plan!.targetLevel).toBe(3);
    expect(Object.keys(readPlan(program).plan!.completed)).toHaveLength(1);
  });

  it("lưu trữ bị chặn vẫn học được, có cảnh báo và không mất dấu trong phiên", async () => {
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    mount();
    await create();
    expect(screen.getByRole("alert")).toHaveTextContent("Trình duyệt không lưu được lộ trình");
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    set.mockRestore();
  });

  it("ngày thi không hợp lệ bị chặn ngay cả khi bỏ qua validation HTML", async () => {
    mount();
    const heading = await screen.findByRole("heading", { name: "Tạo lộ trình của bạn" });
    fireEvent.change(screen.getByLabelText("Ngày thi dự kiến"), {
      target: { value: dateKey(new Date()) },
    });
    fireEvent.submit(heading.closest("section")!.querySelector("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("Chọn ngày thi từ ngày mai");
    expect(readPlan(program).plan).toBeNull();
  });

  it("dạng làm sai từ placement được lưu vào kế hoạch; hoàn thành ngày hiện thông báo thật", async () => {
    vi.mocked(loadLatestResult).mockResolvedValue({
      ...PLACEMENT_RESULT,
      placement: {
        ...PLACEMENT_RESULT.placement!,
        weak_subskills: [
          { code: "vocab", name_vi: "Từ vựng", correct: 0, total: 1, type_codes: ["R10"] },
        ],
      },
    });
    mount();
    expect(
      await screen.findByLabelText("Ưu tiên dạng làm sai trong test trình độ gần nhất"),
    ).toBeChecked();
    await create();
    expect(readPlan(program).plan!.weakTypeCodes).toEqual(["R10"]);
    const daily = screen.getByRole("region", { name: "Nhiệm vụ hôm nay" });
    for (const input of within(daily).getAllByRole("checkbox")) fireEvent.click(input);
    expect(within(daily).getByRole("status")).toHaveTextContent("Bạn đã hoàn thành nhiệm vụ");
    const plan = readPlan(program).plan!;
    expect(Object.keys(plan.completed)).toHaveLength(generateDays(plan, catalog)[0]!.tasks.length);
  });

  it("không tạo tiến độ từ dữ liệu hỏng trên máy", async () => {
    localStorage.setItem(`topikly:study-plan:v1:${program}`, "{hỏng");
    mount();
    expect(await screen.findByRole("button", { name: "Tạo lộ trình" })).toBeVisible();
    expect(writePlan(program, { version: 2 } as never)).toBe(false);
  });
});
