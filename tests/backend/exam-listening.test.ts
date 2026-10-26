import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// "use cache" chỉ là chuỗi ngoài Next; cacheLife thì không chạy được ngoài Next nên mock.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { POST } from "@/app/api/exam/submit/route";
import type { ValidationIssue } from "@/lib/db/content-validation";
import { validateExamFile, type ExamQuestionRef } from "@/lib/db/exam-validation";
import { getExamBlueprint, topikII } from "@/lib/db/programs";
import { getExam, getExams } from "@/lib/exam/queries";
import {
  clearExamCache,
  getFullExam,
  getPublicExam,
  listExams,
  type FullExam,
} from "@/lib/exam/source";
import { scoreExam } from "@/lib/exam/score";
import { submitExam } from "@/lib/exam/submit";
import type { ExamResult } from "@/lib/exam/types";
import { clearPracticeCache } from "@/lib/practice/source";
import { CHOICE_LABELS } from "@/lib/practice/types";

afterEach(() => {
  clearExamCache();
  clearPracticeCache();
});

const FIXTURE_L09 = path.resolve(
  __dirname,
  "../fixtures/content/valid/topik-ii/practice/L09/l09-0001.yaml",
);

// ------------------------------------------------------------------ blueprint

describe("exam_blueprints.mini.listening (dữ liệu cấu hình)", () => {
  it("Mini Nghe: 20 câu, 25 phút, nằm trong cấu hình chương trình", () => {
    expect(topikII.exam_blueprints.mini?.listening).toEqual({
      question_count: 20,
      duration_sec: 25 * 60,
    });
    expect(getExamBlueprint(topikII, "mini", "listening")).toEqual({
      question_count: 20,
      duration_sec: 1500,
    });
  });

  it("Mini Đọc giữ nguyên; Full Nghe vẫn theo sections (50 câu / 60 phút)", () => {
    expect(getExamBlueprint(topikII, "mini", "reading")).toEqual({
      question_count: 20,
      duration_sec: 1800,
    });
    expect(getExamBlueprint(topikII, "full", "listening")).toEqual({
      question_count: 50,
      duration_sec: 3600,
    });
  });
});

// ------------------------------------------------------------------ luật audio

/** Kho câu Nghe giả: L01..L20, đáp án theo dãy phân bố đều (không vi phạm luật nhãn). */
const LABEL_SEQ = [0, 1, 2, 3, 1, 0, 3, 2, 2, 3, 0, 1, 3, 2, 0, 1, 1, 2, 3, 0];
const lid = (n: number) => `l${String(n).padStart(2, "0")}-0001`;
const L_IDS = Array.from({ length: 20 }, (_, i) => lid(i + 1));

function listeningRefs(
  audio: (n: number) => string | null | undefined,
): Map<string, ExamQuestionRef> {
  return new Map(
    L_IDS.map((id, i): [string, ExamQuestionRef] => {
      const a = audio(i + 1);
      return [
        id,
        {
          id,
          type_code: `L${String(i + 1).padStart(2, "0")}`,
          correctIndex: LABEL_SEQ[i]!,
          ...(a !== undefined ? { audio_url: a } : {}),
        },
      ];
    }),
  );
}

function validate(
  refs: Map<string, ExamQuestionRef>,
  over: { kind?: string; status?: string; skill?: string; questions?: string[] } = {},
) {
  const kind = over.kind ?? "mini";
  const issues: ValidationIssue[] = [];
  const parsed = validateExamFile(
    {
      id: "nghe-t",
      kind,
      title: "Mini test Nghe thử",
      status: over.status ?? "draft",
      sections: [{ skill: over.skill ?? "listening", questions: over.questions ?? L_IDS }],
    },
    {
      file: `topik-ii/exams/${kind}/nghe-t.yaml`,
      program: topikII,
      dirKind: kind,
      basename: "nghe-t",
    },
    refs,
    issues,
  );
  return { parsed, issues, audio: issues.filter((i) => i.code === "audio-missing") };
}

