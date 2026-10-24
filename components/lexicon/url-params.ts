"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Bộ lọc nằm trên URL (?cap=3&chu-de=society) để chia sẻ và giữ khi bấm Back, mà KHÔNG dùng
 * useSearchParams / searchParams của trang (sẽ buộc trang động trong cacheComponents). Trang vẫn
 * prerender với bộ lọc mặc định; sau khi hydrate, hook đọc `window.location.search`.
 * Ghi bằng history.replaceState (không thêm mục lịch sử cho mỗi lần đổi lọc).
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getSearch(): string {
  return window.location.search;
}

function getServerSearch(): string {
  return "";
}

/** Đặt / xoá (null) các tham số URL rồi báo cho mọi hook đang nghe. */
export function setUrlParams(updates: Record<string, string | null>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  try {
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // một số môi trường chặn replaceState: bỏ qua, bộ lọc vẫn hoạt động theo lần đọc kế tiếp
  }
  for (const listener of [...listeners]) listener();
}

export function useUrlParams(): {
  params: URLSearchParams;
  set: (updates: Record<string, string | null>) => void;
} {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  const set = useCallback((updates: Record<string, string | null>) => setUrlParams(updates), []);
  return { params: new URLSearchParams(search), set };
}
