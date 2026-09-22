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

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-labelledby="sewing-graph-title sewing-graph-desc">
      <title id="sewing-graph-title">Narrative sewing graph</title>
      <desc id="sewing-graph-desc">
        Each node is a narrative. Node area follows post volume. A line means at least two accounts posted in both narratives.
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
            stroke="#1b4a43"
            strokeOpacity={0.18 + Math.min(0.55, edge.sharedAccounts * 0.1)}
            strokeWidth={1 + edge.sharedAccounts * 0.7}
          />
        );
      })}
      {placed.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r={node.radius} fill="#8c3b30" fillOpacity={0.9} />
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fill="#fbf8f1"
            fontSize="11"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            {node.postCount}
          </text>
          <text
            x={node.lx}
            y={node.ly}
            textAnchor={node.anchor}
            fill="#1c1915"
            fontSize="12"
            fontFamily="Source Serif 4, Georgia, serif"
          >
            {node.shortLabel}
          </text>
        </g>
      ))}
    </svg>
  );
}
