/**
 * Nguồn dữ liệu TẠM của trụ Đề thi: đọc content/<program>/exams/<kind>/<id>.yaml, đối chiếu với
 * kho câu hỏi của Luyện tập (lib/practice/source cho Đọc/Nghe, lib/practice/writing-source cho Viết),
 * rồi dựng `PublicExam` (gửi client, không đáp án/bài mẫu) và `FullExam` (chỉ server, để chấm). Khi có Supabase, thay file này bằng truy vấn CSDL nhưng
 * GIỮ NGUYÊN chữ ký hàm.
 *
 * CHỈ DÙNG TRÊN SERVER (đọc fs). Không import file này từ component "use client".
 * Server component không gọi trực tiếp mà gọi các hàm "use cache" ở ./queries.ts.
 *
 * ============================================================================================
 * ĐỊNH DẠNG FILE ĐỀ  (bản đầy đủ: docs/content-spec.md mục 5.1 "Định dạng file đề thi"; sửa thì sửa cả hai)
 * ============================================================================================
 * Đường dẫn:  content/<program>/exams/<kind>/<id>.yaml
 *   - <program>  slug chương trình, ví dụ topik-ii
 *   - <kind>     full | mini | hard | ibt | placement  (thư mục PHẢI khớp trường `kind`)
 *                `placement` = Test trình độ (~12 câu Đọc, không cần đăng nhập); id đang dùng là
 *                `ProgramConfig.placement.exam_id`; KHÔNG nằm trong danh sách đề của trụ Đề thi
 *   - <id>       khoá ổn định trong URL /[program]/de-thi/[kind]/[id]; chữ thường, số, dấu "-"
 *                (ví dụ doc-01); PHẢI khớp tên file. Mỗi file = MỘT đề.
 *
 * Trường:
 *   id         string   bắt buộc  khớp tên file
 *   kind       enum     bắt buộc  full | mini | hard | ibt | placement, khớp thư mục
 *   title      string   bắt buộc  tiêu đề tiếng Việt, ví dụ "Mini test Đọc 01"
 *   status     enum     bắt buộc  draft | published
 *                                 draft: đề mẫu / đang soạn. Hiển thị được, các luật "đủ số câu"
 *                                 và "phân bố nhãn đúng" chỉ CẢNH BÁO.
 *                                 published: các luật đó thành LỖI CHẶN; đề lỗi không được phục vụ.
 *   program    string   tuỳ chọn  nếu có phải khớp thư mục chương trình
 *   sections   list     bắt buộc  các phần thi THEO THỨ TỰ làm bài, mỗi kỹ năng tối đa một phần:
 *     - skill         enum    reading | listening | writing   (Nói chưa hỗ trợ trong đề)
 *       duration_sec  int     tuỳ chọn  ghi đè thời gian phần này (giây). Bỏ trống = lấy
 *                             `exam_blueprints[kind][skill].duration_sec` của chương trình
 *                             (Full: theo `sections` của chương trình).
 *       questions     list    bắt buộc  id câu hỏi (file trong practice/) THEO THỨ TỰ trong đề.
 *                             Số thứ tự câu trong đề là vị trí (1-based, liên tục trong phần thi),
 *                             KHÔNG nhất thiết trùng số trong type_code.
 *                             Phần `writing`: id là đề Viết (w51-0001, w52-0001, w53-0002, w54-0002),
 *                             xếp theo type_code tăng dần, mỗi dạng tối đa một câu.
 *
 * Ví dụ:
 *   id: doc-01
 *   kind: mini
 *   title: "Mini test Đọc 01"
 *   status: draft
 *   sections:
 *     - skill: reading
 *       questions: [r01-0001, r03-0001, r07-0001]   # thời gian lấy từ blueprint
 *
 * Ràng buộc (kiểm bởi `npm run validate:content`, lib/db/exam-validation.ts):
 *   - mọi id câu phải tồn tại, đúng kỹ năng của phần, không trùng trong đề (id Viết tra ở nguồn
 *     Viết: file W5x phải dựng được thành đề Viết);
 *   - câu cùng `group_key` (cặp/bộ dùng chung ngữ liệu) phải có ĐỦ số câu của bộ (đọc từ group_key,
 *     ví dụ r46-47-0001 cần 2 câu), đứng LIỀN NHAU và theo type_code tăng dần;
 *   - số câu mỗi phần = `exam_blueprints` (mini, placement) hoặc `sections` (full) của chương trình
 *     (draft: cảnh báo, published: lỗi). Mini Viết = 4 câu / 50 phút;
 *   - phần Viết: type_code các câu phải TĂNG DẦN NGHIÊM NGẶT (W51 < W52 < W53 < W54, không hai câu
 *     cùng dạng) -> lỗi chặn mọi trạng thái; type_code phải có điểm trong `ProgramConfig.writing_points`
 *     (lỗi chặn). Luật audio và luật nhãn đúng KHÔNG áp dụng cho Viết (không có audio, không có nhãn);
 *   - luật audio: mọi câu Nghe (phần `listening`) phải có `audio_url` khác rỗng, ở MỌI kind (mini,
 *     full, hard, ibt, placement); thiếu thì gộp thành MỘT thông báo liệt kê id thiếu (draft: cảnh
 *     báo, published: lỗi chặn, đề không được phục vụ). Câu Đọc không cần audio;
 *   - riêng `placement`: phủ ≥ 3 bậc độ khó khác nhau trong `difficulty_range`, các bậc LIÊN TỤC từ
 *     `difficulty_range.min` (không lỗ), mỗi bậc có mặt ≥ 3 câu (draft: cảnh báo, published: lỗi),
 *     để ước lượng trình độ theo bậc có nghĩa;
 *   - luật nhãn đúng của đề lắp ráp, tính trên từng phần (draft: cảnh báo, published: lỗi):
 *     mỗi nhãn ~25% (từ 8 câu), không quá 3 câu liền cùng nhãn, không chu kỳ lặp ≥ 4 nhãn lặp
 *     liền nhau. Muốn sửa thì ĐỔI THỨ TỰ CÂU, không đảo nhãn phương án.
 *
 * Chấm: phần Đọc/Nghe chấm tự động (scoreExam). Phần Viết KHÔNG chấm tự động: kết quả trả bài đã nộp
 * + đếm ký tự + bài mẫu (`ExamResult.writing`) để người học tự chấm (lib/exam/writing-self-score.ts).
 *
 * Chấm đề `placement`: như Mini (scoreExam) và thêm `ExamResult.placement` (lib/exam/placement.ts):
 * gom câu theo `difficulty`, bậc vững khi tỉ lệ đúng >= `placement.band_pass_ratio`, trình độ
 * ước lượng = bậc cao nhất mà mọi bậc thấp hơn (có câu) cũng vững.
 *
 * Lệnh nhóm tiếng Hàn (`instruction_ko`) KHÔNG nằm trong file đề: lấy từ cấu hình chương trình
 * theo type_group (content-spec 5.2). Giao diện luôn ẩn `stem` của câu đơn.
 * ============================================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { ValidationIssue } from "@/lib/db/content-validation";
import { validateExamFile, type ExamFile, type ExamQuestionRef } from "@/lib/db/exam-validation";
import {
  findProgram,
  getExamBlueprint,
  type ProgramConfig,
  type TypeGroupConfig,
} from "@/lib/db/programs";
import {
  getFullQuestion,
  listPracticeTypes,
  listPublicQuestions,
  toPublicQuestion,
  type FullQuestion,
  type PracticeSourceOptions,
} from "@/lib/practice/source";
import {
  getWritingPrompt,
  getWritingReveal,
  listWritingPrompts,
  listWritingTypes,
} from "@/lib/practice/writing-source";
import type { WritingPrompt, WritingReveal } from "@/lib/practice/writing-types";
import type {
  ExamKind,
  ExamSkill,
  ExamStatus,
  ExamSummary,
  PublicChoiceSection,
  PublicExam,
  PublicExamBlock,
  PublicExamQuestion,
  PublicExamSection,
  PublicWritingSection,
} from "./types";

// ------------------------------------------------------------------ kiểu nội bộ

export interface FullExamQuestion {
  /** Số câu trong đề (1-based, liên tục trong phần thi). */
  number: number;
  type_group: string;
  question: FullQuestion;
}

