import { amplifierScaleScore, detectorSignal } from "@/components/gc-scale";
import { THRESHOLDS } from "@/lib/thresholds";

/** Short note on accounts and in the methodology display section. */
export const ORGANIC_REACH_NOT_GRADED = "Not graded yet — needs 2+ boosts on 2 days.";

/** Full gate, stated once on /methodology. Numbers come from the same thresholds the detector uses. */
export const ORGANIC_REACH_RULE = `Organic reach is graded only when the amplifier signal is ${THRESHOLDS.ampLabel} or higher with at least ${THRESHOLDS.ampMinBoostPosts} boosts on ${THRESHOLDS.ampMinBoostDays} different days; otherwise it reads Not graded yet.`;

/** Withheld organic reach. The same short note covers every failed gate, including a zero-boost skip. */
export function organicReachWithheldDetail(
  _boostPostCount: number,
  _boostDays: number,
  _ampScore: number,
): string {
  return ORGANIC_REACH_NOT_GRADED;
}

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
