import { formatScorePercent, GcScale } from "@/components/gc-scale";
import type { AccountReport } from "@/lib/types";

/** One authenticity reading: 100 − max(copy score, amplifier score). The tube flips the detector max. */
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
        <p className="gc-ungraded mt-2">thin sample / not graded yet</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <h3 className="font-serif text-lg text-ink">GC score</h3>
      <GcScale
        score={Math.max(account.cloneScore, account.ampScore)}
        label="GC Scale"
        orientation={orientation}
        signal={`copy ${formatScorePercent(account.cloneScore)} · amplifier ${formatScorePercent(account.ampScore)}`}
      />
    </div>
  );
}
