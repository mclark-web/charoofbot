import type { CSSProperties } from "react";

export type GradeKey = "strong" | "weak" | "provisional" | "exit";

export type TubeSegment = {
  name: string;
  value: number;
  color: string;
};

const GRADE_LABEL: Record<GradeKey, string> = {
  strong: "STRONG",
  weak: "WEAK",
  provisional: "PROVISIONAL",
  exit: "EXIT LIQUIDITY",
};

/** Visual grade only. Does not change the underlying score. */
export function gradeFor(score: number): GradeKey {
  const value = Math.max(0, Math.min(100, score));
  if (value <= 0) return "exit";
  if (value >= 70) return "strong";
  if (value < 40) return "weak";
  return "provisional";
}

export function GradePill({ score }: { score: number }) {
  const key = gradeFor(score);
  return <span className={`grade-pill ${key}`}>{GRADE_LABEL[key]}</span>;
}

export function GcScale({
  score,
  label,
  orientation = "horizontal",
  graded = true,
  showLabel = true,
  showPercent = true,
  meterLabel,
  meterMin = 0,
  meterMax = 100,
  meterNow,
  segments,
}: {
  score: number;
  label: string;
  orientation?: "horizontal" | "vertical";
  graded?: boolean;
  showLabel?: boolean;
  showPercent?: boolean;
  meterLabel?: string;
  meterMin?: number;
  meterMax?: number;
  meterNow?: number;
  segments?: TubeSegment[];
}) {
  const shown = Math.max(0, Math.min(100, score));
  const empty = shown <= 0;
  const grade = gradeFor(shown);
  const gradeLabel = GRADE_LABEL[grade];
  const percentText = Number.isInteger(shown) ? `${shown}%` : `${shown.toFixed(1)}%`;
  const spoken = meterLabel ?? (graded ? `${label} ${percentText}, ${gradeLabel}` : label);
  const style = { "--gc-fill": `${shown}%` } as CSSProperties;
  const liveSegments = (segments ?? []).filter((segment) => segment.value > 0);

  return (
    <div
      className={`gc-scale ${orientation === "vertical" ? "is-vertical" : "is-horizontal"}${empty ? " is-empty" : ""}`}
      style={style}
    >
      <div
        className="gc-tube"
        role="meter"
        aria-label={spoken}
        aria-valuemin={meterMin}
        aria-valuemax={meterMax}
        aria-valuenow={meterNow ?? shown}
        aria-valuetext={spoken}
      >
        <div className="gc-bloom" aria-hidden="true" />
        <div className={`gc-liquid${liveSegments.length > 0 ? " gc-segments" : ""}`}>
          {liveSegments.length > 0 ? (
            liveSegments.map((segment) => (
              <span key={segment.name} style={{ flexGrow: segment.value, backgroundColor: segment.color }} />
            ))
          ) : (
            <>
              <div className="gc-liquid-core" />
              <div className="gc-swirl" aria-hidden="true">
                <div className="tex" />
              </div>
              <div className="gc-liquid-sheen" />
            </>
          )}
          <div className="gc-meniscus" />
        </div>
      </div>
      {showLabel || showPercent || graded ? (
        <div className="gc-meta">
          {showLabel ? <div className="gc-label">{label}</div> : null}
          {showPercent ? <div className="gc-pct">{percentText}</div> : null}
          {graded ? <GradePill score={shown} /> : null}
        </div>
      ) : null}
    </div>
  );
}
