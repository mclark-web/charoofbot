import type { NarrativeEdge, NarrativeVolume } from "@/lib/types";

const WIDTH = 680;
const HEIGHT = 640;
const CX = 340;
const CY = 312;
const ORBIT = 198;
const FONT_SIZE = 13;
const DESCENDER = 4;
const LABEL_GAP = 8;
const RING_PAD = 5;
const RING_STROKE = 2.5;
const EDGE_PAD = 4;

type LabelBox = { x: number; y: number; w: number; h: number };

function textWidth(label: string) {
  return Math.ceil(label.length * 7.2);
}

function boxesOverlap(a: LabelBox, b: LabelBox, pad = 4) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function circleHitsBox(cx: number, cy: number, radius: number, box: LabelBox) {
  const nearestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const nearestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function segmentHitsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  padding: number,
  box: LabelBox,
) {
  const left = box.x - padding;
  const top = box.y - padding;
  const right = box.x + box.w + padding;
  const bottom = box.y + box.h + padding;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const steps = Math.ceil(length / 4);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    if (x >= left && x <= right && y >= top && y <= bottom) return true;
  }
  return false;
}

export function NarrativeGraph({
  nodes,
  edges,
}: {
  nodes: NarrativeVolume[];
  edges: NarrativeEdge[];
}) {
  const placed = nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(nodes.length, 1);
    const radius = 16 + Math.sqrt(node.postCount) * 8;
    const hasRing = node.age.freshAccountsDominate || node.age.newAccountsDominate;
    const outer = radius + (hasRing ? RING_PAD + RING_STROKE / 2 : 0);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const width = textWidth(node.shortLabel);
    const anchor = (Math.abs(cos) < 0.45 ? "middle" : cos > 0 ? "start" : "end") as "start" | "end" | "middle";
    let lx = CX + cos * ORBIT;
    let ly = CY + sin * ORBIT;
    if (anchor === "middle" && sin < 0) {
      lx = CX + cos * ORBIT;
      ly = CY + sin * ORBIT - (outer + LABEL_GAP + DESCENDER);
    } else if (anchor === "middle") {
      lx = CX + cos * ORBIT;
      ly = CY + sin * ORBIT + outer + LABEL_GAP + FONT_SIZE;
    } else if (anchor === "start") {
      lx = CX + cos * ORBIT + outer + LABEL_GAP;
      ly = CY + sin * ORBIT + FONT_SIZE * 0.35;
    } else {
      lx = CX + cos * ORBIT - (outer + LABEL_GAP);
      ly = CY + sin * ORBIT + FONT_SIZE * 0.35;
    }
    return {
      ...node,
      radius,
      hasRing,
      outer,
      cos,
      sin,
      width,
      x: CX + cos * ORBIT,
      y: CY + sin * ORBIT,
      lx,
      ly,
      anchor,
    };
  });

  const boxFor = (node: (typeof placed)[number]): LabelBox => {
    const height = FONT_SIZE + DESCENDER;
    const top = node.ly - FONT_SIZE;
    if (node.anchor === "start") return { x: node.lx, y: top, w: node.width, h: height };
    if (node.anchor === "end") return { x: node.lx - node.width, y: top, w: node.width, h: height };
    return { x: node.lx - node.width / 2, y: top, w: node.width, h: height };
  };

  const shift = (node: (typeof placed)[number], dx: number, dy: number) => {
    node.lx += dx;
    node.ly += dy;
  };

  for (const node of placed) {
    let box = boxFor(node);
    if (box.x < EDGE_PAD) shift(node, EDGE_PAD - box.x, 0);
    box = boxFor(node);
    if (box.x + box.w > WIDTH - EDGE_PAD) shift(node, WIDTH - EDGE_PAD - (box.x + box.w), 0);
    box = boxFor(node);
    if (box.y < EDGE_PAD) shift(node, 0, EDGE_PAD - box.y);
    box = boxFor(node);
    if (box.y + box.h > HEIGHT - EDGE_PAD) shift(node, 0, HEIGHT - EDGE_PAD - (box.y + box.h));
  }

  const edgeSegments = edges
    .filter((edge) => edge.sharedAccounts >= 2)
    .map((edge) => {
      const source = placed.find((node) => node.id === edge.source);
      const target = placed.find((node) => node.id === edge.target);
      if (!source || !target) return null;
      return {
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
        pad: 1 + edge.sharedAccounts * 0.7,
      };
    })
    .filter((edge): edge is { x1: number; y1: number; x2: number; y2: number; pad: number } => edge !== null);

  for (let pass = 0; pass < 24; pass += 1) {
    let moved = false;
    for (const node of placed) {
      let box = boxFor(node);
      const blocked =
        circleHitsBox(node.x, node.y, node.outer + LABEL_GAP, box) ||
        placed.some((other) => other !== node && boxesOverlap(box, boxFor(other))) ||
        edgeSegments.some((edge) => segmentHitsBox(edge.x1, edge.y1, edge.x2, edge.y2, edge.pad, box));
      if (!blocked) continue;
      const beforeX = node.lx;
      const beforeY = node.ly;
      shift(node, node.cos * 3, node.sin * 3);
      box = boxFor(node);
      if (box.x < EDGE_PAD || box.x + box.w > WIDTH - EDGE_PAD || box.y < EDGE_PAD || box.y + box.h > HEIGHT - EDGE_PAD) {
        node.lx = beforeX;
        node.ly = beforeY;
        shift(node, -node.sin * 3, node.cos * 3);
      }
      if (node.lx !== beforeX || node.ly !== beforeY) moved = true;
    }
    if (!moved) break;
  }
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
              <circle cx={node.x} cy={node.y} r={node.radius} fill="#eb6505" />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                fill="#1a1005"
                fontSize="13"
                fontFamily="IBM Plex Mono, ui-monospace, monospace"
              >
                {node.postCount}
              </text>
              <text
                x={node.lx}
                y={node.ly}
                textAnchor={node.anchor}
                dominantBaseline="auto"
                fill="#f2f1ee"
                fontSize={FONT_SIZE}
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
