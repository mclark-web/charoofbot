import { amplifierScaleScore, detectorSignal } from "@/components/gc-scale";
import { THRESHOLDS } from "@/lib/thresholds";

/** Withheld-gate explanation. Numbers come from the same thresholds the detector uses. */
export const ORGANIC_REACH_RULE = `Organic reach is graded only when the amplifier signal is ${THRESHOLDS.ampLabel} or higher with at least ${THRESHOLDS.ampMinBoostPosts} boosts on ${THRESHOLDS.ampMinBoostDays} different days; otherwise it reads Not graded yet.`;

/**
 * Facts for this account, then which part of the gate failed, then the rule.
 * A zero-boost skip has no computed signal, so the note does not print 0%.
 */
export function organicReachWithheldDetail(boostPostCount: number, boostDays: number, ampScore: number): string {
  const signalComputed = boostPostCount > 0;
  const missed: string[] = [];
  if (signalComputed && !(ampScore >= THRESHOLDS.ampLabel)) {
    missed.push(`amplifier signal ${ampScore} is under ${THRESHOLDS.ampLabel}`);
  }
  if (boostPostCount < THRESHOLDS.ampMinBoostPosts) {
    missed.push(
      `${boostPostCount} boost${boostPostCount === 1 ? "" : "s"} is under ${THRESHOLDS.ampMinBoostPosts}`,
    );
  }
  if (boostDays < THRESHOLDS.ampMinBoostDays) {
    missed.push(
      `${boostDays} day${boostDays === 1 ? "" : "s"} is under ${THRESHOLDS.ampMinBoostDays} different days`,
    );
  }
  const signalText = signalComputed ? `amplifier signal ${ampScore}%` : "amplifier signal not computed";
  const facts = `${boostPostCount} boost${boostPostCount === 1 ? "" : "s"} across ${boostDays} day${boostDays === 1 ? "" : "s"}, ${signalText}.`;
  const which = missed.length > 0 ? ` Failed: ${missed.join("; ")}.` : "";
  return `${facts}${which} ${ORGANIC_REACH_RULE}`;
}

/**
 * Muted line beside an ungraded or graded organic-reach meter.
 * "signal withheld" is only the zero-boost skip. A computed signal that fails
 * the gate says "organic reach withheld" and leaves the number to the note.
 */
export function organicReachMutedNote(boostPostCount: number, ampScore: number, boostDays: number): string {
  const scale = amplifierScaleScore(boostPostCount, ampScore, boostDays);
  if (typeof scale === "number") return detectorSignal("amplifier", scale);
  if (boostPostCount === 0) return "amplifier signal withheld";
  return "organic reach withheld";
}