describe("validateExamFile: luật audio của câu Nghe", () => {
  const allAudio = (n: number) => `https://cdn.example/audio/${lid(n)}.mp3`;

  it("mọi câu Nghe có audio_url: không cảnh báo, không lỗi (draft và published)", () => {
    for (const status of ["draft", "published"]) {
      const { issues, audio } = validate(listeningRefs(allAudio), { status });
      expect(audio).toEqual([]);
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    }
  });

  it("draft thiếu audio: MỘT cảnh báo gộp, liệt kê id thiếu, không phải lỗi", () => {
    // 3 câu thiếu: null, chuỗi rỗng, chuỗi chỉ khoảng trắng
    const refs = listeningRefs((n) =>
      n === 2 ? null : n === 5 ? "" : n === 9 ? "   " : allAudio(n),
    );
    const { parsed, issues, audio } = validate(refs);
    expect(parsed).toBeDefined();
    expect(audio).toHaveLength(1);
    expect(audio[0]!.severity).toBe("warning");
    expect(audio[0]!.message).toContain("3/20");
    for (const id of [lid(2), lid(5), lid(9)]) expect(audio[0]!.message).toContain(id);
    expect(audio[0]!.message).not.toContain(lid(1));
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("câu không khai báo audio_url (undefined) cũng tính là thiếu", () => {
    const { audio } = validate(listeningRefs(() => undefined));
    expect(audio).toHaveLength(1);
    expect(audio[0]!.message).toContain("20/20");
  });

  it("20 câu thiếu: vẫn một thông báo, rút gọn danh sách id ('và N câu khác')", () => {
    const { audio } = validate(listeningRefs(() => null));
    expect(audio).toHaveLength(1);
    expect(audio[0]!.message).toMatch(/và \d+ câu khác/);
    expect(audio[0]!.message).toContain(lid(1));
    expect(audio[0]!.message).not.toContain(lid(20));
  });

  it("published thiếu audio: LỖI chặn", () => {
    const refs = listeningRefs((n) => (n === 7 ? null : allAudio(n)));
    const { audio } = validate(refs, { status: "published" });
    expect(audio).toHaveLength(1);
    expect(audio[0]!.severity).toBe("error");
    expect(audio[0]!.message).toContain(lid(7));
  });

  it.each(["mini", "full", "hard", "ibt", "placement"])(
    "áp dụng cho kind %s: draft cảnh báo, published lỗi",
    (kind) => {
      const refs = listeningRefs(() => null);
      expect(validate(refs, { kind, status: "draft" }).audio[0]?.severity).toBe("warning");
      expect(validate(refs, { kind, status: "published" }).audio[0]?.severity).toBe("error");
    },
  );

  it("câu Đọc không cần audio_url", () => {
    const refs = new Map<string, ExamQuestionRef>([
      ["r01-0001", { id: "r01-0001", type_code: "R01", correctIndex: 0 }],
    ]);
    const { audio } = validate(refs, {
      skill: "reading",
      questions: ["r01-0001"],
      status: "published",
    });
    expect(audio).toEqual([]);
  });
});

// ------------------------------------------------------------------ đề Nghe được phục vụ và chấm

/**
 * Dựng content tạm: 20 câu L09 nhân bản từ fixture (đáp án đúng xoay theo LABEL_SEQ), đề Mini Nghe
 * `nghe-t` gồm 20 câu đó. Không phụ thuộc nội dung thật đang soạn trong content/.
 */
function buildListeningRoot(opts: {
  status: "draft" | "published";
  audio: (n: number) => string | null;
}): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "topikly-nghe-"));
  const base = parseYaml(readFileSync(FIXTURE_L09, "utf8")) as Record<string, unknown> & {
    choices: Array<Record<string, unknown>>;
  };
  const ids: string[] = [];
  for (let n = 1; n <= 20; n++) {
    const id = `l09-${String(n).padStart(4, "0")}`;
    ids.push(id);
    const k = LABEL_SEQ[n - 1]!;
    const choices = CHOICE_LABELS.map((label, j) => ({
      ...base.choices[(((j - k) % 4) + 4) % 4]!,
      label,
    }));
    const doc = {
      ...base,
      id,
      audio_url: opts.audio(n),
      choices,
      explanation_vi: String(base.explanation_vi).replace("Đáp án ①", `Đáp án ${CHOICE_LABELS[k]}`),
    };
    const file = path.join(root, "content", "topik-ii", "practice", "L09", `${id}.yaml`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, stringifyYaml(doc));
  }
  const examFile = path.join(root, "content", "topik-ii", "exams", "mini", "nghe-t.yaml");
  mkdirSync(path.dirname(examFile), { recursive: true });
  writeFileSync(
    examFile,
    stringifyYaml({
      id: "nghe-t",
      kind: "mini",
      title: "Mini test Nghe thử",
      status: opts.status,
      sections: [{ skill: "listening", questions: ids }],
    }),
  );
  return root;
}

