import type { DiffOp } from "@/lib/diff";

const STYLES = {
  eq: "text-ink",
  del: "text-ink-soft line-through decoration-ink-soft/70",
  ins: "bg-vermilion-soft text-vermilion",
} as const;

export function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <p className="font-mono text-xs leading-7 text-ink">
      {ops.map((op, index) => (
        <span key={`${op.type}-${index}`} className={STYLES[op.type]}>
          {op.text}{" "}
        </span>
      ))}
    </p>
  );
}