/** Một câu Viết của đề, bản đầy đủ: có bài mẫu (`reveal`). Không bao giờ gửi xuống client trước khi nộp. */
export interface FullWritingItem {
  /** Vị trí trong phần Viết (1-based, liên tục). */
  number: number;
  type_group: string;
  /** Điểm tối đa của câu (`ProgramConfig.writing_points`). */
  max_points: number;
  prompt: WritingPrompt;
  reveal: WritingReveal;
}

export interface FullExamSection {
  skill: ExamSkill;
  order: number;
  duration_sec: number;
  /** Số câu của phần (phần Viết: số câu Viết). */
  question_count: number;
  max_score: number;
  /** Câu trắc nghiệm (Đọc/Nghe). Phần Viết luôn là []. */
  questions: FullExamQuestion[];
  /** Chỉ phần Viết (skill = "writing"): các câu Viết theo thứ tự trong đề. */
  writing_items?: FullWritingItem[];
}

/** Bản đầy đủ của đề: CÓ đáp án và lời giải. Không bao giờ gửi xuống client. */
export interface FullExam {
  id: string;
  program: string;
  kind: ExamKind;
  title: string;
  status: ExamStatus;
  sections: FullExamSection[];
}

export interface ExamSourceOptions extends PracticeSourceOptions {
  /**
   * false = ẩn đề `draft`. Mặc định true, trừ khi đặt biến môi trường TOPIKLY_HIDE_DRAFT_EXAMS=1.
   * (Hiện chỉ có đề mẫu `draft`; E2E chạy bản build production nên mặc định vẫn hiện.)
   */
  includeDrafts?: boolean;
}

