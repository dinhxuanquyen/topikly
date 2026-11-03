import type { ProgressRecord } from "@/components/practice/guest-stats";
import type { PracticeSkill } from "./types";

export interface ReviewItem {
  id: string;
  type_code: string;
  skill: PracticeSkill;
  title: string;
}

export function reviewQueue(
  catalog: readonly ReviewItem[],
  progress: readonly ProgressRecord[],
  filter: { mode: "wrong" | "marked"; skill: string; type: string },
): (ReviewItem & { marked: boolean; updatedAt: number })[] {
  const records = new Map(progress.map((row) => [row.questionId, row]));
  return catalog
    .flatMap((item) => {
      const row = records.get(item.id);
      if (
        !row ||
        (filter.mode === "wrong" ? !row.answered || row.lastCorrect !== false : !row.marked)
      )
        return [];
      if (filter.skill && item.skill !== filter.skill) return [];
      if (filter.type && item.type_code !== filter.type) return [];
      return [{ ...item, marked: row.marked, updatedAt: row.updatedAt }];
    })
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
