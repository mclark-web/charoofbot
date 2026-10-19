/**
 * Outlet accounts in the real corpus, including local desks such as KING5Seattle.
 * Handles are the X handles, matched case-sensitively.
 * A near or template paraphrase among two or more of these accounts is one cluster
 * with an originator. Those paraphrases are not scored as clones of each other.
 * An exact copy between two of these accounts stays a copy.
 */
export const WIRE_OUTLETS: readonly { handle: string; name: string }[] = [
  { handle: "Reuters", name: "Reuters" },
  { handle: "business", name: "Bloomberg" },
  { handle: "CNBC", name: "CNBC" },
  { handle: "CNBCPro", name: "CNBC Pro" },
  { handle: "qz", name: "Quartz" },
  { handle: "AlArabiya_Eng", name: "Al Arabiya English" },
  { handle: "ARYNEWSOFFICIAL", name: "ARY News" },
  { handle: "KING5Seattle", name: "KING 5 Seattle" },
];

const WIRE_HANDLES = new Set(WIRE_OUTLETS.map((outlet) => outlet.handle));

export function isWireOutlet(handle: string): boolean {
  return WIRE_HANDLES.has(handle);
}

/**
 * Outlets a credit may name. Aliases are matched after lowercasing and
 * stripping a leading "the". Goldman is not on this list.
 */
export const RECOGNIZED_OUTLETS: readonly string[] = [
  "reuters",
  "bloomberg",
  "cnbc",
  "cnbc markets",
  "cnbc top news",
  "cnbc pro",
  "wsj",
  "wall street journal",
  "ap",
  "associated press",
  "ft",
  "financial times",
  "coindesk",
  "conference board",
];

const RECOGNIZED = new Set(RECOGNIZED_OUTLETS);

/** Handles that publish the recognized outlet, when this corpus has one. */
const OUTLET_ACCOUNTS: Readonly<Record<string, readonly string[]>> = {
  reuters: ["Reuters"],
  bloomberg: ["business"],
  cnbc: ["CNBC"],
  "cnbc markets": ["CNBC"],
  "cnbc top news": ["CNBC"],
  "cnbc pro": ["CNBCPro"],
  wsj: ["WSJ"],
  "wall street journal": ["WSJ"],
  ap: ["AP"],
  "associated press": ["AP"],
  ft: ["FT"],
  "financial times": ["FT"],
  coindesk: ["CoinDesk"],
  "conference board": ["ConferenceBoard"],
};

export function outletKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[.'’]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRecognizedOutlet(name: string): boolean {
  return RECOGNIZED.has(outletKey(name));
}

/** X handles for a recognized outlet name. Empty when the name is not on the list. */
export function outletAccounts(name: string): readonly string[] {
  return OUTLET_ACCOUNTS[outletKey(name)] ?? [];
}

/** Recognized news outlets: the X handle, and the credit names that map to it. */
export type RecognizedNewsOutlet = {
  handle: string;
  names: readonly string[];
};

export const RECOGNIZED_NEWS_OUTLETS: readonly RecognizedNewsOutlet[] = (() => {
  const namesByHandle = new Map<string, string[]>();
  for (const [name, handles] of Object.entries(OUTLET_ACCOUNTS)) {
    for (const handle of handles) {
      const list = namesByHandle.get(handle);
      if (list) list.push(name);
      else namesByHandle.set(handle, [name]);
    }
  }
  return [...namesByHandle.entries()].map(([handle, names]) => ({ handle, names }));
})();
