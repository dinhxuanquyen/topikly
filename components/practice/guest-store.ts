"use client";

/**
 * Chế độ khách: lưu lịch sử trả lời và tiến độ theo câu bằng IndexedDB (API gốc, không thư viện).
 *
 * Nguyên tắc: MỌI hàm ở đây không bao giờ ném lỗi và không bao giờ treo. Khi IndexedDB không có
 * (SSR, chế độ riêng tư, bị chặn) thì ghi trả về `false`, đọc trả về rỗng; giao diện vẫn chạy,
 * chỉ không lưu được. Phần tổng hợp thuần nằm ở guest-stats.ts.
 *
 * DB "topikly-guest" v1:
 *   answers  (khoá tự tăng, index byProgram)  — mỗi lượt nộp bài
 *   progress (khoá `${program}:${questionId}`, index byProgram) — trạng thái mới nhất của câu
 */
import {
  applyAnswerToProgress,
  applyMarkToProgress,
  groupStatsByType,
  progressKey,
  type AnswerRecord,
  type ProgressRecord,
  type QuestionMeta,
  type TypeStats,
} from "./guest-stats";

const DB_NAME = "topikly-guest";
const DB_VERSION = 1;
const STORE_ANSWERS = "answers";
const STORE_PROGRESS = "progress";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ANSWERS)) {
        const answers = db.createObjectStore(STORE_ANSWERS, { keyPath: "id", autoIncrement: true });
        answers.createIndex("byProgram", "program");
      }
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        const progress = db.createObjectStore(STORE_PROGRESS, { keyPath: "key" });
        progress.createIndex("byProgram", "program");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Tab khác nâng cấp DB: đóng để không chặn, lần sau mở lại.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
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

// ------------------------------------------------------------------ thông báo thay đổi

type Listener = () => void;
const listeners = new Set<Listener>();
let statsCache: Map<string, { at: number; promise: Promise<Record<string, TypeStats>> }> =
  new Map();

/** Gọi `listener` mỗi khi dữ liệu khách đổi (cùng tab). Trả về hàm huỷ đăng ký. */
export function subscribeGuestChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChanged(): void {
  statsCache = new Map();
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // một listener lỗi không được làm hỏng các listener khác
    }
  }
}

// ------------------------------------------------------------------ ghi

/** Ghi một lượt trả lời và cập nhật tiến độ câu trong cùng một giao dịch. true = đã lưu. */
export async function recordAnswer(answer: Omit<AnswerRecord, "id">): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction([STORE_ANSWERS, STORE_PROGRESS], "readwrite");
    const done = transactionDone(tx);
    done.catch(() => undefined); // tránh unhandledrejection nếu ném lỗi trước khi await
    tx.objectStore(STORE_ANSWERS).add(answer);
    const progressStore = tx.objectStore(STORE_PROGRESS);
    const prev = (await requestToPromise(
      progressStore.get(progressKey(answer.program, answer.questionId)),
    )) as ProgressRecord | undefined;
    progressStore.put(applyAnswerToProgress(prev, answer));
    await done;
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}

/** Bật/tắt đánh dấu một câu. true = đã lưu. */
export async function setMarked(meta: QuestionMeta, marked: boolean): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE_PROGRESS, "readwrite");
    const done = transactionDone(tx);
    done.catch(() => undefined); // tránh unhandledrejection nếu ném lỗi trước khi await
    const store = tx.objectStore(STORE_PROGRESS);
    const prev = (await requestToPromise(store.get(progressKey(meta.program, meta.questionId)))) as
      ProgressRecord | undefined;
    store.put(applyMarkToProgress(prev, meta, marked, Date.now()));
    await done;
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ đọc

/** Tiến độ các câu thuộc một dạng. */
export async function loadProgressForType(
  program: string,
  typeCode: string,
): Promise<ProgressRecord[]> {
  try {
    const db = await openDb();
    if (!db) return [];
    const tx = db.transaction(STORE_PROGRESS, "readonly");
    const rows = (await requestToPromise(
      tx.objectStore(STORE_PROGRESS).index("byProgram").getAll(program),
    )) as ProgressRecord[];
    return rows.filter((row) => row.type_code === typeCode);
  } catch {
    return [];
  }
}

/** Mọi lượt trả lời của một chương trình (dùng cho màn "Hôm nay": số câu hôm nay, chuỗi ngày). */
export async function loadAnswers(program: string): Promise<AnswerRecord[]> {
  try {
    const db = await openDb();
    if (!db) return [];
    const tx = db.transaction(STORE_ANSWERS, "readonly");
    return (await requestToPromise(
      tx.objectStore(STORE_ANSWERS).index("byProgram").getAll(program),
    )) as AnswerRecord[];
  } catch {
    return [];
  }
}

/**
 * Thống kê của MỌI dạng trong một chương trình, theo type_code. Nhiều thẻ trên cùng trang dùng
 * chung một lần đọc; kết quả được cache tới lần ghi kế tiếp.
 */
export function loadStatsByType(program: string): Promise<Record<string, TypeStats>> {
  const cached = statsCache.get(program);
  if (cached) return cached.promise;
  const pending = (async () => {
    try {
      const db = await openDb();
      if (!db) return {};
      const tx = db.transaction(STORE_ANSWERS, "readonly");
      const rows = (await requestToPromise(
        tx.objectStore(STORE_ANSWERS).index("byProgram").getAll(program),
      )) as AnswerRecord[];
      return groupStatsByType(rows);
    } catch {
      return {};
    }
  })();
  statsCache.set(program, { at: Date.now(), promise: pending });
  return pending;
}

/**
 * Bỏ cache thống kê (khi quay lại trang, tab hiện lại…). Bỏ qua cache vừa tạo trong 300 ms để
 * nhiều thẻ cùng phản ứng một sự kiện mà không đọc IndexedDB nhiều lần.
 */
export function invalidateStatsCache(): void {
  const now = Date.now();
  for (const [program, entry] of statsCache) {
    if (now - entry.at > 300) statsCache.delete(program);
  }
}
