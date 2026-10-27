"use client";

/**
 * Chế độ khách của trụ Đề thi: lưu bài làm dở và kết quả các lần làm bằng IndexedDB (API gốc).
 *
 * DB RIÊNG "topikly-exam" (không đụng "topikly-guest" của Luyện tập): nâng version một DB đang
 * mở ở tab khác sẽ bị chặn (`blocked`), còn tách DB thì hai trụ không ảnh hưởng nhau và dữ liệu
 * luyện tập cũ không có rủi ro. Khi đăng ký tài khoản, bước chuyển dữ liệu khách đọc cả hai DB.
 *
 * Nguyên tắc như guest-store.ts: MỌI hàm không bao giờ ném lỗi và không bao giờ treo. Thiếu
 * IndexedDB (SSR, chế độ riêng tư, bị chặn) thì ghi trả về `false`, đọc trả về rỗng/null; trình
 * làm đề vẫn chạy, chỉ không lưu được.
 *
 * DB "topikly-exam" v1:
 *   drafts  (khoá `${program}:${kind}:${examId}`, index byGroup) — bài làm dở, mỗi đề một bản
 *   results (khoá tự tăng, index byExam, byGroup) — mỗi lần nộp bài, giữ MAX_RESULTS_PER_EXAM lần gần nhất.
 *     Đề có phần Viết: bản ghi có thêm `selfPoints` (điểm người học tự chấm), cập nhật bằng `saveSelfPoints`.
 *     Chỉ thêm trường tuỳ chọn nên không cần nâng version DB.
 */
import type { ExamKind, ExamResult } from "@/lib/exam/types";
import {
  applySelfPoints,
  attemptOf,
  examKey,
  groupKey,
  pickNewerDraft,
  summarizeStatuses,
  toResultRecord,
  type ExamAttempt,
  type ExamDraft,
  type ExamResultRecord,
  type ExamStatusSummary,
  type SelfPoints,
} from "./exam-state";

const DB_NAME = "topikly-exam";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_RESULTS = "results";
/** Số lần làm giữ lại cho mỗi đề (kết quả đầy đủ kèm lời giải khá nặng). */
export const MAX_RESULTS_PER_EXAM = 10;
/** Không để một lần mở DB treo giao diện: quá hạn thì coi như không có IndexedDB. */
const OPEN_TIMEOUT_MS = 4000;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  const attempt = new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), OPEN_TIMEOUT_MS);
    const finish = (db: IDBDatabase | null) => {
      clearTimeout(timer);
      resolve(db);
    };
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      finish(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        const drafts = db.createObjectStore(STORE_DRAFTS, { keyPath: "key" });
        drafts.createIndex("byGroup", "group");
      }
      if (!db.objectStoreNames.contains(STORE_RESULTS)) {
        const results = db.createObjectStore(STORE_RESULTS, { keyPath: "id", autoIncrement: true });
        results.createIndex("byExam", "examKey");
        results.createIndex("byGroup", "group");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Tab khác nâng cấp DB: đóng để không chặn, lần sau mở lại.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      finish(db);
    };
    request.onerror = () => finish(null);
    request.onblocked = () => finish(null);
  });
  dbPromise = attempt;
  // Mở thất bại thì lần gọi sau thử lại, không nhớ kết quả null mãi.
  void attempt.then((db) => {
    if (db === null && dbPromise === attempt) dbPromise = null;
  });
  return attempt;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ------------------------------------------------------------------ bản sao đồng bộ của bản nháp

/**
 * Ghi vào IndexedDB là bất đồng bộ nên không kịp hoàn tất khi trang bị tải lại / đóng ngay sau khi gõ.
 * Với đề có phần Viết, bản nháp được SAO ĐỒNG BỘ vào localStorage (`stashDraft`) ngay khi người học gõ;
 * `loadDraft` lấy bản mới hơn của hai nơi. Bản sao tự xoá khi IndexedDB đã ghi kịp bản mới hơn hoặc bằng
 * nó, và khi `clearDraft` (nộp bài). Mọi thao tác đều try/catch: thiếu localStorage thì bỏ qua.
 */
const STASH_PREFIX = "topikly:exam-draft-stash:v1:";

function stashStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Ghi bản sao đồng bộ của bản nháp. true = đã ghi. Không bao giờ ném lỗi. */
export function stashDraft(draft: ExamDraft): boolean {
  try {
    const storage = stashStorage();
    if (!storage) return false;
    storage.setItem(STASH_PREFIX + draft.key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function readStash(key: string): ExamDraft | null {
  try {
    const raw = stashStorage()?.getItem(STASH_PREFIX + key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ExamDraft> | null;
    if (
      typeof value !== "object" ||
      value === null ||
      value.key !== key ||
      typeof value.startedAt !== "number" ||
      typeof value.updatedAt !== "number"
    ) {
      return null;
    }
    return value as ExamDraft;
  } catch {
    return null;
  }
}

/** Xoá bản sao; `upToUpdatedAt` chỉ xoá khi bản sao không mới hơn mốc đó (IndexedDB đã ghi kịp). */
function dropStash(key: string, upToUpdatedAt?: number): void {
  try {
    const storage = stashStorage();
    if (!storage) return;
    if (upToUpdatedAt !== undefined) {
      const stash = readStash(key);
      if (stash && stash.updatedAt > upToUpdatedAt) return;
    }
    storage.removeItem(STASH_PREFIX + key);
  } catch {
    // bỏ qua
  }
}

// ------------------------------------------------------------------ bài làm dở

/** Ghi (ghi đè) bài làm dở của một đề. true = đã lưu. */
export async function saveDraft(draft: ExamDraft): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) {
      // Không có IndexedDB: bản sao localStorage là chỗ duy nhất giữ bài Viết.
      if (draft.writing) stashDraft(draft);
      return false;
    }
    const tx = db.transaction(STORE_DRAFTS, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => undefined);
    tx.objectStore(STORE_DRAFTS).put(draft);
    await done;
    dropStash(draft.key, draft.updatedAt);
    return true;
  } catch {
    if (draft.writing) stashDraft(draft);
    return false;
  }
}

export async function loadDraft(
  program: string,
  kind: ExamKind,
  examId: string,
): Promise<ExamDraft | null> {
  const key = examKey(program, kind, examId);
  let row: ExamDraft | null = null;
  try {
    const db = await openDb();
    if (db) {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      row =
        ((await requestToPromise(tx.objectStore(STORE_DRAFTS).get(key))) as
          ExamDraft | undefined) ?? null;
    }
  } catch {
    row = null;
  }
  return pickNewerDraft(row, readStash(key));
}

export async function clearDraft(
  program: string,
  kind: ExamKind,
  examId: string,
): Promise<boolean> {
  dropStash(examKey(program, kind, examId));
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE_DRAFTS, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => undefined);
    tx.objectStore(STORE_DRAFTS).delete(examKey(program, kind, examId));
    await done;
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ kết quả

/** Lưu một lần nộp bài, giữ MAX_RESULTS_PER_EXAM lần gần nhất của đề. true = đã lưu. */
export async function saveResult(result: ExamResult, selfPoints?: SelfPoints): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE_RESULTS, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => undefined);
    const store = tx.objectStore(STORE_RESULTS);
    const record = toResultRecord(result, selfPoints);
    store.add(record);
    const rows = (await requestToPromise(
      store.index("byExam").getAll(record.examKey),
    )) as ExamResultRecord[];
    // Các yêu cầu cùng giao dịch chạy theo thứ tự nên `rows` đã gồm bản vừa thêm.
    const excess = rows.length - MAX_RESULTS_PER_EXAM;
    if (excess > 0) {
      const oldest = [...rows].sort((a, b) => a.submittedAt - b.submittedAt).slice(0, excess);
      for (const row of oldest) if (row.id !== undefined) store.delete(row.id);
    }
    await done;
    return true;
  } catch {
    return false;
  }
}

/** Lần nộp gần nhất của một đề kèm điểm tự chấm Viết, hoặc null. */
export async function loadLatestAttempt(
  program: string,
  kind: ExamKind,
  examId: string,
): Promise<ExamAttempt | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE_RESULTS, "readonly");
    const rows = (await requestToPromise(
      tx
        .objectStore(STORE_RESULTS)
        .index("byExam")
        .getAll(examKey(program, kind, examId)),
    )) as ExamResultRecord[];
    if (rows.length === 0) return null;
    return attemptOf(rows.reduce((a, b) => (b.submittedAt >= a.submittedAt ? b : a)));
  } catch {
    return null;
  }
}

/** Kết quả lần nộp gần nhất của một đề, hoặc null. */
export async function loadLatestResult(
  program: string,
  kind: ExamKind,
  examId: string,
): Promise<ExamResult | null> {
  return (await loadLatestAttempt(program, kind, examId))?.result ?? null;
}

/**
 * Ghi điểm tự chấm Viết vào đúng lần nộp (cùng `submittedAt`), tính lại điểm/cấp tóm tắt của bản ghi.
 * false = không lưu được (không có IndexedDB, hoặc chưa thấy bản ghi của lần nộp này).
 */
export async function saveSelfPoints(result: ExamResult, selfPoints: SelfPoints): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE_RESULTS, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => undefined);
    const store = tx.objectStore(STORE_RESULTS);
    const rows = (await requestToPromise(
      store.index("byExam").getAll(examKey(result.program, result.kind, result.examId)),
    )) as ExamResultRecord[];
    const updated = applySelfPoints(rows, result, selfPoints);
    if (!updated) {
      tx.abort();
      await done.catch(() => undefined);
      return false;
    }
    store.put(updated);
    await done;
    return true;
  } catch {
    return false;
  }
}

/** Tình trạng (đang làm dở, số lần làm, điểm gần nhất) của MỌI đề thuộc một loại, theo examId. */
export async function loadExamStatuses(
  program: string,
  kind: ExamKind,
): Promise<Record<string, ExamStatusSummary>> {
  try {
    const db = await openDb();
    if (!db) return {};
    const group = groupKey(program, kind);
    const tx = db.transaction([STORE_DRAFTS, STORE_RESULTS], "readonly");
    const [drafts, results] = await Promise.all([
      requestToPromise(tx.objectStore(STORE_DRAFTS).index("byGroup").getAll(group)),
      requestToPromise(tx.objectStore(STORE_RESULTS).index("byGroup").getAll(group)),
    ]);
    return summarizeStatuses(drafts as ExamDraft[], results as ExamResultRecord[]);
  } catch {
    return {};
  }
}
