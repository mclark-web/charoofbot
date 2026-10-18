import { formatScorePercent, GcScale } from "@/components/gc-scale";
import { NO_POSTS_LINE, THIN_SAMPLE_LINE } from "@/lib/sample-copy";
import type { AccountReport } from "@/lib/types";

/** One authenticity reading: 100 − the copy score. The tube flips that detector signal. */
export function HeadlineScale({
  account,
  orientation = "horizontal",
}: {
  account: AccountReport;
  orientation?: "horizontal" | "vertical";
}) {
  if (!account.graded) {
    return (
      <div className="min-w-0">
        <h3 className="font-serif text-lg text-ink">GC score</h3>
        <p className="gc-ungraded mt-2">
          {account.postCount === 0 ? NO_POSTS_LINE : THIN_SAMPLE_LINE}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <h3 className="font-serif text-lg text-ink">GC score</h3>
      <GcScale
        score={account.cloneScore}
        label="GC Scale"
        orientation={orientation}
        signal={`copy ${formatScorePercent(account.cloneScore)}`}
      />
    </div>
  );
}
