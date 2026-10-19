import { BookOpen, ClipboardList, Gem, PenLine, Route, type LucideIcon } from "lucide-react";
import type { PillarKey } from "@/components/config/pillars";

export const PILLAR_ICONS: Record<PillarKey, LucideIcon> = {
  theory: BookOpen,
  roadmap: Route,
  practice: PenLine,
  exams: ClipboardList,
  upgrade: Gem,
};