const withRoot = (root: string) => ({ contentRoot: path.join(root, "content") });

describe("đề Mini Nghe: phục vụ và chấm", () => {
  it("getPublicExam: phần Nghe 20 câu / 1500 giây, câu có audio_url, speakers, transcript_ko; không lộ đáp án", () => {
    const root = buildListeningRoot({ status: "draft", audio: (n) => `/audio/nghe-t-${n}.mp3` });
    try {
      const exam = getPublicExam("topik-ii", "mini", "nghe-t", withRoot(root))!;
      expect(exam).toMatchObject({
        id: "nghe-t",
        kind: "mini",
        skills: ["listening"],
        question_count: 20,
        duration_sec: 25 * 60,
      });
      const section = exam.sections[0]!;
      expect(section).toMatchObject({ skill: "listening", duration_sec: 1500, max_score: 100 });
      const questions = section.blocks.flatMap((b) => b.questions);
      expect(questions.map((q) => q.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      const first = questions[0]!.question;
      expect(first.audio_url).toBe("/audio/nghe-t-1.mp3");
      expect(first.transcript_ko).toContain("여자:");
      expect(first.speakers).toEqual([
        { label: "여자", gender: "female" },
        { label: "남자", gender: "male" },
      ]);
      const text = JSON.stringify(exam);
      for (const key of [
        '"correct"',
        '"note_vi"',
        '"trap"',
        '"explanation_vi"',
        '"transcript_vi"',
      ]) {
        expect(text).not.toContain(key);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("đề draft chưa có audio vẫn được phục vụ (audio_url null, giữ transcript_ko)", () => {
    const root = buildListeningRoot({ status: "draft", audio: () => null });
    try {
      const exam = getPublicExam("topik-ii", "mini", "nghe-t", withRoot(root))!;
      const q = exam.sections[0]!.blocks[0]!.questions[0]!.question;
      expect(q.audio_url).toBeNull();
      expect(q.transcript_ko).toBeTruthy();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("đề published thiếu audio KHÔNG được phục vụ (có console.warn)", () => {
    const root = buildListeningRoot({ status: "published", audio: () => null });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(getPublicExam("topik-ii", "mini", "nghe-t", withRoot(root))).toBeUndefined();
      expect(listExams("topik-ii", "mini", withRoot(root))).toEqual([]);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("đề published đủ audio được phục vụ", () => {
    const root = buildListeningRoot({ status: "published", audio: (n) => `/audio/n${n}.mp3` });
    try {
      const exam = getPublicExam("topik-ii", "mini", "nghe-t", withRoot(root));
      expect(exam).toMatchObject({ status: "published", question_count: 20 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("listExams / getExams liệt kê đề Nghe với skills ['listening']", async () => {
    const root = buildListeningRoot({ status: "draft", audio: () => null });
    try {
      const [summary] = listExams("topik-ii", "mini", withRoot(root));
      expect(summary).toMatchObject({
        id: "nghe-t",
        skills: ["listening"],
        question_count: 20,
        duration_sec: 1500,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
    // Đường queries (mặc định đọc content/ thật): không lỗi, mọi đề có danh sách kỹ năng hợp lệ.
    const all = await getExams("topik-ii", "mini");
    for (const e of all) expect(e.skills.length).toBeGreaterThan(0);
    expect(await getExam("topik-ii", "mini", "khong-co")).toBeNull();
  });

  it("scoreExam: Nghe chấm trên thang phần Nghe (100); điểm là ước lượng; transcript_vi chỉ có sau khi nộp", () => {
    const root = buildListeningRoot({ status: "draft", audio: (n) => `/audio/n${n}.mp3` });
    try {
      const full = getFullExam("topik-ii", "mini", "nghe-t", withRoot(root)) as FullExam;
      const right = Object.fromEntries(
        full.sections[0]!.questions.map(({ question }) => [question.id, question.correctLabel]),
      );
      const all = scoreExam(full, right, topikII);
      expect(all.sections).toEqual([
        { skill: "listening", correct: 20, total: 20, unanswered: 0, score: 100, max_score: 100 },
      ]);
      expect(all.total_score).toBe(100);
      expect(all.level.is_estimate).toBe(true);
      expect(all.by_type_group.map((g) => g.code)).toEqual(["L09-12"]);
      expect(all.questions[0]!.skill).toBe("listening");
      expect(all.questions[0]!.transcript_vi).toContain("Nữ:");

      // 15 đúng, 5 bỏ trống
      const partial = Object.fromEntries(Object.entries(right).slice(0, 15));
      const r = scoreExam(full, partial, topikII);
      expect(r.sections[0]).toMatchObject({ correct: 15, unanswered: 5, score: 75 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("submitExam: đề Nghe không có -> 404; nhãn lạ -> 400 invalid_choice", () => {
    const root = buildListeningRoot({ status: "draft", audio: () => null });
    try {
      const missing = submitExam(
        { program: "topik-ii", kind: "mini", examId: "khong-co", answers: {} },
        withRoot(root),
      );
      expect(missing).toMatchObject({ ok: false, status: 404 });
      const bad = submitExam(
        { program: "topik-ii", kind: "mini", examId: "nghe-t", answers: { "l09-0001": "⑤" } },
        withRoot(root),
      );
      expect(bad).toMatchObject({ ok: false, status: 400 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("POST /api/exam/submit chấm đề Nghe, trả transcript_vi từng câu", async () => {
    const root = buildListeningRoot({ status: "draft", audio: (n) => `/audio/n${n}.mp3` });
    try {
      // Route dùng content mặc định `<cwd>/content`: trỏ cwd sang thư mục tạm chỉ trong lúc gọi.
      const full = getFullExam("topik-ii", "mini", "nghe-t", withRoot(root))!;
      const answers = Object.fromEntries(
        full.sections[0]!.questions.map(({ question }, i) => [
          question.id,
          i < 10 ? question.correctLabel : null,
        ]),
      );
      clearExamCache();
      clearPracticeCache();

      const cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
      let res: Response;
      try {
        res = await POST(
          new Request("http://localhost/api/exam/submit", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              program: "topik-ii",
              kind: "mini",
              examId: "nghe-t",
              answers,
              timeSpentMs: 900_000,
            }),
          }),
        );
      } finally {
        cwd.mockRestore();
      }
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const r = (await res.json()) as ExamResult;
      expect(r.sections).toEqual([
        { skill: "listening", correct: 10, total: 20, unanswered: 10, score: 50, max_score: 100 },
      ]);
      expect(r.questions).toHaveLength(20);
      expect(r.questions.every((q) => q.skill === "listening" && q.transcript_vi)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
