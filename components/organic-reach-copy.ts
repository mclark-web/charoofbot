import { amplifierScaleScore, detectorSignal } from "@/components/gc-scale";
import { THRESHOLDS } from "@/lib/thresholds";

/**
 * Short note on account meters, the paste bench, and the methodology display section.
 * Names every part of passesAmplifierGate: boosts, days, and signal.
 */
export const ORGANIC_REACH_NOT_GRADED = `Not graded yet — needs ${THRESHOLDS.ampMinBoostPosts}+ boosts on ${THRESHOLDS.ampMinBoostDays} days and a signal of ${THRESHOLDS.ampLabel}+.`;

/** Full gate, stated once on /methodology. Numbers come from the same thresholds the detector uses. */
export const ORGANIC_REACH_RULE = `Organic reach is graded only when the amplifier signal is ${THRESHOLDS.ampLabel} or higher with at least ${THRESHOLDS.ampMinBoostPosts} boosts on ${THRESHOLDS.ampMinBoostDays} different days; otherwise it reads Not graded yet.`;

/**
 * Muted line beside an ungraded or graded organic-reach meter.
 * "signal withheld" is only the zero-boost skip. A computed signal that fails
 * the gate says "organic reach withheld".
 */
export function organicReachMutedNote(boostPostCount: number, ampScore: number, boostDays: number): string {
  const scale = amplifierScaleScore(boostPostCount, ampScore, boostDays);
  if (typeof scale === "number") return detectorSignal("amplifier", scale);
  if (boostPostCount === 0) return "amplifier signal withheld";
  return "organic reach withheld";
}
