import { GcScale } from "@/components/gc-scale";

export type VolumeRow = {
  shortLabel: string;
  title: string;
  topic: string;
  postCount: number;
  accountCount: number;
  originPosts: number;
  clonePosts: number;
  boostPosts: number;
  otherPosts: number;
  freshPosts: number;
  underYearPosts: number;
  freshVolumePct: number;
  underYearVolumePct: number;
};

const SEGMENTS = [
  { key: "originPosts", name: "Originator", color: "#ee9a44" },
  { key: "clonePosts", name: "Clone speech", color: "#eb6505" },
  { key: "boostPosts", name: "Amplifier", color: "#9a9aa3" },
  { key: "otherPosts", name: "Other notes", color: "#3a3e48" },
] as const;

export function VolumeChart({ rows }: { rows: VolumeRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.postCount));
  return (
    <div className="grid min-w-0 gap-4">
      {rows.map((row) => (
        <div key={row.title} className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-sm text-ink">{row.shortLabel}</p>
            <p className="font-mono text-sm text-ink">{row.postCount}</p>
          </div>
          <GcScale
            score={(row.postCount / max) * 100}
            label={row.title}
            graded={false}
            showLabel={false}
            showPercent={false}
            meterMax={max}
            meterNow={row.postCount}
            meterLabel={`${row.title}, ${row.postCount} posts. ${row.originPosts} origin, ${row.clonePosts} clone, ${row.boostPosts} amplifier, ${row.otherPosts} other.`}
            segments={SEGMENTS.map((segment) => ({
              name: segment.name,
              value: row[segment.key],
              color: segment.color,
            }))}
          />
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            {row.originPosts} origin · {row.clonePosts} clone · {row.boostPosts} amplifier · {row.otherPosts} other ·{" "}
            {row.freshVolumePct}% under 30 days · {row.underYearVolumePct}% under 1 year
          </p>
        </div>
      ))}
    </div>
  );
}
