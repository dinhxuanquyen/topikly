import { useId } from "react";
import { t } from "@/components/i18n";
import type { ChartData, ChartSeries } from "@/lib/practice/types";

/**
 * Vẽ ChartData bằng SVG tự viết (bar nhóm, line, pie) hoặc bảng thật (table).
 * Luôn kèm một bảng số liệu: với bar/line/pie bảng chỉ dành cho trình đọc màn hình (sr-only),
 * với `table` bảng là chính biểu đồ. Không phụ thuộc thư viện biểu đồ.
 */

/** Màu dãy số liệu (biến CSS định nghĩa ở app/globals.css, có bản tối). */
const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
];

function color(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]!;
}

export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

/** Làm tròn lên một giá trị trục "đẹp" (1, 2, 5 × 10^k). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const frac = value / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * base;
}

/** Chia nhãn dài theo khoảng trắng thành tối đa `maxLines` dòng, mỗi dòng ≤ `maxChars` ký tự. */
export function wrapLabel(label: string, maxChars: number, maxLines = 3): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    return [...head, lines.slice(maxLines - 1).join(" ")];
  }
  return lines.length > 0 ? lines : [label];
}

/** Các nhãn trục hoành theo thứ tự xuất hiện đầu tiên qua mọi series. */
export function categoriesOf(series: readonly ChartSeries[]): string[] {
  const seen: string[] = [];
  for (const s of series) for (const p of s.points) if (!seen.includes(p.x)) seen.push(p.x);
  return seen;
}

function valueAt(series: ChartSeries, x: string): number | undefined {
  return series.points.find((p) => p.x === x)?.y;
}

function chartKindLabel(type: ChartData["chart_type"]): string {
  const c = t.material.chart;
  if (type === "bar") return c.barLabel;
  if (type === "line") return c.lineLabel;
  if (type === "pie") return c.pieLabel;
  return c.tableLabel;
}

// ------------------------------------------------------------------ bảng số liệu

