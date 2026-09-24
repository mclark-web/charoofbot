import type { CSSProperties } from "react";

export type GradeKey = "strong" | "weak" | "provisional" | "exit" | "ungraded";

/** Values that are not a graded score. `0` is not in this set: a finite exact 0 is EXIT. */
export type UngradedToken = "open" | "withheld" | "skip";

export type GradeInput = number | null | undefined | UngradedToken;

export type TubeSegment = {
  name: string;
  value: number;
  color: string;
};

const GRADE_LABEL: Record<Exclude<GradeKey, "ungraded">, string> = {
  strong: "STRONG",
  weak: "WEAK",
  provisional: "PROVISIONAL",
  exit: "EXIT LIQUIDITY",
};

const UNGRADED_TOKENS = new Set<string>(["open", "withheld", "skip"]);

/**
 * Truncate toward zero to one decimal.
 * 39.95 stays 39.9 so the printed percent cannot round up into the next band.
 */
export function displayScore(score: number): number {
  const sign = score < 0 ? -1 : 1;
  const tenths = Math.floor(Math.abs(score) * 10 + 1e-9);
  return (sign * tenths) / 10;
}

export function formatScorePercent(score: GradeInput): string {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) return "—";
  const shown = Math.min(100, Math.max(0, displayScore(score)));
  return Number.isInteger(shown) ? `${shown}%` : `${shown.toFixed(1)}%`;
}

/** Visual grade only. Does not change the underlying score. */
export function gradeFor(score: GradeInput): GradeKey {
  if (score == null || (typeof score === "string" && UNGRADED_TOKENS.has(score))) return "ungraded";
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) return "ungraded";
  if (score === 0) return "exit";
  const shown = displayScore(score);
  if (shown >= 70) return "strong";
  if (shown < 40) return "weak";
  return "provisional";
}

/** Empty glass is a graded exact zero. Skips, negatives, and ungraded tubes are not empty glasses. */
export function showsEmptyGlass(score: GradeInput, graded = true): boolean {
  return graded === true && typeof score === "number" && Number.isFinite(score) && score === 0;
}

/**
 * A zero amplifier score with no boosts is the skip in detect.ts, not a graded exit.
 * Scoring itself is unchanged; only the scale input is.
 */
export function amplifierScaleScore(boostPostCount: number, ampScore: number): GradeInput {
  if (boostPostCount === 0) return "skip";
  return ampScore;
}

export function GradePill({ score }: { score: GradeInput }) {
  const key = gradeFor(score);
  if (key === "ungraded") {
    return <span className="gc-ungraded">— Ungraded</span>;
  }
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
  score: GradeInput;
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
  const grade = gradeFor(score);
  const ungraded = grade === "ungraded";
  const orientClass = orientation === "vertical" ? "is-vertical" : "is-horizontal";
  const numeric = typeof score === "number" && Number.isFinite(score) && score >= 0 ? score : null;
  const shown = numeric === null ? 0 : Math.min(100, Math.max(0, displayScore(numeric)));
  const empty = showsEmptyGlass(score, graded);
  const percentText = formatScorePercent(numeric);
  const gradeLabel = ungraded ? "Ungraded" : GRADE_LABEL[grade];
  const spoken =
    meterLabel ??
    (ungraded ? `${label} Ungraded` : graded ? `${label} ${percentText}, ${gradeLabel}` : label);
  const style = { "--gc-fill": `${shown}%` } as CSSProperties;
  const liveSegments = (segments ?? []).filter((segment) => segment.value > 0);

  if (ungraded) {
    return (
      <div className={`gc-scale is-ungraded ${orientClass}`}>
        <div className="gc-meta">
          {showLabel ? <div className="gc-label">{label}</div> : null}
          <p className="gc-ungraded" aria-label={spoken}>
            <span aria-hidden="true">— </span>
            Ungraded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`gc-scale ${orientClass}${empty ? " is-empty" : ""}`} style={style}>
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
          {graded ? <GradePill score={score} /> : null}
        </div>
      ) : null}
    </div>
  );
}
