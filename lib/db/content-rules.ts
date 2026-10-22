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

// ------------------------------------------------------------------ nhãn đúng của ĐỀ LẮP RÁP

/** Từ bao nhiêu câu trở lên mới kiểm phân bố ~25% mỗi nhãn (ít hơn thì tỉ lệ vô nghĩa). */
export const MIN_QUESTIONS_FOR_LABEL_DISTRIBUTION = 8;

/** Độ lệch cho phép so với 25% mỗi nhãn: 10 điểm phần trăm số câu, tối thiểu 1 câu. */
export const LABEL_SHARE_TOLERANCE = 0.1;

/**
 * Luật nhãn đúng của đề lắp ráp (content-spec §4.1), chạy trên dãy chỉ số đáp án (0–3) theo thứ tự
 * câu TRONG MỘT PHẦN THI: (1) mỗi nhãn khoảng 25%; (2) không quá 3 câu liền cùng nhãn;
 * (3) không có chu kỳ lặp nhãn dài từ 4 trở lên lặp lại liền nhau. Trả về danh sách vi phạm
 * (rỗng = đạt); nơi gọi quyết định lỗi hay cảnh báo theo trạng thái đề.
 */
export function checkExamLabelRules(
  correctIndexes: readonly number[],
  labels: readonly string[] = ["①", "②", "③", "④"],
): RuleProblem[] {
  const problems: RuleProblem[] = [];
  const n = correctIndexes.length;
  if (n === 0) return problems;

  if (n >= MIN_QUESTIONS_FOR_LABEL_DISTRIBUTION) {
    const expected = n / labels.length;
    const tolerance = Math.max(1, Math.round(n * LABEL_SHARE_TOLERANCE));
    labels.forEach((label, i) => {
      const count = correctIndexes.filter((x) => x === i).length;
      if (Math.abs(count - expected) > tolerance) {
        problems.push({
          path: "",
          message: `nhãn đúng ${label} có ${count}/${n} câu (${Math.round((count / n) * 100)}%), lệch quá xa mức ~25% (cho phép ${Math.max(0, Math.ceil(expected - tolerance))}–${Math.floor(expected + tolerance)} câu)`,
        });
      }
    });
  }

  const result = analyzeAnswerLabels(correctIndexes);
  if (result.maxRun > 3) {
    const end = result.runEnd;
    problems.push({
      path: "",
      message: `${result.maxRun} câu liền nhau (câu ${end - result.maxRun + 2}–${end + 1} trong phần) cùng nhãn đúng ${labels[correctIndexes[end]!]} (không quá 3)`,
    });
  }
  if (result.cycle) {
    const { length, start } = result.cycle;
    problems.push({
      path: "",
      message: `chuỗi nhãn đúng dài ${length} (câu ${start + 1}–${start + length}) lặp lại liền nhau ngay sau đó (chu kỳ lặp nhãn); hãy xáo thứ tự câu`,
    });
  }
  return problems;
}
