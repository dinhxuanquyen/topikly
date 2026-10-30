"use client";

import { useSyncExternalStore } from "react";
import { parsePlan, type StudyPlan } from "@/lib/planner/plan";

const PREFIX = "topikly:study-plan:v1:";
interface Snapshot {
  plan: StudyPlan | null;
  persisted: boolean;
  ready: boolean;
}
const EMPTY: Snapshot = { plan: null, persisted: true, ready: false };
const snapshots = new Map<string, Snapshot>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function readPlan(program: string): Snapshot {
  const cached = snapshots.get(program);
  if (cached) return cached;
  let plan: StudyPlan | null = null;
  try {
    const raw = localStorage.getItem(PREFIX + program);
    if (raw) plan = parsePlan(JSON.parse(raw), program);
  } catch {
    /* Trình duyệt chặn lưu trữ hoặc dữ liệu hỏng: vẫn cho lập kế hoạch. */
  }
  const snapshot = { plan, persisted: true, ready: true };
  snapshots.set(program, snapshot);
  return snapshot;
}

/** Chỉ cập nhật sau thao tác người học; ghi đồng bộ để tải lại ngay không mất thay đổi. */
export function writePlan(program: string, plan: StudyPlan): boolean {
  if (!parsePlan(plan, program)) return false;
  let persisted = true;
  try {
    localStorage.setItem(PREFIX + program, JSON.stringify(plan));
  } catch {
    persisted = false;
  }
  snapshots.set(program, { plan, persisted, ready: true });
  notify();
  return persisted;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) {
      snapshots.clear();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStudyPlan(program: string): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => readPlan(program),
    () => EMPTY,
  );
}
