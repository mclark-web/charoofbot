import Link from "next/link";
import { liveClock } from "@/lib/corpus";
import { formatWindowLabel } from "@/lib/format";

export function SiteFooter() {
  const windowLabel = formatWindowLabel(liveClock().start, liveClock().end);
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-ink-soft md:px-8">
        <p>Built for accountability in an age of market fomo, prediction craze, and loud anonymous voices.</p>
        <p>
          GCBot is a GradedCalls product. Real public X posts for {windowLabel}, plus a paste bench. No live
          firehose, no API key, no paid database. Grades are not for sale and are not investment advice.
        </p>
        <p>
          <Link href="/methodology" className="tap underline decoration-rule underline-offset-4 hover:decoration-ink">
            Read the methodology
          </Link>{" "}
          before treating a label as a finding.
        </p>
      </div>
    </footer>
  );
}
