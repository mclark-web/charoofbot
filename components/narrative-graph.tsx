import type { NarrativeEdge, NarrativeVolume } from "@/lib/types";

const WIDTH = 680;
const HEIGHT = 640;
const CX = 340;
const CY = 312;
const ORBIT = 198;

export function NarrativeGraph({
  nodes,
  edges,
}: {
  nodes: NarrativeVolume[];
  edges: NarrativeEdge[];
}) {
  const placed = nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / nodes.length;
    const radius = 16 + Math.sqrt(node.postCount) * 8;
    return {
      ...node,
      radius,
      x: CX + Math.cos(angle) * ORBIT,
      y: CY + Math.sin(angle) * ORBIT,
      lx: CX + Math.cos(angle) * (ORBIT + 58),
      ly: CY + Math.sin(angle) * (ORBIT + 46),
      anchor: (Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle") as
        | "start"
        | "end"
        | "middle",
    };
  });
  const byId = new Map(placed.map((node) => [node.id, node]));
  const visibleEdges = edges.filter((edge) => edge.sharedAccounts >= 2);
  const titles = new Map(nodes.map((node) => [node.id, node.shortLabel]));

  return (
    <div className="min-w-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="hidden h-auto w-full max-w-full md:block"
        role="img"
        aria-labelledby="sewing-graph-title sewing-graph-desc"
      >
        <title id="sewing-graph-title">Narrative sewing graph</title>
        <desc id="sewing-graph-desc">
          Each node is a narrative. Node area follows post volume. A line means at least two accounts posted in both
          narratives. A ring means new accounts, under 30 days or under 1 year, supply at least half of that
          narrative&apos;s posts.
        </desc>
        {visibleEdges.map((edge) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#9a9aa3"
              strokeOpacity={0.28 + Math.min(0.45, edge.sharedAccounts * 0.08)}
              strokeWidth={1 + edge.sharedAccounts * 0.7}
            />
          );
        })}
        {placed.map((node) => {
          const ring = node.age.freshAccountsDominate ? "#ee9a44" : node.age.newAccountsDominate ? "#9a9aa3" : null;
          return (
            <g key={node.id}>
              {ring ? (
                <circle cx={node.x} cy={node.y} r={node.radius + 5} fill="none" stroke={ring} strokeWidth={2.5} />
              ) : null}
              <circle cx={node.x} cy={node.y} r={node.radius} fill="#eb6505" fillOpacity={0.95} />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                fill="#f2f1ee"
                fontSize="13"
                fontFamily="IBM Plex Mono, ui-monospace, monospace"
              >
                {node.postCount}
              </text>
              <text
                x={node.lx}
                y={node.ly}
                textAnchor={node.anchor}
                fill="#f2f1ee"
                fontSize="13"
                fontFamily="Source Serif 4, Georgia, serif"
              >
                {node.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="grid gap-3 md:hidden">
        {nodes.map((node) => (
          <li key={node.id} className="border border-rule bg-inset px-3 py-3 text-sm text-ink">
            <p className="font-serif text-base">{node.shortLabel}</p>
            <p className="mt-1 text-ink-soft">
              {node.postCount} posts
              {node.age.freshAccountsDominate
                ? " · orange ring, under 30 days dominate"
                : node.age.newAccountsDominate
                  ? " · muted ring, under 1 year dominates"
                  : ""}
            </p>
          </li>
        ))}
      </ul>
      {visibleEdges.length > 0 ? (
        <ul className="mt-4 grid gap-2 md:hidden">
          {visibleEdges.map((edge) => (
            <li key={`${edge.source}-${edge.target}`} className="text-sm text-ink-soft">
              {titles.get(edge.source)} shares {edge.sharedAccounts} accounts with {titles.get(edge.target)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
