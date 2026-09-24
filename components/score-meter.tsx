import { GcScale } from "@/components/gc-scale";

export function ScoreMeter({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail: string;
}) {
  const scaleLabel = `GC Scale · ${label}`;
  return (
    <div className="border border-rule bg-paper-raised p-4">
      <GcScale score={score} label={scaleLabel} orientation="vertical" />
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}
