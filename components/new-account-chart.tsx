"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const TICK = { fill: "#1c1915", fontSize: 12 };
const AXIS = { stroke: "#d4cbb8" };

function NewAccountTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: NewAccountRow }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="border border-rule bg-paper-raised px-3 py-2 text-xs shadow-sm">
      <p className="font-serif text-sm text-ink">{row.title}</p>
      <p className="mt-1 font-mono text-ink">
        {row.underYearPosts} of {row.postCount} posts from accounts under 1 year
      </p>
      <p className="mt-1 text-ink-soft">
        {row.freshPosts} under 30 days · {row.youngPosts} from 30 days to 1 year
      </p>
      <p className="mt-1 text-ink-soft">
        {row.underYearBoostPosts} amplifier posts from accounts under 1 year ({row.freshBoostPosts} of them under 30
        days)
      </p>
      <p className="mt-1 text-ink-soft">
        {row.freshVolumePct}% under 30 days · {row.underYearVolumePct}% under 1 year
        {row.freshAccountsDominate
          ? " · fresh accounts dominate"
          : row.newAccountsDominate
            ? " · new accounts dominate"
            : ""}
      </p>
    </div>
  );
}

export function NewAccountChart({ rows }: { rows: NewAccountRow[] }) {
  return (
    <div className="h-[460px] w-full min-w-0 max-w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="#d4cbb8" />
          <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={AXIS} tickLine={false} />
          <YAxis
            type="category"
            dataKey="shortLabel"
            width={148}
            tick={TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<NewAccountTooltip />} cursor={{ fill: "rgba(28, 25, 21, 0.04)" }} />
          <Bar dataKey="freshPosts" name="Under 30 days" stackId="age" fill="#6e2f4a" />
          <Bar dataKey="youngPosts" name="30 days to 1 year" stackId="age" fill="#9a6b2f">
            <LabelList dataKey="underYearPosts" position="right" fill="#1c1915" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
