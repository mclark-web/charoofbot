/**
 * Syndicating outlets. Handles are the X handles, matched case-sensitively.
 * This is not the credit list. A near or template paraphrase among two or more
 * of these accounts is one cluster with an originator. Those paraphrases are
 * not scored as clones of each other. An exact copy between two of them stays a copy.
 */
export const SYNDICATING_OUTLETS: readonly { handle: string; name: string }[] = [
  { handle: "Reuters", name: "Reuters" },
  { handle: "business", name: "Bloomberg" },
  { handle: "CNBC", name: "CNBC" },
  { handle: "CNBCPro", name: "CNBC Pro" },
  { handle: "qz", name: "Quartz" },
  { handle: "AlArabiya_Eng", name: "Al Arabiya English" },
  { handle: "ARYNEWSOFFICIAL", name: "ARY News" },
  { handle: "KING5Seattle", name: "KING 5 Seattle" },
  { handle: "CBSNews", name: "CBS News" },
  { handle: "CBSPhiladelphia", name: "CBS News Philadelphia" },
];

const SYNDICATING_HANDLES = new Set(SYNDICATING_OUTLETS.map((outlet) => outlet.handle));

export function isSyndicatingOutlet(handle: string): boolean {
  return SYNDICATING_HANDLES.has(handle);
}

/**
 * CBS published this lede ("a CBS News Investigation"). Other accounts pasted
 * the same wording earlier. The desk that published it is an originator.
 */
export function isCbsInvestigationLede(account: string, text: string): boolean {
  if (account !== "CBSNews" && account !== "CBSPhiladelphia") return false;
  return /cbs news investigation/i.test(text);
}

/**
 * Recognized news outlets: names a credit may use, and the handle that publishes
 * that outlet in this corpus. Aliases are matched after lowercasing and stripping
 * a leading "the". Goldman is not on this list. This is not the syndicating-outlet list.
 */
export const RECOGNIZED_NEWS_OUTLETS: readonly {
  label: string;
  handle: string;
  names: readonly string[];
}[] = [
  { label: "Reuters", handle: "Reuters", names: ["reuters"] },
  { label: "Bloomberg", handle: "business", names: ["bloomberg"] },
  { label: "CNBC", handle: "CNBC", names: ["cnbc", "cnbc markets", "cnbc top news"] },
  { label: "CNBC Pro", handle: "CNBCPro", names: ["cnbc pro"] },
  { label: "WSJ", handle: "WSJ", names: ["wsj", "wall street journal"] },
  { label: "AP", handle: "AP", names: ["ap", "associated press"] },
  { label: "FT", handle: "FT", names: ["ft", "financial times"] },
  { label: "CoinDesk", handle: "CoinDesk", names: ["coindesk"] },
  { label: "Conference Board", handle: "ConferenceBoard", names: ["conference board"] },
];

/** Credit-name strings for the recognized news outlets, including aliases. */
export const RECOGNIZED_NEWS_OUTLET_NAMES: readonly string[] = RECOGNIZED_NEWS_OUTLETS.flatMap(
  (outlet) => outlet.names,
);

const RECOGNIZED = new Set(RECOGNIZED_NEWS_OUTLET_NAMES);

/** Handles that publish a recognized news outlet, when this corpus has one. */
const OUTLET_ACCOUNTS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  RECOGNIZED_NEWS_OUTLETS.flatMap((outlet) => outlet.names.map((name) => [name, [outlet.handle]])),
);

export function outletKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[.'’]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRecognizedNewsOutlet(name: string): boolean {
  return RECOGNIZED.has(outletKey(name));
}

/** X handles for a recognized outlet name. Empty when the name is not on the list. */
export function outletAccounts(name: string): readonly string[] {
  return OUTLET_ACCOUNTS[outletKey(name)] ?? [];
}