function DataTable({ chart, srOnly }: { chart: ChartData; srOnly: boolean }) {
  const cats = categoriesOf(chart.series);
  const isPie = chart.chart_type === "pie";
  return (
    <div className={srOnly ? "sr-only" : "overflow-x-auto rounded-lg border border-border"}>
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption className={srOnly ? undefined : "sr-only"}>
          {[chart.title, chart.caption, `${t.material.chart.unit}: ${chart.unit}`]
            .filter(Boolean)
            .join(" · ")}
        </caption>
        <thead>
          <tr className="bg-muted/60">
            <th scope="col" className="border-b border-border px-3 py-2 font-semibold">
              <span className="sr-only">
                {isPie ? t.material.chart.series : t.material.chart.point}
              </span>
            </th>
            {cats.map((x) => (
              <th
                key={x}
                scope="col"
                lang="ko"
                className="border-b border-border px-3 py-2 font-semibold"
              >
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.series.map((s) => (
            <tr key={s.name}>
              <th
                scope="row"
                lang="ko"
                className="border-t border-border px-3 py-2 font-semibold whitespace-nowrap"
              >
                {s.name}
              </th>
              {cats.map((x) => {
                const v = valueAt(s, x);
                return (
                  <td key={x} className="border-t border-border px-3 py-2 tabular-nums">
                    {v === undefined ? "–" : `${formatValue(v)}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ biểu đồ cột nhóm / đường

const PAD = { top: 26, right: 14, bottom: 14, left: 38 };
const PLOT_H = 170;
const LINE_H = 14;

function Axis({
  width,
  yMax,
  ticks,
  unit,
}: {
  width: number;
  yMax: number;
  ticks: number;
  unit: string;
}) {
  const plotW = width - PAD.left - PAD.right;
  return (
    <g aria-hidden>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (yMax / ticks) * i;
        const y = PAD.top + PLOT_H - (v / yMax) * PLOT_H;
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={i === 0 ? 0.6 : 0.15}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="currentColor"
              fillOpacity={0.75}
            >
              {formatValue(v)}
            </text>
          </g>
        );
      })}
      <text
        x={width - PAD.right}
        y={12}
        textAnchor="end"
        fontSize={11}
        fill="currentColor"
        fillOpacity={0.8}
        lang="ko"
      >
        {t.material.chart.unit}: {unit}
      </text>
    </g>
  );
}

function CategoryLabels({
  cats,
  centers,
  maxChars,
}: {
  cats: string[];
  centers: number[];
  maxChars: number;
}) {
  return (
    <g aria-hidden lang="ko">
      {cats.map((x, i) => {
        const lines = wrapLabel(x, maxChars);
        return (
          <text
            key={x}
            x={centers[i]}
            y={PAD.top + PLOT_H + 16}
            textAnchor="middle"
            fontSize={12}
            fill="currentColor"
          >
            {lines.map((line, j) => (
              <tspan key={j} x={centers[i]} dy={j === 0 ? 0 : LINE_H}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </g>
  );
}

function maxLinesOf(cats: string[], maxChars: number): number {
  return Math.max(1, ...cats.map((x) => wrapLabel(x, maxChars).length));
}

function BarChart({ chart, label }: { chart: ChartData; label: string }) {
  const cats = categoriesOf(chart.series);
  const n = chart.series.length;
  const barW = 22;
  const groupW = n * barW + 26;
  const width = Math.max(296, PAD.left + PAD.right + cats.length * groupW);
  const plotW = width - PAD.left - PAD.right;
  const slot = plotW / cats.length;
  const maxChars = Math.max(4, Math.floor(slot / 8));
  const height = PAD.top + PLOT_H + 16 + maxLinesOf(cats, maxChars) * LINE_H + PAD.bottom;
  const maxY = Math.max(0, ...chart.series.flatMap((s) => s.points.map((p) => p.y)));
  const yMax = niceMax(maxY);
  const centers = cats.map((_, i) => PAD.left + slot * (i + 0.5));
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      style={{ minWidth: width }}
    >
      <Axis width={width} yMax={yMax} ticks={4} unit={chart.unit} />
      <g aria-hidden>
        {cats.map((x, ci) =>
          chart.series.map((s, si) => {
            const v = valueAt(s, x);
            if (v === undefined) return null;
            const h = (v / yMax) * PLOT_H;
            const bx = centers[ci]! - (n * barW) / 2 + si * barW + 1;
            return (
              <g key={`${x}-${s.name}`}>
                <rect
                  x={bx}
                  y={PAD.top + PLOT_H - h}
                  width={barW - 2}
                  height={h}
                  rx={2}
                  fill={color(si)}
                />
                <text
                  x={bx + (barW - 2) / 2}
                  y={PAD.top + PLOT_H - h - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="currentColor"
                >
                  {formatValue(v)}
                </text>
              </g>
            );
          }),
        )}
      </g>
      <CategoryLabels cats={cats} centers={centers} maxChars={maxChars} />
    </svg>
  );
}

function LineChart({ chart, label }: { chart: ChartData; label: string }) {
  const cats = categoriesOf(chart.series);
  const width = Math.max(296, PAD.left + PAD.right + cats.length * 64);
  const plotW = width - PAD.left - PAD.right;
  const slot = plotW / cats.length;
  const maxChars = Math.max(4, Math.floor(slot / 8));
  const height = PAD.top + PLOT_H + 16 + maxLinesOf(cats, maxChars) * LINE_H + PAD.bottom;
  const maxY = Math.max(0, ...chart.series.flatMap((s) => s.points.map((p) => p.y)));
  const yMax = niceMax(maxY);
  const centers = cats.map((_, i) => PAD.left + slot * (i + 0.5));
  const yOf = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      style={{ minWidth: width }}
    >
      <Axis width={width} yMax={yMax} ticks={4} unit={chart.unit} />
      <g aria-hidden>
        {chart.series.map((s, si) => {
          const pts = cats
            .map((x, ci) => ({ x: centers[ci]!, v: valueAt(s, x) }))
            .filter((p): p is { x: number; v: number } => p.v !== undefined);
          return (
            <g key={s.name}>
              <polyline
                points={pts.map((p) => `${p.x},${yOf(p.v)}`).join(" ")}
                fill="none"
                stroke={color(si)}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p) => (
                <g key={p.x}>
                  <circle cx={p.x} cy={yOf(p.v)} r={4} fill={color(si)} />
                  <text
                    x={p.x}
                    y={yOf(p.v) - 9}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="currentColor"
                  >
                    {formatValue(p.v)}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </g>
      <CategoryLabels cats={cats} centers={centers} maxChars={maxChars} />
    </svg>
  );
}

// ------------------------------------------------------------------ biểu đồ tròn

const PIE_R = 70;

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
}

function PieSlices({ series, label }: { series: ChartSeries; label: string }) {
  const total = series.points.reduce((sum, p) => sum + p.y, 0);
  const size = PIE_R * 2 + 8;
  const c = size / 2;
  // Góc đầu / cuối của từng lát, cộng dồn theo thứ tự.
  const arcs = series.points.map((_, i) => {
    const before = series.points.slice(0, i).reduce((sum, p) => sum + p.y, 0);
    const share = total > 0 ? series.points[i]!.y / total : 0;
    const start = (total > 0 ? before / total : 0) * Math.PI * 2;
    return { share, start, end: start + share * Math.PI * 2 };
  });
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} className="size-40 shrink-0">
      <g aria-hidden>
        {series.points.map((p, i) => {
          const { share, start, end } = arcs[i]!;
          const body =
            share >= 0.9999 ? (
              <circle cx={c} cy={c} r={PIE_R} fill={color(i)} />
            ) : (
              <path
                d={`M ${c} ${c} L ${polar(c, c, PIE_R, start).join(" ")} A ${PIE_R} ${PIE_R} 0 ${
                  end - start > Math.PI ? 1 : 0
                } 1 ${polar(c, c, PIE_R, end).join(" ")} Z`}
                fill={color(i)}
                stroke="var(--background)"
                strokeWidth={2}
              />
            );
          return <g key={p.x}>{body}</g>;
        })}
      </g>
    </svg>
  );
}

function PieChart({ chart }: { chart: ChartData }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-5">
      {chart.series.map((s) => (
        <div key={s.name} className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
          <PieSlices series={s} label={`${t.material.chart.pieLabel}: ${s.name}`} />
          <div className="min-w-40 flex-1">
            <p lang="ko" className="mb-1.5 text-sm font-semibold">
              {s.name}
            </p>
            <ul className="space-y-1 text-sm" aria-hidden>
              {s.points.map((p, i) => (
                <li key={p.x} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 size-3 shrink-0 rounded-sm"
                    style={{ background: color(i) }}
                  />
                  <span lang="ko" className="min-w-0 flex-1">
                    {p.x}
                  </span>
                  <span className="tabular-nums">
                    {formatValue(p.y)}
                    {chart.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ chú giải (bar / line)

function Legend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-hidden>
      {series.map((s, i) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: color(i) }} />
          <span lang="ko">{s.name}</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ vỏ chung

export function ChartView({ chart }: { chart: ChartData }) {
  const id = useId();
  const kind = chartKindLabel(chart.chart_type);
  const label = `${kind}: ${chart.title}`;
  const isTable = chart.chart_type === "table";
  return (
    <figure className="rounded-xl border border-border bg-card p-3 md:p-4" aria-labelledby={id}>
      <figcaption className="mb-2">
        <span id={id} lang="ko" className="block text-base font-semibold">
          {chart.title}
        </span>
        {chart.caption ? (
          <span lang="ko" className="mt-0.5 block text-sm text-muted-foreground">
            {chart.caption}
          </span>
        ) : null}
        {isTable ? (
          <span lang="ko" className="mt-0.5 block text-xs text-muted-foreground">
            {t.material.chart.unit}: {chart.unit}
          </span>
        ) : null}
      </figcaption>
      {isTable ? (
        <DataTable chart={chart} srOnly={false} />
      ) : (
        <>
          <div
            role="group"
            aria-label={`${label}. ${t.material.chart.scrollHint}`}
            tabIndex={0}
            className="overflow-x-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {chart.chart_type === "bar" ? <BarChart chart={chart} label={label} /> : null}
            {chart.chart_type === "line" ? <LineChart chart={chart} label={label} /> : null}
            {chart.chart_type === "pie" ? <PieChart chart={chart} /> : null}
          </div>
          {chart.chart_type !== "pie" ? <Legend series={chart.series} /> : null}
          <DataTable chart={chart} srOnly />
        </>
      )}
    </figure>
  );
}
