import type { PostAction } from "./types";

export type CreditKind = "handle" | "outlet" | "tip";

export type SourceCredit = {
  kind: CreditKind;
  /** Handle or outlet name, without a leading @ or #. Empty for a bare h/t. */
  name: string;
};

const HANDLE = "([A-Za-z0-9_]+)";
const OUTLET = "([A-Z][A-Za-z0-9&.'’.-]*(?:\\s+[A-Z][A-Za-z0-9&.'’.-]*){0,3})";

/**
 * Credits that mean the words are not presented as original.
 * via @handle and Source: @handle are explicit. per / via / Source: / 출처: plus an
 * outlet name is attributed syndication. h/t is a tip with no named outlet.
 * "via the market" and "per share" do not match. A quote action is not a credit.
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
  for (const match of text.matchAll(/출처\s*[:：]\s*@?([^\n\r]+)/g)) add("outlet", match[1]);
  if (/\bh\s*\/\s*t\b/i.test(text)) add("tip", "");
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
