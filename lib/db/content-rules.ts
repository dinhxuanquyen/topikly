import type { TagVocabulary } from "./programs";

/**
 * Các luật thuần (không phụ thuộc zod/YAML) của content-spec v0.3, tách khỏi
 * content-validation.ts để test riêng:
 *  - khoảng trắng của trường theo quy ước ngăn đoạn (§5.2, §5.7, §5.9 lỗi 14);
 *  - tag: định dạng và danh sách đóng (§6, §5.9 lỗi 13);
 *  - biểu đồ: pie cộng 100, series cùng tập x (§5.3);
 *  - phân tích chuỗi nhãn đúng: dãy dài, chu kỳ lặp (§4.1).
 */

export interface RuleProblem {
  /** Đường dẫn con (nối với đường dẫn của trường) hoặc rỗng. */
  path: string;
  message: string;
}

// ------------------------------------------------------------------ khoảng trắng

/** Các trường theo quy ước ngăn đoạn (mỗi dòng một đơn vị, không dòng trống). */
export const PARAGRAPH_FIELDS = [
  "passage",
  "transcript_ko",
  "transcript_vi",
  "task",
  "model_answers[].text",
] as const;

const MAX_WHITESPACE_PROBLEMS_PER_FIELD = 5;

/**
 * Kiểm khoảng trắng của một trường nhiều dòng: không dòng trống, không khoảng trắng đầu/cuối
 * dòng, không khoảng trắng kép, không tab. Ngoại lệ: dấu chỗ trống `(   )` có sẵn 3 khoảng
 * trắng bên trong. Một ký tự `\n` ở cuối cùng (do block scalar `|`) được phép.
 */
export function checkParagraphWhitespace(text: string): RuleProblem[] {
  const problems: RuleProblem[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();

  const add = (line: number, message: string) => {
    if (problems.length < MAX_WHITESPACE_PROBLEMS_PER_FIELD) {
      problems.push({ path: "", message: `dòng ${line}: ${message}` });
    }
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    if (raw === "") {
      add(n, "dòng trống (mỗi dòng phải là một đơn vị, không có dòng trống)");
      return;
    }
    if (/\t/.test(raw)) add(n, "có ký tự tab");
    if (/^[  　]/u.test(raw)) add(n, "có khoảng trắng đầu dòng");
    if (/[  　]$/u.test(raw)) add(n, "có khoảng trắng cuối dòng");
    // `(   )` là dấu chỗ trống hợp lệ: che đi trước khi tìm khoảng trắng kép.
    if (/ {2,}/.test(raw.replace(/\(   \)/g, "(_)"))) add(n, "có khoảng trắng kép");
  });
  return problems;
}

// ------------------------------------------------------------------ tag

const TAG_FORMAT = /^[a-z][a-z-]*:\S+$/;

export interface TagProblem extends RuleProblem {
  /** Chỉ số tag lỗi (nếu có). */
  index?: number;
}

/** Lỗi tag theo §6 và §5.9 lỗi 13. Cảnh báo (quá nhiều tag) do nơi gọi xử lý. */
export function checkTags(tags: readonly string[], vocab: TagVocabulary): TagProblem[] {
  const problems: TagProblem[] = [];
  const closed: Record<string, readonly string[]> = {
    topic: vocab.topic,
    genre: vocab.genre,
    setting: vocab.setting,
  };
  const known = new Set([...Object.keys(closed), ...vocab.free_prefixes]);
  const count: Record<string, number> = {};

  tags.forEach((tag, index) => {
    if (!TAG_FORMAT.test(tag) || tag !== tag.toLowerCase()) {
      problems.push({
        index,
        path: `[${index}]`,
        message: `tag "${tag}" sai định dạng (cần tiền_tố:giá_trị, chữ thường, không khoảng trắng)`,
      });
      return;
    }
    const [prefix, ...rest] = tag.split(":");
    const value = rest.join(":");
    if (!known.has(prefix!)) {
      problems.push({
        index,
        path: `[${index}]`,
        message: `tiền tố "${prefix}:" không có trong bảng tag (${[...known].join(", ")})`,
      });
      return;
    }
    count[prefix!] = (count[prefix!] ?? 0) + 1;
    const allowed = closed[prefix!];
    if (allowed && !allowed.includes(value)) {
      problems.push({
        index,
        path: `[${index}]`,
        message: `giá trị "${value}" không có trong danh sách ${prefix}: cho phép`,
      });
    }
  });

  if (!count.topic) problems.push({ path: "", message: "cần ít nhất 1 tag topic:" });
  if ((count.genre ?? 0) !== 1) {
    problems.push({
      path: "",
      message: `cần đúng 1 tag genre:, hiện có ${count.genre ?? 0}`,
    });
  }
  if ((count.setting ?? 0) > 1) {
    problems.push({
      path: "",
      message: `chỉ được tối đa 1 tag setting:, hiện có ${count.setting}`,
    });
  }
  return problems;
}

