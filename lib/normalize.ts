const URL_RE = /https?:\/\/\S+|www\.\S+/gi;
const MENTION_RE = /@[a-z0-9_]+/gi;
const CASHTAG_RE = /\$[a-z]{1,6}\b/gi;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D/gu;
const NON_WORD_RE = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE_RE = /\s+/g;
const RT_RE = /^rt\s+@[a-z0-9_]+\s*:\s*/i;

export function peelRetweet(raw: string): { body: string; isRetweet: boolean } {
  const trimmed = raw.trim();
  const match = trimmed.match(RT_RE);
  if (!match) return { body: raw, isRetweet: false };
  return { body: trimmed.slice(match[0].length), isRetweet: true };
}

/** Lowercase, then strip URLs, @handles, cashtags, emoji, punctuation, and extra space. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(URL_RE, " ")
    .replace(MENTION_RE, " ")
    .replace(CASHTAG_RE, " ")
    .replace(EMOJI_RE, " ")
    .replace(NON_WORD_RE, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

export function tokensOf(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split(" ");
}

export function fourGrams(tokens: string[]): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i <= tokens.length - 4; i++) {
    grams.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]} ${tokens[i + 3]}`);
  }
  return grams;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const token of small) {
    if (large.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function sharedCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const token of small) {
    if (large.has(token)) count += 1;
  }
  return count;
}
