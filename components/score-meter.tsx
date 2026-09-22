export function ScoreMeter({
  label,
  score,
  tone,
  detail,
}: {
  label: string;
  score: number;
  tone: "clone" | "amp";
  detail: string;
}) {
  const width = `${Math.max(0, Math.min(100, score))}%`;
  return (
    <div className="border border-rule bg-paper-raised p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="kicker">{label}</h3>
        <p className="font-mono text-3xl leading-none text-ink">{score}</p>
      </div>
      <div
        className="mt-3 h-2 bg-rule"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div className={tone === "clone" ? "h-full bg-vermilion" : "h-full bg-lab"} style={{ width }} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}