// ------------------------------------------------------------------ biểu đồ

interface ChartLike {
  chart_type?: unknown;
  unit?: unknown;
  series?: unknown;
}

/** Cảnh báo ngữ nghĩa của một biểu đồ (cấu trúc đã được schema kiểm). */
export function checkChartSemantics(chart: ChartLike): RuleProblem[] {
  const warnings: RuleProblem[] = [];
  const series = Array.isArray(chart.series)
    ? (chart.series as Array<Record<string, unknown>>)
    : [];

  const xs = series.map((s) =>
    Array.isArray(s.points)
      ? (s.points as Array<Record<string, unknown>>).map((p) => String(p.x))
      : [],
  );

  if (chart.chart_type === "pie") {
    if (chart.unit !== "%") {
      warnings.push({ path: "unit", message: 'biểu đồ pie phải có unit: "%"' });
    }
    series.forEach((s, i) => {
      const points = Array.isArray(s.points) ? (s.points as Array<Record<string, unknown>>) : [];
      const total = points.reduce((n, p) => n + (typeof p.y === "number" ? p.y : 0), 0);
      if (Math.abs(total - 100) > 1) {
        warnings.push({
          path: `series[${i}]`,
          message: `biểu đồ pie có tổng y = ${round(total)}, lệch 100 quá ±1`,
        });
      }
    });
  } else if (chart.chart_type === "bar" || chart.chart_type === "line") {
    for (let i = 1; i < xs.length; i++) {
      if (xs[i]!.join("\u0000") !== xs[0]!.join("\u0000")) {
        warnings.push({
          path: `series[${i}]`,
          message: "các series phải có cùng tập x và cùng thứ tự x",
        });
      }
    }
  }
  return warnings;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ------------------------------------------------------------------ nhãn đúng của lô

export interface LabelAnalysis {
  /** Độ dài dãy liền nhau dài nhất cùng một nhãn đúng. */
  maxRun: number;
  /** Chỉ số (0-based) của phần tử cuối trong dãy dài nhất đó. */
  runEnd: number;
  /** Chu kỳ lặp liền nhau (dãy ≥ 4 nhãn lặp lại ngay sau chính nó), nếu có. */
  cycle?: { length: number; start: number };
}

/**
 * Phân tích dãy nhãn đúng theo thứ tự câu (content-spec §4.1): không quá 3 câu liền nhau
 * cùng nhãn; không có chuỗi nhãn dài từ 4 trở lên lặp lại liền nhau (vd. ②④①③ │ ②④①③).
 */
export function analyzeAnswerLabels(labels: readonly number[], minCycle = 4): LabelAnalysis {
  let maxRun = 0;
  let runEnd = -1;
  let run = 0;
  labels.forEach((l, i) => {
    run = i > 0 && labels[i - 1] === l ? run + 1 : 1;
    if (run > maxRun) {
      maxRun = run;
      runEnd = i;
    }
  });

  for (let len = minCycle; len * 2 <= labels.length; len++) {
    for (let start = 0; start + len * 2 <= labels.length; start++) {
      let same = true;
      for (let k = 0; k < len; k++) {
        if (labels[start + k] !== labels[start + len + k]) {
          same = false;
          break;
        }
      }
      if (same) return { maxRun, runEnd, cycle: { length: len, start } };
    }
  }
  return { maxRun, runEnd };
}
