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
};

const TICK = { fill: "#1c1915", fontSize: 12 };
const AXIS = { stroke: "#d4cbb8" };

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: VolumeRow }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="border border-rule bg-paper-raised px-3 py-2 text-xs shadow-sm">
      <p className="font-serif text-sm text-ink">{row.title}</p>
      <p className="mt-1 font-mono text-ink">
        {row.postCount} posts · {row.accountCount} accounts
      </p>
      <p className="mt-1 text-ink-soft">
        {row.originPosts} origin · {row.clonePosts} clone · {row.boostPosts} amplifier · {row.otherPosts} other
      </p>
    </div>
  );
}

export function VolumeChart({ rows }: { rows: VolumeRow[] }) {
  return (
    <div className="h-[460px] w-full min-w-0">
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
          <Tooltip content={<VolumeTooltip />} cursor={{ fill: "rgba(28, 25, 21, 0.04)" }} />
          <Bar dataKey="originPosts" name="Originator" stackId="volume" fill="#2a3d64" />
          <Bar dataKey="clonePosts" name="Clone speech" stackId="volume" fill="#8c3b30" />
          <Bar dataKey="boostPosts" name="Amplifier" stackId="volume" fill="#1b4a43" />
          <Bar dataKey="otherPosts" name="Other notes" stackId="volume" fill="#b7ad9d">
            <LabelList dataKey="postCount" position="right" fill="#1c1915" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
