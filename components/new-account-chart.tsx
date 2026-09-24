import { GcScale } from "@/components/gc-scale";

export type NewAccountRow = {
  shortLabel: string;
  title: string;
  topic: string;
  freshPosts: number;
  youngPosts: number;
  underYearPosts: number;
  postCount: number;
  freshVolumePct: number;
  underYearVolumePct: number;
  freshBoostPosts: number;
  underYearBoostPosts: number;
  freshAccountsDominate: boolean;
  newAccountsDominate: boolean;
};

export function NewAccountChart({ rows }: { rows: NewAccountRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.underYearPosts));
  return (
    <div className="grid min-w-0 gap-4">
      {rows.map((row) => (
        <div key={row.title} className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-sm text-ink">{row.shortLabel}</p>
            <p className="font-mono text-sm text-ink">{row.underYearPosts}</p>
          </div>
          <GcScale
            score={(row.underYearPosts / max) * 100}
            label={row.title}
            graded={false}
            showLabel={false}
            showPercent={false}
            meterMax={max}
            meterNow={row.underYearPosts}
            meterLabel={`${row.title}, ${row.underYearPosts} of ${row.postCount} posts from accounts under 1 year. ${row.freshPosts} under 30 days, ${row.youngPosts} from 30 days to 1 year.`}
            segments={[
              { name: "Under 30 days", value: row.freshPosts, color: "#eb6505" },
              { name: "30 days to 1 year", value: row.youngPosts, color: "#9a9aa3" },
            ]}
          />
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            {row.freshPosts} under 30 days · {row.youngPosts} from 30 days to 1 year · {row.freshVolumePct}% under 30
            days · {row.underYearVolumePct}% under 1 year
            {row.freshAccountsDominate
              ? " · fresh accounts dominate"
              : row.newAccountsDominate
                ? " · new accounts dominate"
                : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
