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

/**
 * Display-only flip. A graded, finite detector score becomes authenticity.
 * Skips, null, NaN, and negatives are returned unchanged so they stay ungraded
 * instead of becoming 100 STRONG.
 */
export function authenticityFrom(botScore: GradeInput): GradeInput {
  if (typeof botScore !== "number" || !Number.isFinite(botScore) || botScore < 0) return botScore;
  return 100 - botScore;
}

/** Raw detector reading shown beside the authenticity grade. */
export function detectorSignal(kind: "clone" | "amplifier", botScore: GradeInput): string {
  const name = kind === "clone" ? "clone signal" : "amplifier signal";
  if (typeof botScore !== "number" || !Number.isFinite(botScore) || botScore < 0) {
    return `${name} withheld`;
  }
  return `${name} ${formatScorePercent(botScore)}`;
}

/**
 * Grades an authenticity reading. Pass authenticityFrom(detector) first.
 * 70+ STRONG, 40–69 PROVISIONAL, 1–39 WEAK, exact 0 EXIT. Does not change detection.
 */
export function gradeFor(score: GradeInput): GradeKey {
  if (score == null || (typeof score === "string" && UNGRADED_TOKENS.has(score))) return "ungraded";
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) return "ungraded";
  if (score === 0) return "exit";
  const shown = displayScore(score);
  if (shown >= 70) return "strong";
  if (shown < 40) return "weak";
  return "provisional";
}

/** Empty glass for a graded exact zero. Skips stay ungraded and render their own empty glass. */
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
    return <span className="gc-ungraded">Not graded yet</span>;
  }
  return <span className={`grade-pill gc-grade-tag ${key}`}>{GRADE_LABEL[key]}</span>;
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
  signal,
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
  /** Small muted detector reading, for example "clone signal 90%". */
  signal?: string | null;
}) {
  const reading = graded ? authenticityFrom(score) : score;
  const grade = gradeFor(reading);
  const ungraded = grade === "ungraded";
  const orientClass = orientation === "vertical" ? "is-vertical" : "is-horizontal";
  const numeric = typeof reading === "number" && Number.isFinite(reading) && reading >= 0 ? reading : null;
  const shown = numeric === null ? 0 : Math.min(100, Math.max(0, displayScore(numeric)));
  const empty = showsEmptyGlass(reading, graded);
  const percentText = formatScorePercent(numeric);
  const gradeLabel = ungraded ? "Not graded yet" : GRADE_LABEL[grade];
  const spoken = ungraded
    ? "GC Scale, not graded yet"
    : (meterLabel ?? (graded ? `${label} ${percentText}, ${gradeLabel}` : label));
  const style = { "--gc-fill": `${shown}%` } as CSSProperties;
  const liveSegments = (segments ?? []).filter((segment) => segment.value > 0);

  if (ungraded) {
    return (
      <div
        className={`gc-scale is-ungraded is-empty ${orientClass}`}
        role="img"
        aria-label="GC Scale, not graded yet"
      >
        <div className="gc-tube" aria-hidden="true">
          <div className="gc-bloom" aria-hidden="true" />
          <div className="gc-liquid" />
          <div className="gc-meniscus" />
        </div>
        <div className="gc-meta">
          {showLabel ? <div className="gc-label">GC Scale</div> : null}
          <p className="gc-ungraded">Not graded yet</p>
          {signal ? <p className="gc-signal">{signal}</p> : null}
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
            </>
          )}
          <div className="gc-liquid-sheen" />
          <div className="gc-meniscus" />
        </div>
      </div>
      {showLabel || showPercent || graded ? (
        <div className="gc-meta">
          {showLabel ? <div className="gc-label">{label}</div> : null}
          {showPercent ? <div className="gc-pct">{percentText}</div> : null}
          {graded ? <GradePill score={reading} /> : null}
          {signal ? <p className="gc-signal">{signal}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
