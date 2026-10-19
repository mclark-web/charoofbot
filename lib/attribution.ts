import type { PostAction } from "./types";
import { isRecognizedNewsOutlet } from "./wires";

export type CreditKind = "handle" | "outlet" | "tip";

export type SourceCredit = {
  kind: CreditKind;
  /** Handle or outlet name, without a leading @ or #. Empty for a bare h/t. */
  name: string;
};

const HANDLE = "([A-Za-z0-9_]+)";
// Stop at sentence punctuation. A period is not part of the name, so
// "per Reuters. When asked" is Reuters and not "Reuters. When".
const OUTLET = "([A-Z][A-Za-z0-9&'’]*(?:\\s+[A-Z][A-Za-z0-9&'’]*){0,3})";

/**
 * Credits that can zero clone weight on this post alone.
 * via @handle and Source: @handle name an account. per / via / Source: / 출처: plus an
 * outlet name is syndication. h/t counts only when a handle or outlet follows it.
 * A bare h/t gives no credit. "via the market" and "per share" do not match.
 * A quote action is not a credit. The outlet token stops at '.', ',', ';', ':',
 * a newline, or the end of the text. "출처:" matches anywhere in the text.
 * Share buttons ("… - CNBC", "CNBC- …") and a bracket tag ("[CNBC]") count only
 * for a recognized news outlet. per, via, and the dash form name the same outlet.
 */
export function extractCredits(text: string): SourceCredit[] {
  const credits: SourceCredit[] = [];
  const seen = new Set<string>();
  const add = (kind: CreditKind, name: string) => {
    const cleaned = name
      .replace(/^[@#]+/, "")
      .replace(/[.,;:]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = `${kind}:${cleaned.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    credits.push({ kind, name: cleaned });
  };

  for (const match of text.matchAll(new RegExp(`\\bvia\\s+@${HANDLE}`, "gi"))) add("handle", match[1]);
  for (const match of text.matchAll(new RegExp(`\\bSource:\\s*@${HANDLE}`, "gi"))) add("handle", match[1]);
  for (const match of text.matchAll(new RegExp(`\\bvia\\s+${OUTLET}`, "g"))) add("outlet", match[1]);
  for (const match of text.matchAll(new RegExp(`\\bper\\s+@?#?${OUTLET}`, "g"))) add("outlet", match[1]);
  for (const match of text.matchAll(new RegExp(`\\bSource:\\s+${OUTLET}`, "g"))) add("outlet", match[1]);
  for (const match of text.matchAll(new RegExp(`출처\\s*[:：]\\s*@?${OUTLET}`, "g"))) add("outlet", match[1]);
  for (const match of text.matchAll(new RegExp(`\\bh\\s*\\/\\s*t\\s+@${HANDLE}`, "gi"))) add("tip", match[1]);
  for (const match of text.matchAll(new RegExp(`\\bh\\s*\\/\\s*t\\s+${OUTLET}`, "g"))) add("tip", match[1]);
  // "headline - CNBC" and "CNBC- headline" are the share-button credit.
  for (const match of text.matchAll(
    new RegExp(`(?:^|\\s)[-–—]\\s+${OUTLET}(?=\\s|$|[.,;:])`, "g"),
  )) {
    if (isRecognizedNewsOutlet(match[1])) add("outlet", match[1]);
  }
  for (const match of text.matchAll(new RegExp(`^${OUTLET}[-–—]\\s+`, "g"))) {
    if (isRecognizedNewsOutlet(match[1])) add("outlet", match[1]);
  }
  for (const match of text.matchAll(new RegExp(`\\[${OUTLET}\\]`, "g"))) {
    if (isRecognizedNewsOutlet(match[1])) add("outlet", match[1]);
  }
  return credits;
}

export function textCreditsSource(text: string): boolean {
  return extractCredits(text).length > 0;
}

/** Explicit credit or a named outlet credit. A quote is not credit, and a repost is excluded upstream. */
export function isAttributedRepost(text: string, action?: PostAction): boolean {
  return action !== "repost" && textCreditsSource(text);
}

/** via @handle or Source: @handle. These remove clone weight. */
export function hasExplicitHandleCredit(text: string): boolean {
  return extractCredits(text).some((credit) => credit.kind === "handle" || credit.kind === "tip");
}
