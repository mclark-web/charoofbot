import type { Metadata } from "next";
import { NarrativeBoard } from "@/components/narrative-board";
import { getReport, liveClock } from "@/lib/corpus";
import { formatWindowLabel } from "@/lib/format";

const clockLabel = formatWindowLabel(liveClock().start, liveClock().end);

export const metadata: Metadata = {
  title: "Narrative watch",
  description: `Which narratives look pushed, not grown. Public X posts in the window ${clockLabel}.`,
};

export default function DashboardPage() {
  return <NarrativeBoard report={getReport()} />;
}
