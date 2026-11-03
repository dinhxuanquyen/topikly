import type { Metadata } from "next";
import { requireProgram } from "@/components/config/route-guards";
import { ProgressPageContent } from "@/components/progress/progress-page";

export const instant = false;
export const metadata: Metadata = { title: "Tiến bộ của tôi" };
export default async function ProgressPage({ params }: { params: Promise<{ program: string }> }) {
  return <ProgressPageContent program={requireProgram((await params).program)} />;
}