// ------------------------------------------------------------------ lệnh nhóm

/**
 * Thay số câu thật vào mẫu `instruction_ko`. `{from}` / `{to}` là số câu đầu / cuối của khối trong
 * đề; khi from == to, "n~n" được rút thành "n" (khối chỉ có một câu).
 */
export function renderInstruction(template: string, from: number, to: number): string {
  const filled = template.replaceAll("{from}", String(from)).replaceAll("{to}", String(to));
  return from === to ? filled.replace(`${from}~${to}`, String(from)) : filled;
}

function instructionFor(group: TypeGroupConfig | undefined, from: number, to: number): string {
  // Nhóm chưa có lệnh trong cấu hình (Nghe/Viết): dùng số câu trần, không bịa lệnh.
  return group?.instruction_ko
    ? renderInstruction(group.instruction_ko, from, to)
    : `※ [${from === to ? from : `${from}~${to}`}]`;
}

// ------------------------------------------------------------------ đọc & dựng

interface ExamEntry {
  summary: ExamSummary;
  full: FullExam;
}

interface ExamBank {
  /** Đã sắp theo kind rồi id. */
  entries: ExamEntry[];
}

function collectExamFiles(
  contentRoot: string,
  program: string,
): Array<{ file: string; text: string }> {
  const base = path.join(contentRoot, program, "exams");
  try {
    if (!statSync(base).isDirectory()) return [];
  } catch {
    return [];
  }
  const out: Array<{ file: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.ya?ml$/i.test(entry.name)) {
        out.push({
          file: path.relative(contentRoot, full).split(path.sep).join("/"),
          text: readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(base);
  return out;
}

/** Kho tham chiếu câu hỏi (cho luật đề) dựng từ các câu đã dựng được của Luyện tập. */
function buildRefs(program: string, options: PracticeSourceOptions): Map<string, ExamQuestionRef> {
  const refs = new Map<string, ExamQuestionRef>();
  for (const type of listPracticeTypes(program, undefined, options)) {
    for (const pq of listPublicQuestions(program, type.type_code, options)) {
      const full = getFullQuestion(program, pq.id, options);
      if (!full) continue;
      const correctIndex = full.choices.findIndex((c) => c.correct);
      refs.set(pq.id, {
        id: pq.id,
        type_code: pq.type_code,
        ...(pq.group_key ? { group_key: pq.group_key } : {}),
        ...(correctIndex >= 0 ? { correctIndex } : {}),
        difficulty: full.difficulty,
        ...(full.audio_url !== undefined ? { audio_url: full.audio_url } : {}),
      });
    }
  }
  // Đề Viết có nguồn riêng (writing-source); chỉ cần id/type_code/độ khó, không có nhãn đúng/audio.
  for (const type of listWritingTypes(program, options)) {
    for (const prompt of listWritingPrompts(program, type.type_code, options)) {
      refs.set(prompt.id, {
        id: prompt.id,
        type_code: prompt.type_code,
        difficulty: prompt.difficulty,
      });
    }
  }
  return refs;
}

function loadExamBank(program: string, options: ExamSourceOptions): ExamBank {
  const config = findProgram(program);
  const empty: ExamBank = { entries: [] };
  if (!config) return empty;

  const contentRoot = options.contentRoot ?? path.join(process.cwd(), "content");
  const files = collectExamFiles(contentRoot, program);
  if (files.length === 0) return empty;

  const refs = buildRefs(program, options);
  const entries: ExamEntry[] = [];

  for (const file of files) {
    const parts = file.file.split("/");
    if (parts.length !== 4) {
      console.warn(
        `[exam] Bỏ qua ${file.file}: đường dẫn phải là ${program}/exams/<kind>/<id>.yaml`,
      );
      continue;
    }
    let doc: unknown;
    try {
      doc = parseYaml(file.text);
    } catch {
      console.warn(`[exam] Bỏ qua ${file.file}: lỗi cú pháp YAML`);
      continue;
    }
    const issues: ValidationIssue[] = [];
    const exam = validateExamFile(
      doc,
      {
        file: file.file,
        program: config,
        dirKind: parts[2]!,
        basename: parts[3]!.replace(/\.ya?ml$/i, ""),
      },
      refs,
      issues,
    );
    const errors = issues.filter((i) => i.severity === "error");
    if (!exam || errors.length > 0) {
      for (const e of errors) {
        console.warn(`[exam] Bỏ qua ${file.file}: ${e.path ? `${e.path}: ` : ""}${e.message}`);
      }
      continue;
    }
    if (exam.status === "draft" && !shouldIncludeDrafts(options)) continue;

    const built = buildExam(program, config, exam, options);
    if (built) entries.push(built);
    else console.warn(`[exam] Bỏ qua ${file.file}: không dựng được đề`);
  }

  entries.sort(
    (a, b) =>
      a.summary.kind.localeCompare(b.summary.kind) || a.summary.id.localeCompare(b.summary.id),
  );
  return { entries };
}

function shouldIncludeDrafts(options: ExamSourceOptions): boolean {
  if (options.includeDrafts !== undefined) return options.includeDrafts;
  return process.env.TOPIKLY_HIDE_DRAFT_EXAMS !== "1";
}

function buildExam(
  program: string,
  config: ProgramConfig,
  file: ExamFile,
  options: PracticeSourceOptions,
): ExamEntry | undefined {
  const sections: FullExamSection[] = [];

  for (const [index, section] of file.sections.entries()) {
    const programSection = config.sections.find((s) => s.skill === section.skill);
    const blueprint = getExamBlueprint(config, file.kind, section.skill);
    if (!programSection || !blueprint) return undefined;

    if (section.skill === "writing") {
      const items: FullWritingItem[] = [];
      for (const id of section.questions) {
        const prompt = getWritingPrompt(program, id, options);
        const reveal = getWritingReveal(program, id, options);
        const type = config.question_types.find((t) => t.code === prompt?.type_code);
        const maxPoints = prompt ? config.writing_points[prompt.type_code] : undefined;
        if (!prompt || !reveal || !type || maxPoints === undefined) return undefined;
        items.push({
          number: items.length + 1,
          type_group: type.type_group,
          max_points: maxPoints,
          prompt,
          reveal,
        });
      }
      sections.push({
        skill: "writing",
        order: index + 1,
        duration_sec: section.duration_sec ?? blueprint.duration_sec,
        question_count: items.length,
        max_score: programSection.max_score,
        questions: [],
        writing_items: items,
      });
      continue;
    }

    const questions: FullExamQuestion[] = [];
    for (const id of section.questions) {
      const question = getFullQuestion(program, id, options);
      if (!question) return undefined;
      const type = config.question_types.find((t) => t.code === question.type_code);
      if (!type) return undefined;
      questions.push({ number: questions.length + 1, type_group: type.type_group, question });
    }
    sections.push({
      skill: section.skill,
      order: index + 1,
      duration_sec: section.duration_sec ?? blueprint.duration_sec,
      question_count: questions.length,
      max_score: programSection.max_score,
      questions,
    });
  }

  const full: FullExam = {
    id: file.id,
    program,
    kind: file.kind,
    title: file.title,
    status: file.status,
    sections,
  };
  return { full, summary: summarize(full) };
}

function summarize(exam: FullExam): ExamSummary {
  return {
    id: exam.id,
    program: exam.program,
    kind: exam.kind,
    title: exam.title,
    status: exam.status,
    skills: exam.sections.map((s) => s.skill),
    question_count: exam.sections.reduce((n, s) => n + s.question_count, 0),
    duration_sec: exam.sections.reduce((n, s) => n + s.duration_sec, 0),
  };
}

// ------------------------------------------------------------------ memo

const memo = new Map<string, ExamBank>();

function getExamBank(program: string, options: ExamSourceOptions): ExamBank {
  // Dev: đọc lại mỗi lần để sửa YAML thấy ngay (số file nhỏ).
  if (process.env.NODE_ENV === "development") return loadExamBank(program, options);
  const key = JSON.stringify([
    program,
    options.contentRoot ?? "",
    options.requireReviewed === true,
    options.includeDrafts ?? null,
    process.env.TOPIKLY_HIDE_DRAFT_EXAMS ?? "",
  ]);
  let bank = memo.get(key);
  if (!bank) {
    bank = loadExamBank(program, options);
    memo.set(key, bank);
  }
  return bank;
}

/** Xoá memo (dùng trong test hoặc sau khi cập nhật nội dung lúc chạy). */
export function clearExamCache(): void {
  memo.clear();
}

// ------------------------------------------------------------------ chuyển sang bản công khai

/**
 * Gom câu thành khối: các câu LIỀN NHAU cùng type_group là một khối; câu có `group_key` thì
 * khối theo group_key (`shared_material: true`). Số câu lấy từ vị trí trong đề.
 */
export function toPublicSection(
  config: ProgramConfig,
  section: FullExamSection,
): PublicExamSection {
  if (section.skill === "writing") return toPublicWritingSection(section);
  const skill = section.skill;
  const blocks: PublicExamBlock[] = [];
  let currentKey: string | undefined;

  for (const item of section.questions) {
    const groupKey = item.question.group_key;
    const key = groupKey ? `gk:${groupKey}` : `tg:${item.type_group}`;
    const publicQuestion: PublicExamQuestion = {
      number: item.number,
      question: toPublicQuestion(item.question),
    };
    const last = blocks[blocks.length - 1];
    if (last && key === currentKey) {
      last.questions.push(publicQuestion);
      last.last_number = item.number;
    } else {
      blocks.push({
        type_group: item.type_group,
        first_number: item.number,
        last_number: item.number,
        instruction_ko: "",
        shared_material: groupKey !== undefined,
        questions: [publicQuestion],
      });
      currentKey = key;
    }
  }
  for (const block of blocks) {
    block.instruction_ko = instructionFor(
      config.type_groups.find((g) => g.group === block.type_group),
      block.first_number,
      block.last_number,
    );
  }

  const publicSection: PublicChoiceSection = {
    skill,
    order: section.order,
    duration_sec: section.duration_sec,
    question_count: section.question_count,
    max_score: section.max_score,
    blocks,
  };
  return publicSection;
}

/**
 * Phần Viết công khai: chỉ `WritingPrompt` (đã whitelist ở writing-source) + điểm tối đa. KHÔNG kèm
 * `reveal` (bài mẫu, đáp án, rubric, lời giải): những thứ đó chỉ có trong `ExamResult.writing`.
 */
function toPublicWritingSection(section: FullExamSection): PublicWritingSection {
  return {
    skill: "writing",
    order: section.order,
    duration_sec: section.duration_sec,
    question_count: section.question_count,
    max_score: section.max_score,
    blocks: [],
    writing_items: (section.writing_items ?? []).map((item) => ({
      number: item.number,
      type_group: item.type_group,
      max_points: item.max_points,
      prompt: item.prompt,
    })),
  };
}

export function toPublicExam(config: ProgramConfig, exam: FullExam): PublicExam {
  return { ...summarize(exam), sections: exam.sections.map((s) => toPublicSection(config, s)) };
}

// ------------------------------------------------------------------ API

/**
 * Danh sách đề, sắp theo kind rồi id. Program lạ trả []. `kind` bỏ trống = mọi loại TRỪ `placement`
 * (Test trình độ không nằm trong trụ Đề thi); muốn lấy phải truyền đúng `kind = "placement"`.
 */
export function listExams(
  program: string,
  kind?: ExamKind,
  options: ExamSourceOptions = {},
): ExamSummary[] {
  return getExamBank(program, options)
    .entries.filter((e) => (kind ? e.summary.kind === kind : e.summary.kind !== "placement"))
    .map((e) => e.summary);
}

/** Đề công khai (không đáp án). `undefined` nếu không có. */
export function getPublicExam(
  program: string,
  kind: string,
  examId: string,
  options: ExamSourceOptions = {},
): PublicExam | undefined {
  const config = findProgram(program);
  const entry = getExamBank(program, options).entries.find(
    (e) => e.summary.kind === kind && e.summary.id === examId,
  );
  return config && entry ? toPublicExam(config, entry.full) : undefined;
}

/**
 * Đề Test trình độ đang dùng của chương trình (`ProgramConfig.placement.exam_id`, loại `placement`).
 * `undefined` nếu chương trình lạ, đề chưa có hoặc đề không hợp lệ/bị ẩn.
 */
export function getPlacementPublicExam(
  program: string,
  options: ExamSourceOptions = {},
): PublicExam | undefined {
  const config = findProgram(program);
  return config
    ? getPublicExam(program, "placement", config.placement.exam_id, options)
    : undefined;
}

/** NỘI BỘ server: bản đầy đủ để chấm. Không trả cho client. */
export function getFullExam(
  program: string,
  kind: string,
  examId: string,
  options: ExamSourceOptions = {},
): FullExam | undefined {
  return getExamBank(program, options).entries.find(
    (e) => e.summary.kind === kind && e.summary.id === examId,
  )?.full;
}
