"use client";

import { useSyncExternalStore } from "react";
import {
  parseReviewCards,
  scheduleReview,
  type ReviewCards,
  type ReviewRating,
} from "@/lib/lexicon/review-schedule";

const PREFIX = "topikly:vocab-review:v1:";
interface Snapshot {
  cards: ReviewCards;
  persisted: boolean;
  ready: boolean;
}
const EMPTY: Snapshot = { cards: {}, persisted: true, ready: false };
const snapshots = new Map<string, Snapshot>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function readReviewCards(program: string): Snapshot {
  const cached = snapshots.get(program);
  if (cached) return cached;
  let cards: ReviewCards = {};
  let persisted = true;
  try {
    cards = parseReviewCards(JSON.parse(localStorage.getItem(PREFIX + program) ?? "[]"));
  } catch {
    persisted = false;
  }
  const snapshot = { cards, ready: true, persisted };
  snapshots.set(program, snapshot);
  return snapshot;
}

export function rateWord(
  program: string,
  wordId: string,
  rating: ReviewRating,
  now = Date.now(),
): boolean {
  // Merge with disk so reviews made in another tab are preserved, even before its storage event.
  let current = readReviewCards(program).cards;
  try {
    const disk = parseReviewCards(JSON.parse(localStorage.getItem(PREFIX + program) ?? "[]"));
    current = { ...disk, ...current };
    for (const [id, card] of Object.entries(disk))
      if (card.lastReviewedAt > (current[id]?.lastReviewedAt ?? 0)) current[id] = card;
  } catch {
    /* Continue in memory when storage is blocked. */
  }
  const cards = { ...current, [wordId]: scheduleReview(wordId, current[wordId], rating, now) };
  let persisted = true;
  try {
    localStorage.setItem(PREFIX + program, JSON.stringify(Object.values(cards)));
  } catch {
    persisted = false;
  }
  snapshots.set(program, { cards, persisted, ready: true });
  notify();
  return persisted;
}

export function subscribeReviews(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) {
      snapshots.clear();
      notify();
    }
  };
  window.addEventListener("storage", storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", storage);
  };
}

export function useReviewCards(program: string) {
  return useSyncExternalStore(
    subscribeReviews,
    () => readReviewCards(program),
    () => EMPTY,
  );
}
