"use client";

/**
 * Đánh dấu "đã thuộc" cho từ vựng ở chế độ khách: lưu trong localStorage của thiết bị.
 * Mọi từ mặc định là "chưa thuộc"; chỉ lưu id các từ đã thuộc.
 *
 * Nguyên tắc như guest-store.ts: không bao giờ ném lỗi. Khi localStorage không dùng được
 * (chế độ riêng tư, bị chặn, đầy bộ nhớ) thì trạng thái vẫn đúng trong phiên (bộ nhớ trong) và
 * `persisted` báo false để giao diện nhắc người học. Đồng bộ giữa các thẻ/tab qua sự kiện `storage`.
 *
 * Dùng bằng hook `useKnownWords(program)` (useSyncExternalStore): lần render đầu và lúc hydrate
 * luôn là tập rỗng để khớp với HTML prerender, sau đó React cập nhật theo dữ liệu máy.
 */
import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "topikly:vocab-known:v1";
const MAX_IDS = 20000;

export interface KnownSnapshot {
  /** Các id từ đã thuộc. Là đối tượng bất biến: mỗi lần đổi tạo đối tượng mới. */
  known: ReadonlySet<string>;
  /** false nếu lần ghi gần nhất vào localStorage thất bại. */
  persisted: boolean;
}

const EMPTY: KnownSnapshot = { known: new Set<string>(), persisted: true };

function storageKey(program: string): string {
  return `${PREFIX}:${program}`;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Kiểm tra dữ liệu đọc từ localStorage (có thể bị sửa tay hoặc hỏng) -> mảng id hợp lệ. */
export function parseKnownIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value === "string" && value.length > 0 && value.length <= 64) out.push(value);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

function readFromStorage(program: string): string[] {
  try {
    const text = storage()?.getItem(storageKey(program));
    return text ? parseKnownIds(JSON.parse(text)) : [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ kho trong bộ nhớ

const snapshots = new Map<string, KnownSnapshot>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // một listener lỗi không làm hỏng các listener khác
    }
  }
}

/** Snapshot hiện tại của một chương trình (đọc localStorage lần đầu). Ổn định giữa các lần gọi. */
export function getKnownSnapshot(program: string): KnownSnapshot {
  let snapshot = snapshots.get(program);
  if (!snapshot) {
    snapshot = { known: new Set(readFromStorage(program)), persisted: true };
    snapshots.set(program, snapshot);
  }
  return snapshot;
}

/** Đánh dấu / bỏ đánh dấu một từ. Trả về true nếu đã lưu được vào máy. */
export function setWordKnown(program: string, id: string, known: boolean): boolean {
  const current = getKnownSnapshot(program).known;
  if (current.has(id) === known) return getKnownSnapshot(program).persisted;
  const next = new Set(current);
  if (known) next.add(id);
  else next.delete(id);

  let persisted = true;
  try {
    const store = storage();
    if (!store) persisted = false;
    else if (next.size === 0) store.removeItem(storageKey(program));
    else store.setItem(storageKey(program), JSON.stringify([...next]));
  } catch {
    persisted = false;
  }
  snapshots.set(program, { known: next, persisted });
  emit();
  return persisted;
}

/** Xoá bộ nhớ tạm trong module (dùng trong test). */
export function resetKnownCache(): void {
  snapshots.clear();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) {
      snapshots.clear(); // tab khác vừa ghi: đọc lại từ máy
      listener();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export interface KnownWords extends KnownSnapshot {
  isKnown: (id: string) => boolean;
  /** Đảo trạng thái đã thuộc của một từ. */
  toggle: (id: string) => void;
  setKnown: (id: string, known: boolean) => void;
}

export function useKnownWords(program: string): KnownWords {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => getKnownSnapshot(program),
    () => EMPTY,
  );
  const setKnown = useCallback(
    (id: string, known: boolean) => {
      setWordKnown(program, id, known);
    },
    [program],
  );
  const toggle = useCallback(
    (id: string) => {
      setWordKnown(program, id, !getKnownSnapshot(program).known.has(id));
    },
    [program],
  );
  const isKnown = useCallback((id: string) => snapshot.known.has(id), [snapshot]);
  return { ...snapshot, isKnown, toggle, setKnown };
}
