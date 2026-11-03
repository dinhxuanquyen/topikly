import type { Metadata } from "next";
import { DEFAULT_PROGRAM } from "@/components/config/programs";
import { ProgressPageContent } from "@/components/progress/progress-page";

export const metadata: Metadata = { title: "Tiến bộ của tôi" };

export default function AccountPage() {
  return <ProgressPageContent program={DEFAULT_PROGRAM} />;
}
