import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChartData } from "@/lib/practice/types";
import { categoriesOf, ChartView, niceMax, wrapLabel } from "./chart-view";

const BAR: ChartData = {
  chart_type: "bar",
  title: "퇴근 후 가장 많이 하는 활동",
  caption: "○○연구소, 20대·40대 직장인 각 500명 대상",
  unit: "%",
  series: [
    {
      name: "20대",
      points: [
        { x: "휴식", y: 31 },
        { x: "자기 계발", y: 29 },
      ],
    },
    {
      name: "40대",
      points: [
        { x: "휴식", y: 35 },
        { x: "자기 계발", y: 12 },
      ],
    },
  ],
};

describe("ChartView", () => {
  it("biểu đồ cột: có ảnh SVG nhãn rõ và bảng số liệu có caption, tiêu đề, đơn vị", () => {
    render(<ChartView chart={BAR} />);
    expect(screen.getByRole("img", { name: /Biểu đồ cột: 퇴근 후/ })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: /퇴근 후 가장 많이 하는 활동/ });
    expect(table).toHaveAccessibleName(/○○연구소/);
    expect(table).toHaveAccessibleName(/단위: %/);
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3); // tiêu đề cột + 2 nhóm
    expect(within(rows[1]!).getByRole("rowheader")).toHaveTextContent("20대");
    expect(
      within(rows[1]!)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["31", "29"]);
    expect(
      within(rows[2]!)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["35", "12"]);
  });

  it("biểu đồ đường và tròn đều kèm bảng số liệu", () => {
    const line: ChartData = { ...BAR, chart_type: "line" };
    const pie: ChartData = {
      chart_type: "pie",
      title: "전자책 이용 이유",
      unit: "%",
      series: [
        {
          name: "이용 이유",
          points: [
            { x: "시간·장소의 제약이 없음", y: 46 },
            { x: "휴대가 간편함", y: 32 },
            { x: "글자 크기 조절 가능", y: 22 },
          ],
        },
      ],
    };
    const { unmount } = render(<ChartView chart={line} />);
    expect(screen.getByRole("img", { name: /Biểu đồ đường/ })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    unmount();

    render(<ChartView chart={pie} />);
    expect(screen.getByRole("img", { name: /Biểu đồ tròn/ })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /전자책 이용 이유/ })).toBeInTheDocument();
  });

  it("loại table hiển thị bảng thật, không có SVG", () => {
    const table: ChartData = {
      chart_type: "table",
      title: "연도별 이용자 수",
      unit: "만 명",
      series: [
        { name: "2023", points: [{ x: "서울", y: 10 }] },
        { name: "2024", points: [{ x: "서울", y: 12 }] },
      ],
    };
    render(<ChartView chart={table} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("table", { name: /연도별 이용자 수/ })).toBeInTheDocument();
    expect(screen.getByText("단위: 만 명")).toBeInTheDocument();
  });

  it("thiếu giá trị ở một nhóm thì hiện dấu gạch, không vỡ", () => {
    const sparse: ChartData = {
      ...BAR,
      series: [
        { name: "A", points: [{ x: "x1", y: 1 }] },
        { name: "B", points: [{ x: "x2", y: 2 }] },
      ],
    };
    render(<ChartView chart={sparse} />);
    expect(screen.getAllByRole("cell").map((c) => c.textContent)).toEqual(["1", "–", "–", "2"]);
  });
});

describe("hàm hỗ trợ biểu đồ", () => {
  it("niceMax làm tròn lên mức trục đẹp", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(35)).toBe(50);
    expect(niceMax(100)).toBe(100);
    expect(niceMax(210)).toBe(500);
    expect(niceMax(1.2)).toBe(2);
  });

  it("wrapLabel chia nhãn dài theo khoảng trắng", () => {
    expect(wrapLabel("자기 계발", 8)).toEqual(["자기 계발"]);
    expect(wrapLabel("시간 장소의 제약이 없음", 6)).toEqual(["시간 장소의", "제약이 없음"]);
    expect(wrapLabel("한단어", 2)).toEqual(["한단어"]);
  });

  it("categoriesOf lấy nhãn trục theo thứ tự xuất hiện đầu tiên", () => {
    expect(categoriesOf(BAR.series)).toEqual(["휴식", "자기 계발"]);
  });
});
