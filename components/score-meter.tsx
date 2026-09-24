import { GcScale, type GradeInput } from "@/components/gc-scale";

export function ScoreMeter({
  label,
  score,
  detail,
  signal,
}: {
  label: string;
  score: GradeInput;
  detail: string;
  signal?: string | null;
}) {
  const scaleLabel = `GC Scale · ${label}`;
  return (
    <div className="border border-rule bg-paper-raised p-4">
      <GcScale score={score} label={scaleLabel} orientation="vertical" signal={signal} />
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}
