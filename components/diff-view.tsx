import type { DiffOp } from "@/lib/diff";

const STYLES = {
  eq: "text-ink",
  del: "bg-vermilion-soft text-vermilion line-through decoration-vermilion/70",
  ins: "bg-lab-soft text-lab",
} as const;

export function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <p className="font-mono text-[13px] leading-7 text-ink">
      {ops.map((op, index) => (
        <span key={`${op.type}-${index}`} className={STYLES[op.type]}>
          {op.text}{" "}
        </span>
      ))}
    </p>
  );
}
