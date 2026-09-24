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
  return (
    <div className="border border-rule bg-paper-raised p-4">
      <h3 className="font-serif text-xl text-ink">{label}</h3>
      <GcScale score={score} label="GC Scale" orientation="vertical" signal={signal} />
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}
