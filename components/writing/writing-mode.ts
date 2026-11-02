"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Cách viết bài W53–W54: `typing` = ô gõ thường như bài thi máy (IBT), `manuscript` = giấy kẻ ô
 * 원고지 như bài thi giấy. Đây là tuỳ chọn của người xem nên lưu localStorage (chế độ khách),
 * dùng chung cho Luyện tập và Đề thi; đọc/ghi lỗi thì vẫn chạy với giá trị trong bộ nhớ.
 */
export type WritingMode = "typing" | "manuscript";

export const WRITING_MODE_KEY = "topikly:writing-mode:v1";
const DEFAULT_MODE: WritingMode = "typing";

const listeners = new Set<() => void>();
let memory: WritingMode | null = null;

function read(): WritingMode {
  if (memory) return memory;
  try {
    const stored = window.localStorage.getItem(WRITING_MODE_KEY);
    if (stored === "typing" || stored === "manuscript") memory = stored;
  } catch {
    // Trình duyệt chặn localStorage: dùng mặc định.
  }
  return memory ?? DEFAULT_MODE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== WRITING_MODE_KEY) return;
    memory = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setWritingMode(mode: WritingMode) {
  memory = mode;
  try {
    window.localStorage.setItem(WRITING_MODE_KEY, mode);
  } catch {
    // Không lưu được thì chỉ giữ trong phiên này.
  }
  for (const listener of listeners) listener();
}

/** Chỉ dùng trong test: quên giá trị đã nhớ để đọc lại từ localStorage. */
export function resetWritingModeMemory() {
  memory = null;
}

export function useWritingMode(): [WritingMode, (mode: WritingMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => DEFAULT_MODE);
  return [mode, useCallback((next: WritingMode) => setWritingMode(next), [])];
}
